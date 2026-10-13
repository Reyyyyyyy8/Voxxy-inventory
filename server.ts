import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getSupabaseClient, 
  checkSupabaseHealth, 
  fetchSupabaseData, 
  pushAssetToSupabase, 
  deleteAssetFromSupabase, 
  pushHandoverToSupabase, 
  pushLogToSupabase, 
  syncAllToSupabase, 
  clearSupabaseData
} from './src/utils/supabaseSync';
import { SUPABASE_SCHEMA_SQL } from './src/utils/supabaseSchema';
import { requireAuth, AuthRequest } from './src/middleware/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'inventory.json');
const BACKUP_FILE = path.join(__dirname, 'data', 'inventory.backup.json');

app.use(express.json({ limit: '10mb' }));

// No-cache middleware untuk semua API agar data selalu realtime di HP & Laptop
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

function getSeedData() {
  return {
    config: {
      companyName: 'Voxxy Media Indonesia',
      prefix: 'VMI',
      adminPin: '',
      adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean),
      googleSheetsUrl: '',
      logoUrl: '',
      supabaseUrl: process.env.SUPABASE_URL || ''
    },
    assets: [],
    handovers: [],
    logs: []
  };
}

// Helper untuk membaca database JSON dengan proteksi ganda (primary + backup)
function readDb() {
  if (process.env.VERCEL) {
    return getSeedData();
  }

  // 1. Coba baca dari DB_FILE utama
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (!Array.isArray(parsed.assets)) parsed.assets = [];
          if (!Array.isArray(parsed.handovers)) parsed.handovers = [];
          if (!Array.isArray(parsed.logs)) parsed.logs = [];
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error reading primary DB:', err);
  }

  // 2. Jika DB_FILE tidak ada atau corrupt, coba pulihkan dari BACKUP_FILE
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const rawBackup = fs.readFileSync(BACKUP_FILE, 'utf8');
      if (rawBackup && rawBackup.trim().length > 0) {
        const parsedBackup = JSON.parse(rawBackup);
        if (parsedBackup && typeof parsedBackup === 'object') {
          if (!Array.isArray(parsedBackup.assets)) parsedBackup.assets = [];
          if (!Array.isArray(parsedBackup.handovers)) parsedBackup.handovers = [];
          if (!Array.isArray(parsedBackup.logs)) parsedBackup.logs = [];
          writeDb(parsedBackup); // Pulihkan kembali ke primary DB
          return parsedBackup;
        }
      }
    }
  } catch (backupErr) {
    console.error('Error reading backup DB:', backupErr);
  }

  // 3. Hanya buat default seed data jika database benar-benar pertama kali diinstall
  const defaultData = getSeedData();
  writeDb(defaultData);
  return defaultData;
}

// Helper untuk menulis database JSON secara ATOMIK (anti-corrupt dan anti-loss)
function writeDb(data: any) {
  if (process.env.VERCEL) return true;

  try {
    const dir = path.dirname(DB_FILE);
    fs.mkdirSync(dir, { recursive: true });

    const serialized = JSON.stringify(data, null, 2);
    const tmpFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;

    // 1. Tulis ke file temporary terlebih dahulu
    fs.writeFileSync(tmpFile, serialized, 'utf8');
    // 2. Atomic rename (POSIX atomic swap) mencegah race condition & corrupt read
    fs.renameSync(tmpFile, DB_FILE);

    // 3. Selalu perbarui file backup cadangan otomatis
    try {
      fs.writeFileSync(BACKUP_FILE, serialized, 'utf8');
    } catch {}

    return true;
  } catch (err) {
    console.error('Error writing atomic DB:', err);
    return false;
  }
}

function getRequestDb(res: express.Response) {
  return res.locals.db || readDb();
}

function getClientDb(db: any) {
  const config = { ...getSeedData().config, ...db.config, adminPin: '', adminEmails: [] };
  delete config.supabaseSecretKey;
  delete config.supabasePublishableKey;
  return { ...db, config };
}

function getAdminEmail(res: express.Response) {
  return res.locals.authUser?.email || 'admin';
}

async function replaceSupabaseData(supabase: NonNullable<ReturnType<typeof getSupabaseClient>>, db: any) {
  const clearErrors = await clearSupabaseData(supabase);
  if (clearErrors.length > 0) return clearErrors;
  const results = await syncAllToSupabase(supabase, db);
  return results.errors;
}

// ================= API ENDPOINTS =================

