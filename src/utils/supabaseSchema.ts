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

-- Pastikan policy akses publik lama dihapus. Backend memakai service_role key.
DROP POLICY IF EXISTS "Public Full Access Assets" ON assets;
DROP POLICY IF EXISTS "Public Full Access Handovers" ON handovers;
DROP POLICY IF EXISTS "Public Full Access Logs" ON logs;
`;
