import { pgTable, text, serial, integer, timestamp } from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Assets inventory table
export const assets = pgTable('assets', {
  kode_aset: text('kode_aset').primaryKey(),
  kategori: text('kategori').notNull().default(''),
  merk: text('merk').notNull().default(''),
  tipe_model: text('tipe_model').notNull().default(''),
  nomor_seri: text('nomor_seri').notNull().default(''),
  spesifikasi: text('spesifikasi').notNull().default(''),
  tgl_beli: text('tgl_beli').notNull().default(''),
  harga: integer('harga').notNull().default(0),
  vendor: text('vendor').notNull().default(''),
  kondisi: text('kondisi').notNull().default('Baik (Normal)'),
  status: text('status').notNull().default('Tersedia'),
  lokasi: text('lokasi').notNull().default(''),
  user_saat_ini: text('user_saat_ini').notNull().default(''),
  departemen_user: text('departemen_user').default(''),
  catatan: text('catatan').notNull().default(''),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

// Handover / BAST records table
export const handovers = pgTable('handovers', {
  id_handover: text('id_handover').primaryKey(),
  no_surat: text('no_surat').notNull().default(''),
  kode_aset: text('kode_aset').notNull(),
  jenis_transaksi: text('jenis_transaksi').notNull().default('Serah Terima Baru'),
  tgl_handover: text('tgl_handover').notNull().default(''),
  nama_penerima: text('nama_penerima').notNull().default(''),
  email_penerima: text('email_penerima').notNull().default(''),
  nik_karyawan: text('nik_karyawan').notNull().default(''),
  departemen: text('departemen').notNull().default(''),
  jabatan: text('jabatan').notNull().default(''),
  nama_petugas: text('nama_petugas').notNull().default(''),
  email_petugas: text('email_petugas').notNull().default(''),
  kondisi_fisik: text('kondisi_fisik').notNull().default(''),
  kelengkapan: text('kelengkapan').notNull().default('[]'),
  catatan_kelengkapan: text('catatan_kelengkapan').notNull().default(''),
  ttd_penerima: text('ttd_penerima').notNull().default(''),
  ttd_petugas: text('ttd_petugas').notNull().default(''),
  pdf_drive_link: text('pdf_drive_link').default(''),
  created_at: text('created_at').notNull(),
});

// Activity logs table
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  user_admin: text('user_admin').notNull().default(''),
  aksi: text('aksi').notNull(),
  kode_aset: text('kode_aset').notNull().default(''),
  deskripsi: text('deskripsi').notNull().default(''),
});

// App configuration table
export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  company_name: text('company_name').notNull().default('PT Visi Media Indonesia'),
  prefix: text('prefix').notNull().default('VMI'),
  admin_pin: text('admin_pin').notNull().default(''),
  admin_emails: text('admin_emails').notNull().default('[]'),
  google_sheets_url: text('google_sheets_url').default(''),
  logo_url: text('logo_url').default(''),
  updated_at: text('updated_at').notNull().default(''),
});