app.use('/api', (req: AuthRequest, res, next) => {
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    res.locals.authUser = { email: 'local-admin@example.invalid' };
    next();
    return;
  }
  requireAuth(req, res, next);
}, (req: AuthRequest, res, next) => {
  if (req.user) res.locals.authUser = req.user;
  next();
});

app.use('/api', async (_req, res, next) => {
  if (!process.env.VERCEL) {
    res.locals.db = readDb();
    next();
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.status(503).json({ success: false, message: 'Supabase server environment variables are not configured.' });
    return;
  }

  try {
    const data = await fetchSupabaseData(supabase);
    if (!data.success) {
      res.status(503).json({ success: false, message: data.error || 'Unable to load application data.' });
      return;
    }

    res.locals.db = {
      ...getSeedData(),
      assets: data.assets || [],
      handovers: data.handovers || [],
      logs: data.logs || []
    };
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth', (req: AuthRequest, res) => {
  res.json({ success: true, email: req.user?.email || res.locals.authUser?.email });
});

// 0. BI-DIRECTIONAL SMART SYNC (Mencegah data hilang saat refresh & multi-device)
app.post('/api/sync', async (req, res) => {
  const { assets = [], handovers = [], logs = [], config } = req.body;
  const db = getRequestDb(res);

  // Merge Assets secara aman berdasarkan kode_aset unik
  const mergedAssetsMap = new Map<string, any>();
  // 1. Masukkan data server
  (db.assets || []).forEach((serverAsset: any) => {
    if (serverAsset && serverAsset.kode_aset) {
      mergedAssetsMap.set(serverAsset.kode_aset.toUpperCase(), serverAsset);
    }
  });

  // 2. Gabungkan data client (jika ada unit baru di client, tambahkan ke server!)
  if (Array.isArray(assets)) {
    assets.forEach((clientAsset: any) => {
      if (clientAsset && clientAsset.kode_aset) {
        const key = clientAsset.kode_aset.toUpperCase();
        const existing = mergedAssetsMap.get(key);
        if (!existing) {
          mergedAssetsMap.set(key, clientAsset);
        } else {
          // Pilih data yang updated_at-nya paling mutakhir
          const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
          const clientTime = new Date(clientAsset.updated_at || clientAsset.created_at || 0).getTime();
          if (clientTime >= existingTime) {
            mergedAssetsMap.set(key, { ...existing, ...clientAsset });
          }
        }
      }
    });
  }
  db.assets = Array.from(mergedAssetsMap.values());

  // Merge Handovers
  const mergedHandoversMap = new Map<string, any>();
  (db.handovers || []).forEach((h: any) => {
    const key = h?.id_handover || h?.no_surat;
    if (key) mergedHandoversMap.set(key, h);
  });
  if (Array.isArray(handovers)) {
    handovers.forEach((h: any) => {
      const key = h?.id_handover || h?.no_surat;
      if (key && !mergedHandoversMap.has(key)) {
        mergedHandoversMap.set(key, h);
      }
    });
  }
  db.handovers = Array.from(mergedHandoversMap.values());

  // Merge Logs
  const mergedLogsMap = new Map<string, any>();
  (db.logs || []).forEach((l: any) => {
    if (l?.id) mergedLogsMap.set(l.id, l);
  });
  if (Array.isArray(logs)) {
    logs.forEach((l: any) => {
      if (l?.id && !mergedLogsMap.has(l.id)) {
        mergedLogsMap.set(l.id, l);
      }
    });
  }
  db.logs = Array.from(mergedLogsMap.values());

  if (config && typeof config === 'object') {
    const safeConfig = { ...config };
    delete safeConfig.adminPin;
    delete safeConfig.adminEmails;
    delete safeConfig.supabaseUrl;
    delete safeConfig.supabaseSecretKey;
    delete safeConfig.supabasePublishableKey;
    db.config = { ...db.config, ...safeConfig };
  }

  writeDb(db);

  const supabase = getSupabaseClient();
  if (supabase) {
    const results = await syncAllToSupabase(supabase, db);
    if (results.errors.length > 0) {
      return res.status(502).json({ success: false, message: results.errors.join('; ') });
    }
  }

  res.json({ success: true, message: 'Sinkronisasi berhasil', data: getClientDb(db) });
});

// 1. GET ALL DATA (Sinkron dengan Supabase jika URL sudah disetel)
app.get('/api/data', async (_req, res) => {
  const db = getRequestDb(res);

  // Jika Supabase terkonfigurasi, coba sinkronkan data dari Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const supaData = await fetchSupabaseData(supabase);
      if (supaData.success && Array.isArray(supaData.assets) && supaData.assets.length > 0) {
        // Gabungkan aset dari Supabase
        const map = new Map<string, any>();
        (db.assets || []).forEach((a: any) => map.set(a.kode_aset.toUpperCase(), a));
        supaData.assets.forEach((a: any) => map.set(a.kode_aset.toUpperCase(), a));
        db.assets = Array.from(map.values());

        if (Array.isArray(supaData.handovers) && supaData.handovers.length > 0) {
          const hMap = new Map<string, any>();
          (db.handovers || []).forEach((h: any) => hMap.set(h.id_handover || h.no_surat, h));
          supaData.handovers.forEach((h: any) => hMap.set(h.id_handover || h.no_surat, h));
          db.handovers = Array.from(hMap.values());
        }

        if (Array.isArray(supaData.logs) && supaData.logs.length > 0) {
          const lMap = new Map<string, any>();
          (db.logs || []).forEach((l: any) => lMap.set(l.id, l));
          supaData.logs.forEach((l: any) => lMap.set(l.id, l));
          db.logs = Array.from(lMap.values());
        }
        writeDb(db);
      }
    } catch (e) {
      console.warn('Supabase fetch notice, using local file:', e);
    }
  }

  res.json({ success: true, timestamp: Date.now(), data: getClientDb(db) });
});

