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
  SUPABASE_SCHEMA_SQL,
  DEFAULT_SUPABASE_PUB_KEY,
  DEFAULT_SUPABASE_SEC_KEY
} from './src/utils/supabaseSync';

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
      adminPin: process.env.ADMIN_PIN || '',
      adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean),
      googleSheetsUrl: '',
      logoUrl: '',
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUB_KEY,
      supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || DEFAULT_SUPABASE_SEC_KEY
    },
    assets: [],
    handovers: [],
    logs: []
  };
}

// Helper untuk membaca database JSON dengan proteksi ganda (primary + backup)
function readDb() {
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

// ================= API ENDPOINTS =================

// 0. BI-DIRECTIONAL SMART SYNC (Mencegah data hilang saat refresh & multi-device)
app.post('/api/sync', (req, res) => {
  const { assets = [], handovers = [], logs = [], config } = req.body;
  const db = readDb();

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
    db.config = { ...db.config, ...config };
  }

  writeDb(db);

  // Sync batch ke Supabase jika terhubung
  const supabase = getSupabaseClient(db.config);
  if (supabase) {
    syncAllToSupabase(supabase, db).catch(err => console.warn('Supabase syncAll warning:', err));
  }

  res.json({ success: true, message: 'Sinkronisasi berhasil', data: db });
});

// 1. GET ALL DATA (Sinkron dengan Supabase jika URL sudah disetel)
app.get('/api/data', async (_req, res) => {
  const db = readDb();

  // Jika Supabase terkonfigurasi, coba sinkronkan data dari Supabase
  const supabase = getSupabaseClient(db.config);
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

  res.json({ success: true, timestamp: Date.now(), data: db });
});

// 2. GET ASSETS
app.get('/api/assets', (_req, res) => {
  const db = readDb();
  res.json({ success: true, assets: db.assets || [] });
});

// 3. GET ASSET BY CODE
app.get('/api/assets/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const db = readDb();
  const asset = (db.assets || []).find((a: any) => a.kode_aset.toUpperCase() === code);
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
  }
  res.json({ success: true, asset });
});

// Helper validasi PIN
function verifyPin(pin: any, dbConfig: any): boolean {
  const configuredPin = dbConfig?.adminPin ? String(dbConfig.adminPin).trim() : '';
  if (!pin || !configuredPin) return false;
  const inputPin = String(pin).trim();
  return inputPin === configuredPin;
}

// 4. POST CREATE / REGISTER ASSET
app.post('/api/assets', (req, res) => {
  const { asset, pin, operatorEmail } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

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
      user_admin: operatorEmail || 'admin',
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
      user_admin: operatorEmail || 'admin',
      aksi: 'REGISTRASI_BARU',
      kode_aset: asset.kode_aset,
      deskripsi: `Registrasi baru laptop ${asset.merk} ${asset.tipe_model} (SN: ${asset.nomor_seri})`
    });
  }

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient(db.config);
  if (supabase && savedAsset) {
    pushAssetToSupabase(supabase, savedAsset).catch(err => console.warn('Supabase asset push error:', err));
    if (db.logs[0]) pushLogToSupabase(supabase, db.logs[0]).catch(() => {});
  }

  res.json({ success: true, message: 'Data berhasil disimpan', asset: savedAsset });
});

// 5. POST HANDOVER
app.post('/api/handovers', (req, res) => {
  const { handover, pin, operatorEmail } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

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
    user_admin: operatorEmail || 'admin',
    aksi: 'HANDOVER',
    kode_aset: handover.kode_aset,
    deskripsi: `Serah terima ke ${handover.nama_penerima} (${handover.departemen}). Surat: ${handover.no_surat}`
  });

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient(db.config);
  if (supabase) {
    pushHandoverToSupabase(supabase, handover).catch(err => console.warn('Supabase handover push error:', err));
    if (targetAsset) pushAssetToSupabase(supabase, targetAsset).catch(() => {});
    if (db.logs[0]) pushLogToSupabase(supabase, db.logs[0]).catch(() => {});
  }

  res.json({ success: true, message: 'Serah terima berhasil dicatat', handover });
});

// 6. POST RETURN ASSET
app.post('/api/assets/:code/return', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { pin, operatorEmail } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

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
    user_admin: operatorEmail || 'admin',
    aksi: 'RETURN',
    kode_aset: targetAsset.kode_aset,
    deskripsi: `Pengembalian laptop dari ${previousHolder}. Status kembali Tersedia di gudang.`
  });

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient(db.config);
  if (supabase) {
    pushAssetToSupabase(supabase, targetAsset).catch(() => {});
    if (db.logs[0]) pushLogToSupabase(supabase, db.logs[0]).catch(() => {});
  }

  res.json({ success: true, message: 'Unit berhasil dikembalikan ke status Tersedia', asset: targetAsset });
});

// 7. DELETE ASSET
app.delete('/api/assets/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { pin, operatorEmail } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

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
    user_admin: operatorEmail || 'admin',
    aksi: 'HAPUS_ASET',
    kode_aset: code,
    deskripsi: `Penghapusan unit ${deletedAsset.merk} ${deletedAsset.tipe_model} (SN: ${deletedAsset.nomor_seri}) dari database.`
  });

  writeDb(db);

  // Sync real-time ke Supabase jika terhubung
  const supabase = getSupabaseClient(db.config);
  if (supabase) {
    deleteAssetFromSupabase(supabase, code).catch(() => {});
    if (db.logs[0]) pushLogToSupabase(supabase, db.logs[0]).catch(() => {});
  }

  res.json({ success: true, message: `Unit ${code} berhasil dihapus dari database` });
});

