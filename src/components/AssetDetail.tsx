import React, { useState } from 'react';
import { Asset, HandoverRecord } from '../types';
import { formatRupiah, getQrCodeImageUrl } from '../utils/qrGenerator';
import { downloadQrBadgeAsImage } from '../utils/pdfExport';
import { 
  Laptop, 
  Monitor,
  Smartphone,
  Printer,
  Wifi,
  Armchair,
  Camera,
  Zap,
  Boxes,
  User, 
  Calendar, 
  MapPin, 
  FileText, 
  ArrowRightLeft, 
  Edit, 
  QrCode, 
  CheckCircle2, 
  Printer as PrintIcon,
  ShieldCheck,
  Undo2,
  Trash2,
  Download,
  Loader2
} from 'lucide-react';

interface AssetDetailProps {
  asset: Asset;
  handovers: HandoverRecord[];
  isAdmin?: boolean;
  onRequestAdminLogin?: () => void;
  onStartHandover: () => void;
  onReturnAsset: () => void;
  onEditAsset: () => void;
  onDeleteAsset?: (code: string) => void;
  onViewBast: (record: HandoverRecord) => void;
}

export const AssetDetail: React.FC<AssetDetailProps> = ({
  asset,
  handovers,
  isAdmin = false,
  onRequestAdminLogin,
  onStartHandover,
  onReturnAsset,
  onEditAsset,
  onDeleteAsset,
  onViewBast
}) => {
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const assetHandovers = handovers.filter(h => h.kode_aset === asset.kode_aset);

  const qrImageUrl = getQrCodeImageUrl(`https://voxxymedia.id/asset?code=${asset.kode_aset}`, 200);

  const handleDownloadSticker = async () => {
    try {
      setIsDownloadingQr(true);
      await downloadQrBadgeAsImage(asset.kode_aset, qrImageUrl);
    } catch (err) {
      console.error('Gagal download stiker QR:', err);
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const getCategoryIcon = (kategori: string) => {
    switch (kategori) {
      case 'MON': return <Monitor className="h-7 w-7" />;
      case 'HPN': return <Smartphone className="h-7 w-7" />;
      case 'PRN': return <Printer className="h-7 w-7" />;
      case 'NET': return <Wifi className="h-7 w-7" />;
      case 'FURN': return <Armchair className="h-7 w-7" />;
      case 'AV': return <Camera className="h-7 w-7" />;
      case 'ELK': return <Zap className="h-7 w-7" />;
      default: return <Laptop className="h-7 w-7" />;
    }
  };

  const getStatusBadge = () => {
    switch (asset.status) {
      case 'Tersedia':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Tersedia (Ready to Deploy)
          </span>
        );
      case 'Dipakai':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            Sedang Dipakai Karyawan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {asset.status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner Card dengan gradasi Orange & Blue */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950/30 to-slate-900 border border-orange-500/30 shadow-xl shadow-orange-950/20 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 border border-orange-400/50 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              {getCategoryIcon(asset.kategori)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/25">
                  {asset.kode_aset}
                </span>
                <span className="text-xs text-slate-400">Serial No: <code className="text-slate-200 font-mono">{asset.nomor_seri}</code></span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1">
                {asset.merk} {asset.tipe_model}
              </h2>
            </div>
          </div>

          <div>{getStatusBadge()}</div>
        </div>

        {/* Current User Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Pemegang Unit:</span>
              <span className="font-bold text-slate-100">
                {asset.user_saat_ini ? asset.user_saat_ini : 'Belum Ditugaskan (Tersedia)'}
              </span>
              {asset.departemen_user && (
                <span className="text-slate-400 ml-1.5 font-normal">({asset.departemen_user})</span>
              )}
            </div>
          </div>

          {/* Action Buttons (CRUD) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onEditAsset}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition flex items-center gap-1.5 text-xs border border-slate-700 hover:border-orange-500/50"
              title="Edit Spesifikasi & Data Aset"
            >
              <Edit className="h-3.5 w-3.5 text-orange-400" /> 
              <span>Edit Data</span>
            </button>
            {onDeleteAsset && (
              <button
                onClick={() => onDeleteAsset(asset.kode_aset)}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold transition flex items-center gap-1.5 text-xs border border-rose-800/60 hover:border-rose-600"
                title="Hapus Unit dari Database"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" /> 
                <span>Hapus Unit</span>
              </button>
            )}
            {asset.status === 'Tersedia' ? (
              <button
                onClick={onStartHandover}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-md shadow-orange-500/30 transition flex items-center gap-1.5 text-xs"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" /> Serah Terima (Handover)
              </button>
            ) : (
              <button
                onClick={onReturnAsset}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 text-xs"
              >
                <Undo2 className="h-3.5 w-3.5" /> Pengembalian Unit (Return)
              </button>
            )}
          </div>
        </div>

        {/* Status Mode Banner */}
        {!isAdmin ? (
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <ShieldCheck className="h-4 w-4 text-orange-400 shrink-0" />
              <span>Aksi Edit, Hapus & Serah Terima diproteksi PIN admin yang dikonfigurasi.</span>
            </div>
            {onRequestAdminLogin && (
              <button
                onClick={onRequestAdminLogin}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-bold underline shrink-0"
              >
                Buka Kunci PIN
              </button>
            )}
          </div>
        ) : null}

        {/* Public Notice Banner if not logged in */}
        {!isAdmin && (
          <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200/90 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Pemberitahuan Kepemilikan:</strong> Unit laptop ini merupakan inventaris resmi PT Voxxy Media Indonesia. 
              Jika unit ini tercecer, tertinggal, atau ditemukan, mohon hubungi tim IT/GA di <span className="text-orange-300 font-semibold">it-support@voxxymedia.com</span> atau <span className="text-orange-300 font-semibold">(021) 7892-1100</span>.
            </div>
          </div>
        )}
      </div>

      {/* Grid: Spesifikasi & QR Stiker Preview */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Specs Table */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            Spesifikasi & Detail Perangkat
          </h3>

          <div className="grid grid-cols-2 gap-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Hardware Specs</span>
              <span className="font-semibold text-slate-200">{asset.spesifikasi || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Kondisi Fisik</span>
              <span className="font-semibold text-slate-200">{asset.kondisi}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Tanggal Pengadaan</span>
              <span className="font-semibold text-slate-200">{asset.tgl_beli}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Harga Pengadaan</span>
              <span className="font-bold text-orange-400 font-mono">{formatRupiah(asset.harga)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Vendor Pengadaan</span>
              <span className="font-semibold text-slate-200">{asset.vendor || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Lokasi Inventaris</span>
              <span className="font-semibold text-slate-200">{asset.lokasi}</span>
            </div>
          </div>

          {asset.catatan && (
            <div className="pt-3 border-t border-slate-800/60 text-xs">
              <span className="text-slate-400 block text-[11px]">Catatan Khusus:</span>
              <p className="text-slate-300 mt-1">{asset.catatan}</p>
            </div>
          )}
        </div>

        {/* Stiker Preview Box */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Stiker Fisik QR
          </span>
          <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-300">
            <img
              src={qrImageUrl}
              alt={`QR Code ${asset.kode_aset}`}
              className="h-28 w-28 object-contain"
            />
            <div className="text-[11px] font-mono font-black text-slate-950 mt-1">
              {asset.kode_aset}
            </div>
            <div className="text-[8px] text-orange-600 font-black uppercase tracking-tight">
              VOXXY MEDIA INDONESIA
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadSticker}
            disabled={isDownloadingQr}
            className="w-full max-w-[200px] py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-60 cursor-pointer shadow-sm"
            title="Unduh stiker fisik resmi sebagai file PNG siap cetak"
          >
            {isDownloadingQr ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengunduh...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" /> Unduh Stiker (PNG)
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-400">
            Ditempel pada unit fisik perangkat.
          </p>
        </div>
      </div>

      {/* Riwayat Serah Terima (Handover History) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">Riwayat Berita Acara (BAST)</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">{assetHandovers.length} Dokumen Diterbitkan</span>
        </div>

        {assetHandovers.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            Belum ada catatan serah terima untuk unit ini.
          </div>
        ) : (
          <div className="space-y-3">
            {assetHandovers.map(ho => (
              <div
                key={ho.id_handover}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/40 transition flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{ho.nama_penerima}</span>
                    <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-medium">
                      {ho.departemen} - {ho.jabatan}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    No. BAST: <strong className="text-slate-200 font-mono">{ho.no_surat}</strong> • Tanggal: {ho.tgl_handover}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Kelengkapan: {ho.kelengkapan.join(', ')}
                  </div>
                </div>

                <button
                  onClick={() => onViewBast(ho)}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 transition flex items-center gap-1.5 font-bold"
                >
                  <FileText className="h-3.5 w-3.5" /> Buka Dokumen BAST
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
