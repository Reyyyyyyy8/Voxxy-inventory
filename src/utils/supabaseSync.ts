import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_PUB_KEY = '';
export const DEFAULT_SUPABASE_SEC_KEY = '';

export const SUPABASE_SCHEMA_SQL = `-- SKRIP SQL INISIALISASI DATABASE VOXXY DI SUPABASE
-- Salin seluruh teks ini dan tempel di Supabase Dashboard -> SQL Editor -> Klik "Run"

-- 1. TABEL INVENTARIS ASET
CREATE TABLE IF NOT EXISTS assets (
  kode_aset TEXT PRIMARY KEY,
  kategori TEXT NOT NULL,
  merk TEXT NOT NULL,
  tipe_model TEXT NOT NULL,
  nomor_seri TEXT,
  spesifikasi TEXT,
  tgl_beli TEXT,
  harga BIGINT DEFAULT 0,
  vendor TEXT,
  kondisi TEXT,
  status TEXT DEFAULT 'Tersedia',
  lokasi TEXT,
  user_saat_ini TEXT,
  departemen_user TEXT,
  catatan TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 2. TABEL SERAH TERIMA & BAST (HANDOVER)
CREATE TABLE IF NOT EXISTS handovers (
  id_handover TEXT PRIMARY KEY,
  no_surat TEXT,
  kode_aset TEXT REFERENCES assets(kode_aset) ON DELETE SET NULL,
  jenis_transaksi TEXT,
  tgl_handover TEXT,
  nama_penerima TEXT,
  email_penerima TEXT,
  nik_karyawan TEXT,
  departemen TEXT,
  jabatan TEXT,
  nama_petugas TEXT,
  email_petugas TEXT,
  kondisi_fisik TEXT,
  kelengkapan JSONB DEFAULT '[]'::jsonb,
  catatan_kelengkapan TEXT,
  ttd_penerima TEXT,
  ttd_petugas TEXT,
  pdf_drive_link TEXT,
  created_at TEXT
);

-- 3. TABEL LOG AKTIVITAS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  user_admin TEXT,
  aksi TEXT,
  kode_aset TEXT,
  deskripsi TEXT
);

-- 4. KEAMANAN RLS (Row Level Security)
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Buat Policy agar aplikasi backend/frontend dapat membaca dan menulis data
DROP POLICY IF EXISTS "Public Full Access Assets" ON assets;
CREATE POLICY "Public Full Access Assets" ON assets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Handovers" ON handovers;
CREATE POLICY "Public Full Access Handovers" ON handovers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Logs" ON logs;
CREATE POLICY "Public Full Access Logs" ON logs FOR ALL USING (true) WITH CHECK (true);
`;

export function getSupabaseClient(config?: { supabaseUrl?: string; supabaseSecretKey?: string; supabasePublishableKey?: string }): SupabaseClient | null {
  const url = (process.env.SUPABASE_URL || config?.supabaseUrl || '').trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY || 
    config?.supabaseSecretKey || 
    DEFAULT_SUPABASE_SEC_KEY || 
    process.env.SUPABASE_PUBLISHABLE_KEY || 
    config?.supabasePublishableKey || 
    DEFAULT_SUPABASE_PUB_KEY
  ).trim();

  if (!url || !url.startsWith('http')) {
    return null;
  }

  try {
    return createClient(url, key, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.warn('Gagal inisialisasi Supabase client:', err);
    return null;
  }
}

/**
 * Cek status koneksi dan keberadaan tabel di Supabase
 */
export async function checkSupabaseHealth(supabase: SupabaseClient): Promise<{
  connected: boolean;
  tables: { assets: boolean; handovers: boolean; logs: boolean };
  message: string;
}> {
  try {
    const [assetsCheck, handoversCheck, logsCheck] = await Promise.all([
      supabase.from('assets').select('kode_aset').limit(1),
      supabase.from('handovers').select('id_handover').limit(1),
      supabase.from('logs').select('id').limit(1)
    ]);

    const tables = {
      assets: !assetsCheck.error,
      handovers: !handoversCheck.error,
      logs: !logsCheck.error
    };

    const allOk = tables.assets && tables.handovers && tables.logs;
    let message = 'Terhubung ke Supabase Cloud!';

    if (!allOk) {
      const missing: string[] = [];
      if (!tables.assets) missing.push('assets');
      if (!tables.handovers) missing.push('handovers');
      if (!tables.logs) missing.push('logs');
      message = `Terhubung, namun tabel (${missing.join(', ')}) belum dibuat di Supabase. Jalankan skrip SQL di Supabase SQL Editor.`;
    }

    return { connected: true, tables, message };
  } catch (err: any) {
    return {
      connected: false,
      tables: { assets: false, handovers: false, logs: false },
      message: 'Gagal terhubung ke Supabase: ' + (err.message || 'Periksa URL dan kunci API')
    };
  }
}