// ================= SUPABASE CLOUD MANAGEMENT ENDPOINTS =================

// Cek status koneksi Supabase & Skrip SQL
app.get('/api/supabase/status', async (_req, res) => {
  const db = readDb();
  const client = getSupabaseClient(db.config);
  
  if (!client) {
    return res.json({
      configured: false,
      connected: false,
      url: db.config?.supabaseUrl || process.env.SUPABASE_URL || '',
      publishableKey: db.config?.supabasePublishableKey || process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUB_KEY,
      secretKey: db.config?.supabaseSecretKey || process.env.SUPABASE_SECRET_KEY || DEFAULT_SUPABASE_SEC_KEY,
      message: 'Supabase Project URL belum disetel. Masukkan URL proyek Supabase Anda (contoh: https://xyz.supabase.co).',
      schemaSql: SUPABASE_SCHEMA_SQL
    });
  }

  const health = await checkSupabaseHealth(client);
  res.json({
    configured: true,
    connected: health.connected,
    tables: health.tables,
    url: db.config?.supabaseUrl || process.env.SUPABASE_URL || '',
    publishableKey: db.config?.supabasePublishableKey || process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUB_KEY,
    secretKey: db.config?.supabaseSecretKey || process.env.SUPABASE_SECRET_KEY || DEFAULT_SUPABASE_SEC_KEY,
    message: health.message,
    schemaSql: SUPABASE_SCHEMA_SQL
  });
});

// Test koneksi & simpan konfigurasi Supabase
app.post('/api/supabase/config', async (req, res) => {
  const { supabaseUrl, supabasePublishableKey, supabaseSecretKey, pin } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

  db.config = {
    ...db.config,
    supabaseUrl: (supabaseUrl || '').trim(),
    supabasePublishableKey: (supabasePublishableKey || DEFAULT_SUPABASE_PUB_KEY).trim(),
    supabaseSecretKey: (supabaseSecretKey || DEFAULT_SUPABASE_SEC_KEY).trim()
  };
  writeDb(db);

  const client = getSupabaseClient(db.config);
  if (!client) {
    return res.json({
      success: true,
      connected: false,
      message: 'Konfigurasi disimpan, namun URL Supabase belum diisi atau formatnya tidak valid.',
      config: db.config
    });
  }

  const health = await checkSupabaseHealth(client);
  res.json({
    success: true,
    connected: health.connected,
    tables: health.tables,
    message: health.message,
    config: db.config
  });
});

// Push semua data lokal saat ini ke Supabase
app.post('/api/supabase/push-all', async (req, res) => {
  const { pin } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

  const client = getSupabaseClient(db.config);
  if (!client) {
    return res.status(400).json({ success: false, message: 'Supabase Project URL belum diisi!' });
  }

  const results = await syncAllToSupabase(client, db);
  res.json({
    success: results.errors.length === 0,
    message: results.errors.length === 0 
      ? `Berhasil mengunggah ${results.assetsPushed} aset dan ${results.handoversPushed} BAST ke Supabase!`
      : `Unggah selesai dengan catatan: ${results.errors.join(', ')}`,
    results
  });
});

// Tarik semua data dari Supabase ke database lokal
app.post('/api/supabase/pull-all', async (req, res) => {
  const { pin } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

  const client = getSupabaseClient(db.config);
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
    data: db
  });
});

// 8. CONFIG & GOOGLE SHEETS SYNC URL
app.post('/api/config', (req, res) => {
  const { config, pin } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

  db.config = { ...db.config, ...config };
  writeDb(db);
  res.json({ success: true, message: 'Pengaturan berhasil diperbarui', config: db.config });
});

// 9. RESET DEMO DATA (Memuat ulang 8 barang kantor standar)
app.post('/api/reset-demo', (req, res) => {
  const { pin } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

  const seeded = getSeedData();
  writeDb(seeded);
  res.json({ success: true, message: 'Data demo kantor berhasil dimuat ulang!', data: seeded });
});

// 9b. KOSONGKAN SELURUH DATABASE INVENTARIS
app.post('/api/clear-all', (req, res) => {
  const { pin } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

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
  writeDb(emptyData);
  res.json({ success: true, message: 'Seluruh data inventaris berhasil dikosongkan!', data: emptyData });
});

// 10. RESTORE BACKUP DATA
app.post('/api/restore-backup', (req, res) => {
  const { data, pin } = req.body;
  const db = readDb();

  if (!verifyPin(pin, db.config)) {
    return res.status(403).json({ success: false, message: 'PIN Admin salah!' });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: 'Format data backup tidak valid!' });
  }

  const restored = {
    config: data.config ? { ...db.config, ...data.config } : db.config,
    assets: Array.isArray(data.assets) ? data.assets : db.assets,
    handovers: Array.isArray(data.handovers) ? data.handovers : db.handovers,
    logs: Array.isArray(data.logs) ? data.logs : db.logs,
    initialized: true
  };

  writeDb(restored);
  res.json({ success: true, message: 'Data berhasil di-restore!', data: restored });
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

startServer();
