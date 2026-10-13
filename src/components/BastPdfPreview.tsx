import React, { useRef, useState } from 'react';
import { HandoverRecord, Asset } from '../types';
import { Printer, ArrowLeft, CheckCircle2, ShieldCheck, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { DEFAULT_BAST_TEMPLATE } from '../utils/bastConfig';
import { downloadBastVectorPdf, downloadElementAsImage } from '../utils/pdfExport';

interface BastPdfPreviewProps {
  handover: HandoverRecord;
  asset?: Asset;
  logoUrl?: string;
  onBack: () => void;
}

export const BastPdfPreview: React.FC<BastPdfPreviewProps> = ({
  handover,
  asset,
  logoUrl,
  onBack
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  const cleanDocName = `BAST_${(handover.no_surat || 'DOC').replace(/[/\\?%*:|"<>]/g, '_')}_${handover.kode_aset}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      await downloadBastVectorPdf(handover, asset);
    } catch (err) {
      console.error('Gagal mengunduh PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!sheetRef.current || isDownloadingImage) return;
    try {
      setIsDownloadingImage(true);
      await downloadElementAsImage(sheetRef.current, `${cleanDocName}.png`);
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar (hidden in print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Detail Aset
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="hidden sm:flex text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-3.5 py-1.5 rounded-full items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Dokumen Sah
          </span>

          {/* Unduh Dokumen PDF (.pdf) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition disabled:opacity-75 cursor-pointer"
            title="Download langsung file dokumen PDF"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Unduh PDF (.pdf)
              </>
            )}
          </button>

          {/* Unduh Gambar (.png) */}
          <button
            onClick={handleDownloadImage}
            disabled={isDownloadingImage}
            className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 rounded-xl transition disabled:opacity-75 cursor-pointer"
            title="Unduh dokumen sebagai gambar PNG (untuk WhatsApp / kirim cepat)"
          >
            {isDownloadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 text-orange-400" />
            )}
            <span className="hidden md:inline">Unduh</span> PNG
          </button>

          {/* Cetak Browser / Printer */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
            title="Cetak langsung ke printer fisik atau dialog cetak browser"
          >
            <Printer className="h-4 w-4" /> Cetak
          </button>
        </div>
      </div>

      {/* Printable Sheet (Simulasi Kertas A4 Dokumen Resmi) */}
      <div 
        ref={sheetRef}
        className="max-w-3xl mx-auto bg-white text-slate-900 p-8 md:p-12 rounded-3xl shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-4 print:max-w-none"
      >
        {/* Kop Surat Voxxy Media Indonesia dengan Logo */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 max-w-[160px] object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-blue-600 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm">
                VMI
              </div>
            )}
            <h1 className="text-xl md:text-2xl font-black tracking-wider text-slate-900 uppercase">
              {DEFAULT_BAST_TEMPLATE.namaPerusahaan}
            </h1>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            {DEFAULT_BAST_TEMPLATE.tagline}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {DEFAULT_BAST_TEMPLATE.alamatKantor} | {DEFAULT_BAST_TEMPLATE.kontakKantor}
          </p>
        </div>

        {/* Judul Dokumen */}
        <div className="text-center mb-6">
          <h2 className="text-base md:text-lg font-black uppercase tracking-wide text-slate-900 underline underline-offset-4">
            {DEFAULT_BAST_TEMPLATE.judulSurat}
          </h2>
          <p className="text-xs text-slate-700 font-mono mt-1 font-bold">
            Nomor: {handover.no_surat}
          </p>
        </div>

        {/* Pembuka */}
        <p className="text-xs leading-relaxed text-slate-700 mb-4">
          Pada hari ini, tanggal <strong>{handover.tgl_handover}</strong>, bertempat di Kantor {DEFAULT_BAST_TEMPLATE.namaPerusahaan}, 
          {DEFAULT_BAST_TEMPLATE.kalimatPembuka}
        </p>

        {/* Bagian 1: Data Penerima */}
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 uppercase tracking-wide border-l-4 border-orange-500 mb-2">
            I. PIHAK PENERIMA (KARYAWAN)
          </h3>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 w-1/3 text-slate-600 font-medium">Nama Lengkap</td>
                <td className="py-1.5 w-4">:</td>
                <td className="py-1.5 font-bold text-slate-900">{handover.nama_penerima}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600 font-medium">NIK / ID Karyawan</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-slate-800">{handover.nik_karyawan || '-'}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600 font-medium">Departemen / Divisi</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-slate-800">{handover.departemen}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600 font-medium">Jabatan</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-slate-800">{handover.jabatan}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-600 font-medium">Email Resmi</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-slate-800">{handover.email_penerima}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bagian 2: Data Perangkat Laptop */}
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 uppercase tracking-wide border-l-4 border-orange-500 mb-2">
            II. RINCIAN SPESIFIKASI PERANGKAT ASET
          </h3>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 w-1/3 text-slate-600 font-medium">Kode Aset Kantor</td>
                <td className="py-1.5 w-4">:</td>
                <td className="py-1.5 font-mono font-bold text-orange-600">{handover.kode_aset}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600 font-medium">Perangkat / Merk & Tipe</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 font-semibold text-slate-900">
                  {asset ? `${asset.merk} ${asset.tipe_model}` : 'Laptop Kantor'}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600 font-medium">Nomor Seri Fisik (SN)</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 font-mono text-slate-800">{asset?.nomor_seri || '-'}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600 font-medium">Spesifikasi Hardware</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-slate-700">{asset?.spesifikasi || '-'}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 text-slate-600 font-medium">Kondisi Fisik Saat Serah</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-slate-800">{handover.kondisi_fisik}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-600 font-medium">Kelengkapan Aksesoris</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-slate-800">
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {handover.kelengkapan.map((item, i) => (
                      <span key={i} className="inline-block bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-300 font-medium">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Catatan Khusus */}
        {handover.catatan_kelengkapan && (
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Catatan Tambahan:</span> {handover.catatan_kelengkapan}
          </div>
        )}

        {/* Klausul Legalitas */}
        <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
          <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-600" /> KETENTUAN DAN TANGGUNG JAWAB PENGGUNAAN:
          </div>
          <ol className="list-decimal pl-4 space-y-1">
            {DEFAULT_BAST_TEMPLATE.klausulTanggungJawab.map((clause, idx) => (
              <li key={idx}>{clause}</li>
            ))}
          </ol>
        </div>

        {/* Kolom Tanda Tangan Digital */}
        <div className="grid grid-cols-2 gap-8 text-center pt-2">
          {/* Petugas IT/GA */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-700">Yang Menyerahkan (IT/GA):</p>
            <div className="h-24 flex items-center justify-center p-1">
              {handover.ttd_petugas && handover.ttd_petugas.startsWith('data:image') ? (
                <img src={handover.ttd_petugas} alt="TTD Petugas" className="max-h-20 max-w-full object-contain" />
              ) : (
                <div className="h-16 w-36 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                  (Tertanda Digital)
                </div>
              )}
            </div>
            <div className="border-t border-slate-700 w-4/5 mx-auto pt-1">
              <p className="text-xs font-bold text-slate-900">{handover.nama_petugas}</p>
              <p className="text-[10px] text-slate-500">Asset Management Officer</p>
            </div>
          </div>

          {/* Penerima */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-700">Yang Menerima (Karyawan):</p>
            <div className="h-24 flex items-center justify-center p-1">
              {handover.ttd_penerima && handover.ttd_penerima.startsWith('data:image') ? (
                <img src={handover.ttd_penerima} alt="TTD Penerima" className="max-h-20 max-w-full object-contain" />
              ) : (
                <div className="h-16 w-36 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                  (Tertanda Digital)
                </div>
              )}
            </div>
            <div className="border-t border-slate-700 w-4/5 mx-auto pt-1">
              <p className="text-xs font-bold text-slate-900">{handover.nama_penerima}</p>
              <p className="text-[10px] text-slate-500">{handover.jabatan} - {handover.departemen}</p>
            </div>
          </div>
        </div>

        {/* Footer Dokumen */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Dokumen ini diterbitkan secara elektronik oleh Sistem Inventaris Voxxy Media Indonesia. 
          Kode Aset: {handover.kode_aset} | Dicatat pada: {handover.created_at}
        </div>
      </div>
    </div>
  );
};