// 2. GET ASSETS
app.get('/api/assets', (_req, res) => {
  const db = getRequestDb(res);
  res.json({ success: true, assets: db.assets || [] });
});

// 3. GET ASSET BY CODE
app.get('/api/assets/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const db = getRequestDb(res);
  const asset = (db.assets || []).find((a: any) => a.kode_aset.toUpperCase() === code);
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
  }
  res.json({ success: true, asset });
});

// 4. POST CREATE / REGISTER ASSET
app.post('/api/assets', async (req, res) => {
  const { asset } = req.body;
  const db = getRequestDb(res);
  const existingIndex = (db.assets || []).findIndex(
    (a: any) => a.kode_aset.toUpperCase() === asset.kode_aset.toUpperCase()
  );

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let savedAsset: any;

  if (existingIndex >= 0) {
    // Update
    savedAsset = { ...asset, updated_at: now };
    db.assets[existingIndex] = savedAsset;
    db.logs.unshift({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: now,
      user_admin: getAdminEmail(res),
      aksi: 'UPDATE_DATA',
      kode_aset: asset.kode_aset,
      deskripsi: `Update data aset ${asset.merk} ${asset.tipe_model}`
    });
  } else {
    // New
    savedAsset = { ...asset, created_at: now, updated_at: now };
    db.assets.unshift(savedAsset);
    db.logs.unshift({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: now,
      user_admin: getAdminEmail(res),
      aksi: 'REGISTRASI_BARU',
      kode_aset: asset.kode_aset,
      deskripsi: `Registrasi baru laptop ${asset.merk} ${asset.tipe_model} (SN: ${asset.nomor_seri})`
    });
  }

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient();
  if (supabase && savedAsset) {
    const assetSaved = await pushAssetToSupabase(supabase, savedAsset);
    const logSaved = !db.logs[0] || await pushLogToSupabase(supabase, db.logs[0]);
    if (!assetSaved || !logSaved) {
      return res.status(502).json({ success: false, message: 'Gagal menyimpan perubahan ke Supabase.' });
    }
  }

  res.json({ success: true, message: 'Data berhasil disimpan', asset: savedAsset });
});

// 5. POST HANDOVER
app.post('/api/handovers', async (req, res) => {
  const { handover } = req.body;
  const db = getRequestDb(res);
  // Update Asset status
  const targetAsset = (db.assets || []).find(
    (a: any) => a.kode_aset.toUpperCase() === handover.kode_aset.toUpperCase()
  );

  if (targetAsset) {
    targetAsset.status = 'Dipakai';
    targetAsset.user_saat_ini = handover.nama_penerima;
    targetAsset.departemen_user = handover.departemen;
    targetAsset.updated_at = handover.tgl_handover;
  }

  // Save handover record
  db.handovers.unshift(handover);

  // Log activity
  db.logs.unshift({
    id: `LOG-${Date.now().toString().slice(-4)}`,
    timestamp: handover.created_at,
    user_admin: getAdminEmail(res),
    aksi: 'HANDOVER',
    kode_aset: handover.kode_aset,
    deskripsi: `Serah terima ke ${handover.nama_penerima} (${handover.departemen}). Surat: ${handover.no_surat}`
  });

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient();
  if (supabase) {
    const handoverSaved = await pushHandoverToSupabase(supabase, handover);
    const assetSaved = !targetAsset || await pushAssetToSupabase(supabase, targetAsset);
    const logSaved = !db.logs[0] || await pushLogToSupabase(supabase, db.logs[0]);
    if (!handoverSaved || !assetSaved || !logSaved) {
      return res.status(502).json({ success: false, message: 'Gagal menyimpan serah terima ke Supabase.' });
    }
  }

  res.json({ success: true, message: 'Serah terima berhasil dicatat', handover });
});