/**
 * Ambil seluruh data dari Supabase
 */
export async function fetchSupabaseData(supabase: SupabaseClient): Promise<{
  success: boolean;
  assets?: any[];
  handovers?: any[];
  logs?: any[];
  error?: string;
}> {
  try {
    const [assetsRes, handoversRes, logsRes] = await Promise.all([
      supabase.from('assets').select('*').order('kode_aset', { ascending: true }),
      supabase.from('handovers').select('*').order('tgl_handover', { ascending: false }),
      supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(200)
    ]);

    if (assetsRes.error) throw assetsRes.error;
    if (handoversRes.error) throw handoversRes.error;
    if (logsRes.error) throw logsRes.error;

    return {
      success: true,
      assets: assetsRes.data || [],
      handovers: handoversRes.data || [],
      logs: logsRes.data || []
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error fetching Supabase' };
  }
}

/**
 * Simpan / perbarui aset di Supabase
 */
export async function pushAssetToSupabase(supabase: SupabaseClient, asset: any) {
  try {
    const formatted = {
      kode_aset: asset.kode_aset,
      kategori: asset.kategori,
      merk: asset.merk,
      tipe_model: asset.tipe_model,
      nomor_seri: asset.nomor_seri || '',
      spesifikasi: asset.spesifikasi || '',
      tgl_beli: asset.tgl_beli || '',
      harga: Number(asset.harga) || 0,
      vendor: asset.vendor || '',
      kondisi: asset.kondisi || 'Baik (Normal)',
      status: asset.status || 'Tersedia',
      lokasi: asset.lokasi || '',
      user_saat_ini: asset.user_saat_ini || '',
      departemen_user: asset.departemen_user || '',
      catatan: asset.catatan || '',
      created_at: asset.created_at || new Date().toISOString(),
      updated_at: asset.updated_at || new Date().toISOString()
    };
    const { error } = await supabase.from('assets').upsert(formatted, { onConflict: 'kode_aset' });
    if (error) console.warn('Supabase upsert asset warning:', error.message);
    return !error;
  } catch (err) {
    console.warn('Supabase pushAsset error:', err);
    return false;
  }
}

/**
 * Hapus aset dari Supabase
 */
export async function deleteAssetFromSupabase(supabase: SupabaseClient, code: string) {
  try {
    const { error } = await supabase.from('assets').delete().eq('kode_aset', code.toUpperCase());
    if (error) console.warn('Supabase delete asset warning:', error.message);
    return !error;
  } catch (err) {
    console.warn('Supabase deleteAsset error:', err);
    return false;
  }
}

/**
 * Simpan serah terima (handover) di Supabase
 */
export async function pushHandoverToSupabase(supabase: SupabaseClient, handover: any) {
  try {
    const formatted = {
      id_handover: handover.id_handover,
      no_surat: handover.no_surat || '',
      kode_aset: handover.kode_aset || '',
      jenis_transaksi: handover.jenis_transaksi || 'Serah Terima Baru',
      tgl_handover: handover.tgl_handover || '',
      nama_penerima: handover.nama_penerima || '',
      email_penerima: handover.email_penerima || '',
      nik_karyawan: handover.nik_karyawan || '',
      departemen: handover.departemen || '',
      jabatan: handover.jabatan || '',
      nama_petugas: handover.nama_petugas || '',
      email_petugas: handover.email_petugas || '',
      kondisi_fisik: handover.kondisi_fisik || '',
      kelengkapan: Array.isArray(handover.kelengkapan) ? handover.kelengkapan : [],
      catatan_kelengkapan: handover.catatan_kelengkapan || '',
      ttd_penerima: handover.ttd_penerima || '',
      ttd_petugas: handover.ttd_petugas || '',
      pdf_drive_link: handover.pdf_drive_link || '',
      created_at: handover.created_at || new Date().toISOString()
    };
    const { error } = await supabase.from('handovers').upsert(formatted, { onConflict: 'id_handover' });
    if (error) console.warn('Supabase upsert handover warning:', error.message);
    return !error;
  } catch (err) {
    console.warn('Supabase pushHandover error:', err);
    return false;
  }
}

/**
 * Simpan log di Supabase
 */
export async function pushLogToSupabase(supabase: SupabaseClient, log: any) {
  try {
    const formatted = {
      id: log.id,
      timestamp: log.timestamp || new Date().toISOString(),
      user_admin: log.user_admin || 'admin',
      aksi: log.aksi || 'UPDATE_DATA',
      kode_aset: log.kode_aset || '',
      deskripsi: log.deskripsi || ''
    };
    const { error } = await supabase.from('logs').upsert(formatted, { onConflict: 'id' });
    if (error) console.warn('Supabase upsert log warning:', error.message);
    return !error;
  } catch (err) {
    console.warn('Supabase pushLog error:', err);
    return false;
  }
}

/**
 * Sinkronkan seluruh data (batch push) ke Supabase
 */
export async function syncAllToSupabase(supabase: SupabaseClient, data: { assets?: any[]; handovers?: any[]; logs?: any[] }) {
  const results = { assetsPushed: 0, handoversPushed: 0, logsPushed: 0, errors: [] as string[] };
  
  if (Array.isArray(data.assets) && data.assets.length > 0) {
    try {
      const formattedAssets = data.assets.map(a => ({
        kode_aset: a.kode_aset,
        kategori: a.kategori,
        merk: a.merk,
        tipe_model: a.tipe_model,
        nomor_seri: a.nomor_seri || '',
        spesifikasi: a.spesifikasi || '',
        tgl_beli: a.tgl_beli || '',
        harga: Number(a.harga) || 0,
        vendor: a.vendor || '',
        kondisi: a.kondisi || 'Baik (Normal)',
        status: a.status || 'Tersedia',
        lokasi: a.lokasi || '',
        user_saat_ini: a.user_saat_ini || '',
        departemen_user: a.departemen_user || '',
        catatan: a.catatan || '',
        created_at: a.created_at || new Date().toISOString(),
        updated_at: a.updated_at || new Date().toISOString()
      }));
      const { error } = await supabase.from('assets').upsert(formattedAssets, { onConflict: 'kode_aset' });
      if (error) results.errors.push('Assets: ' + error.message);
      else results.assetsPushed = formattedAssets.length;
    } catch (e: any) {
      results.errors.push('Assets: ' + e.message);
    }
  }

  if (Array.isArray(data.handovers) && data.handovers.length > 0) {
    try {
      const formattedH = data.handovers.map(h => ({
        id_handover: h.id_handover,
        no_surat: h.no_surat || '',
        kode_aset: h.kode_aset || '',
        jenis_transaksi: h.jenis_transaksi || 'Serah Terima Baru',
        tgl_handover: h.tgl_handover || '',
        nama_penerima: h.nama_penerima || '',
        email_penerima: h.email_penerima || '',
        nik_karyawan: h.nik_karyawan || '',
        departemen: h.departemen || '',
        jabatan: h.jabatan || '',
        nama_petugas: h.nama_petugas || '',
        email_petugas: h.email_petugas || '',
        kondisi_fisik: h.kondisi_fisik || '',
        kelengkapan: Array.isArray(h.kelengkapan) ? h.kelengkapan : [],
        catatan_kelengkapan: h.catatan_kelengkapan || '',
        ttd_penerima: h.ttd_penerima || '',
        ttd_petugas: h.ttd_petugas || '',
        pdf_drive_link: h.pdf_drive_link || '',
        created_at: h.created_at || new Date().toISOString()
      }));
      const { error } = await supabase.from('handovers').upsert(formattedH, { onConflict: 'id_handover' });
      if (error) results.errors.push('Handovers: ' + error.message);
      else results.handoversPushed = formattedH.length;
    } catch (e: any) {
      results.errors.push('Handovers: ' + e.message);
    }
  }

  if (Array.isArray(data.logs) && data.logs.length > 0) {
    try {
      const formattedL = data.logs.map(l => ({
        id: l.id,
        timestamp: l.timestamp || new Date().toISOString(),
        user_admin: l.user_admin || 'admin',
        aksi: l.aksi || 'UPDATE_DATA',
        kode_aset: l.kode_aset || '',
        deskripsi: l.deskripsi || ''
      }));
      const { error } = await supabase.from('logs').upsert(formattedL, { onConflict: 'id' });
      if (error) results.errors.push('Logs: ' + error.message);
      else results.logsPushed = formattedL.length;
    } catch (e: any) {
      results.errors.push('Logs: ' + e.message);
    }
  }

  return results;
}
