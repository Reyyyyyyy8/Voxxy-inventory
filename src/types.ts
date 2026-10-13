export type AssetStatus = 'Tersedia' | 'Dipakai' | 'Dalam Perbaikan' | 'Rusak / Afkir';
export type AssetCondition = 'Sangat Baik (Baru)' | 'Baik (Normal)' | 'Ada Baret / Lecet' | 'Kendala Minor';

export interface Asset {
  kode_aset: string; // e.g. "001-VMI-LPT"
  kategori: string; // "LPT", "MON", "HPN"
  merk: string; // "Lenovo", "Apple", "Dell", "ASUS"
  tipe_model: string; // "ThinkPad T14 Gen 3", "MacBook Pro M2"
  nomor_seri: string; // Serial Number fisik
  spesifikasi: string; // "Core i7 12th Gen, RAM 16GB, SSD 512GB"
  tgl_beli: string; // YYYY-MM-DD
  harga: number; // Rupiah
  vendor: string; // e.g. "PT Bhinneka Mentari"
  kondisi: AssetCondition;
  status: AssetStatus;
  lokasi: string; // "Head Office Jakarta - Lantai 3"
  user_saat_ini: string; // Nama karyawan pemegang (kosong jika Tersedia)
  departemen_user?: string;
  catatan: string;
  created_at: string;
  updated_at: string;
}

export interface HandoverRecord {
  id_handover: string; // e.g. "HO-2026-001"
  no_surat: string; // e.g. "001/BAST-IT/VMI/X/2026"
  kode_aset: string;
  jenis_transaksi: 'Serah Terima Baru' | 'Pengembalian (Return)' | 'Pergantian Unit';
  tgl_handover: string;
  
  // Data Penerima
  nama_penerima: string;
  email_penerima: string;
  nik_karyawan: string;
  departemen: string;
  jabatan: string;

  // Data Petugas IT/GA
  nama_petugas: string;
  email_petugas: string;
  
  // Detail Fisik & Kelengkapan
  kondisi_fisik: string;
  kelengkapan: string[]; // ["Charger Adapter", "Kabel Power", "Tas Laptop", "Mouse Wireless", "Converter/Dongle"]
  catatan_kelengkapan: string;

  // Tanda Tangan (Base64 Data URL)
  ttd_penerima: string;
  ttd_petugas: string;

  // Link File Drive
  pdf_drive_link?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user_admin: string;
  aksi: 'REGISTRASI_BARU' | 'UPDATE_DATA' | 'HANDOVER' | 'RETURN' | 'GENERATE_QR' | 'HAPUS_ASET' | 'HAPUS_SEMUA';
  kode_aset: string;
  deskripsi: string;
}

export interface SystemConfig {
  companyName: string;
  prefix: string;
  adminPin: string;
  adminEmails: string[];
  googleSheetsUrl?: string;
  logoUrl?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  supabaseSecretKey?: string;
}

export interface CategoryItem {
  kode: string;
  nama: string;
  icon: string;
  deskripsi: string;
}
