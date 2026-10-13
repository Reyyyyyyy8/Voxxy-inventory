/**
 * PUSAT PENGATURAN ISI DOKUMEN BERITA ACARA SERAH TERIMA (BAST)
 * =============================================================
 * Anda bisa mengubah teks kop surat, alamat, dan butir-butir
 * klausul tanggung jawab pemakaian aset di file ini!
 */

export interface BastContentTemplate {
  namaPerusahaan: string;
  tagline: string;
  alamatKantor: string;
  kontakKantor: string;
  judulSurat: string;
  kalimatPembuka: string;
  klausulTanggungJawab: string[];
}

export const DEFAULT_BAST_TEMPLATE: BastContentTemplate = {
  namaPerusahaan: 'VOXXY MEDIA INDONESIA',
  tagline: 'Digital Creative Agency',
  alamatKantor: 'Office 8, Level 18-A SCBD Jl. Jendral Sudirman Kav 52-53 Jakarta Selatan 12190 Indonesia',
  kontakKantor: 'Email: Voxxy@voxxymedia.com',
  judulSurat: 'BERITA ACARA SERAH TERIMA ASET OPERASIONAL (BAST)',
  kalimatPembuka: 'telah dilaksanakan serah terima fasilitas inventaris operasional kerja antara pihak GA dan pihak penerima fasilitas dengan rincian sebagai berikut:',
  klausulTanggungJawab: [
    'Aset ini dipinjamkan resmi oleh Voxxy Media Indonesia khusus untuk menunjang pekerjaan operasional kantor.',
    'Penerima berkewajiban merawat fisik perangkat, menjaga keamanan software, serta tidak memindahtangankan perangkat tanpa persetujuan tertulis GA.',
    'Apabila terjadi kerusakan fisik, kendala operasional, atau kehilangan, penerima wajib segera melapor ke pihak GA maksimal 1x24 jam.',
    'Jika karyawan mengundurkan diri (resign) atau masa penugasan berakhir, aset wajib dikembalikan ke tim GA dalam kondisi baik, lengkap dengan seluruh aksesorisnya.'
  ]
};