// 6. POST RETURN ASSET
app.post('/api/assets/:code/return', async (req, res) => {
  const code = req.params.code.toUpperCase();

  const db = getRequestDb(res);
  const targetAsset = (db.assets || []).find((a: any) => a.kode_aset.toUpperCase() === code);
  if (!targetAsset) {
    return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
  }

  const previousHolder = targetAsset.user_saat_ini;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  targetAsset.status = 'Tersedia';
  targetAsset.user_saat_ini = '';
  targetAsset.departemen_user = '';
  targetAsset.updated_at = now;

  db.logs.unshift({
    id: `LOG-${Date.now().toString().slice(-4)}`,
    timestamp: now,
    user_admin: getAdminEmail(res),
    aksi: 'RETURN',
    kode_aset: targetAsset.kode_aset,
    deskripsi: `Pengembalian laptop dari ${previousHolder}. Status kembali Tersedia di gudang.`
  });

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient();
  if (supabase) {
    const assetSaved = await pushAssetToSupabase(supabase, targetAsset);
    const logSaved = !db.logs[0] || await pushLogToSupabase(supabase, db.logs[0]);
    if (!assetSaved || !logSaved) {
      return res.status(502).json({ success: false, message: 'Gagal menyimpan pengembalian ke Supabase.' });
    }
  }

  res.json({ success: true, message: 'Unit berhasil dikembalikan ke status Tersedia', asset: targetAsset });
});

// 7. DELETE ASSET
app.delete('/api/assets/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();

  const db = getRequestDb(res);
  const assetIndex = (db.assets || []).findIndex((a: any) => a.kode_aset.toUpperCase() === code);
  if (assetIndex === -1) {
    return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
  }

  const deletedAsset = db.assets[assetIndex];
  db.assets.splice(assetIndex, 1);

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.logs.unshift({
    id: `LOG-${Date.now().toString().slice(-4)}`,
    timestamp: now,
    user_admin: getAdminEmail(res),
    aksi: 'HAPUS_ASET',
    kode_aset: code,
    deskripsi: `Penghapusan unit ${deletedAsset.merk} ${deletedAsset.tipe_model} (SN: ${deletedAsset.nomor_seri}) dari database.`
  });

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient();
  if (supabase) {
    const assetDeleted = await deleteAssetFromSupabase(supabase, code);
    const logSaved = !db.logs[0] || await pushLogToSupabase(supabase, db.logs[0]);
    if (!assetDeleted || !logSaved) {
      return res.status(502).json({ success: false, message: 'Gagal menghapus aset dari Supabase.' });
    }
  }

  res.json({ success: true, message: `Unit ${code} berhasil dihapus dari database` });
});

// ================= SUPABASE CLOUD MANAGEMENT ENDPOINTS =================

// Cek status koneksi Supabase & Skrip SQL
app.get('/api/supabase/status', async (_req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.json({
      configured: false,
      connected: false,
      message: 'Atur SUPABASE_URL dan SUPABASE_SECRET_KEY di environment variables server.',
      schemaSql: SUPABASE_SCHEMA_SQL
    });
  }

  const health = await checkSupabaseHealth(client);
  res.json({
    configured: true,
    connected: health.connected,
    tables: health.tables,
    message: health.message,
    schemaSql: SUPABASE_SCHEMA_SQL
  });
});

// Push semua data lokal saat ini ke Supabase
app.post('/api/supabase/push-all', async (req, res) => {
  const db = getRequestDb(res);
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ success: false, message: 'Supabase Project URL belum diisi!' });
  }

  const results = await syncAllToSupabase(client, db);
  res.status(results.errors.length === 0 ? 200 : 502).json({
    success: results.errors.length === 0,
    message: results.errors.length === 0
      ? `Berhasil mengunggah ${results.assetsPushed} aset dan ${results.handoversPushed} BAST ke Supabase!`
      : `Unggah gagal: ${results.errors.join(', ')}`,
    results
  });
});

// Tarik semua data dari Supabase ke database lokal
app.post('/api/supabase/pull-all', async (req, res) => {
  const db = getRequestDb(res);
  const client = getSupabaseClient();
  if (!client) {
    return res.status(400).json({ success: false, message: 'Supabase belum terkonfigurasi!' });
  }

  const supaData = await fetchSupabaseData(client);
  if (!supaData.success) {
    return res.status(500).json({ success: false, message: supaData.error || 'Gagal mengambil data dari Supabase' });
  }

  if (Array.isArray(supaData.assets) && supaData.assets.length > 0) db.assets = supaData.assets;
  if (Array.isArray(supaData.handovers)) db.handovers = supaData.handovers;
  if (Array.isArray(supaData.logs)) db.logs = supaData.logs;

  writeDb(db);
  res.json({
    success: true,
    message: `Berhasil mengunduh ${db.assets.length} aset dari Supabase ke database lokal!`,
    data: getClientDb(db)
  });
});

// 8. CONFIG & GOOGLE SHEETS SYNC URL
app.post('/api/config', (req, res) => {
  const { config } = req.body;
  const db = getRequestDb(res);
  const safeConfig = { ...config };
  delete safeConfig.adminPin;
  delete safeConfig.adminEmails;
  delete safeConfig.supabaseUrl;
  delete safeConfig.supabaseSecretKey;
  delete safeConfig.supabasePublishableKey;
  db.config = { ...db.config, ...safeConfig };
  writeDb(db);
  res.json({ success: true, message: 'Pengaturan berhasil diperbarui', config: getClientDb(db).config });
});

// 9. RESET DEMO DATA (Memuat ulang 8 barang kantor standar)
app.post('/api/reset-demo', async (_req, res) => {
  const seeded = getSeedData();
  const client = getSupabaseClient();
  if (process.env.VERCEL && client) {
    const errors = await replaceSupabaseData(client, seeded);
    if (errors.length > 0) {
      return res.status(502).json({ success: false, message: `Gagal reset Supabase: ${errors.join('; ')}` });
    }
  }
  writeDb(seeded);
  res.json({ success: true, message: 'Data demo kantor berhasil dimuat ulang!', data: getClientDb(seeded) });
});

// 9b. KOSONGKAN SELURUH DATABASE INVENTARIS
app.post('/api/clear-all', async (_req, res) => {
  const db = getRequestDb(res);
  const emptyData = {
    config: db.config,
    assets: [],
    handovers: [],
    logs: [
      {
        id: `LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user_admin: 'admin',
        aksi: 'HAPUS_SEMUA',
        kode_aset: 'ALL',
        deskripsi: 'Database inventaris dikosongkan secara menyeluruh oleh admin.'
      }
    ],
    initialized: true
  };
  const client = getSupabaseClient();
  if (process.env.VERCEL && client) {
    const errors = await replaceSupabaseData(client, emptyData);
    if (errors.length > 0) {
      return res.status(502).json({ success: false, message: `Gagal mengosongkan Supabase: ${errors.join('; ')}` });
    }
  }
  writeDb(emptyData);
  res.json({ success: true, message: 'Seluruh data inventaris berhasil dikosongkan!', data: getClientDb(emptyData) });
});

// 10. RESTORE BACKUP DATA
app.post('/api/restore-backup', async (req, res) => {
  const db = getRequestDb(res);
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: 'Format data backup tidak valid!' });
  }

  const restored = {
    config: db.config,
    assets: Array.isArray(data.assets) ? data.assets : db.assets,
    handovers: Array.isArray(data.handovers) ? data.handovers : db.handovers,
    logs: Array.isArray(data.logs) ? data.logs : db.logs,
    initialized: true
  };

  const client = getSupabaseClient();
  if (process.env.VERCEL && client) {
    const errors = await replaceSupabaseData(client, restored);
    if (errors.length > 0) {
      return res.status(502).json({ success: false, message: `Gagal restore ke Supabase: ${errors.join('; ')}` });
    }
  }
  writeDb(restored);
  res.json({ success: true, message: 'Data berhasil di-restore!', data: getClientDb(restored) });
});

// Mount Vite in Dev mode or static files in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Inventory Backend Server running on http://localhost:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer().catch(error => {
    console.error('Failed to start inventory server:', error);
    process.exitCode = 1;
  });
}
