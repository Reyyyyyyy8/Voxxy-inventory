import React, { useState, useRef } from 'react';
import { getQrCodeImageUrl } from '../utils/qrGenerator';
import { INITIAL_CATEGORIES } from '../mockData';
import { Printer, Layers, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { downloadQrBatchPdf, downloadElementAsImage, downloadQrBadgeAsImage } from '../utils/pdfExport';

interface QrBatchGeneratorProps {
  logoUrl?: string;
}

export const QrBatchGenerator: React.FC<QrBatchGeneratorProps> = ({ logoUrl }) => {
  const [startSeq, setStartSeq] = useState(1);
  const [count, setCount] = useState(12);
  const [category, setCategory] = useState('LPT');
  const [qrMode, setQrMode] = useState<'code' | 'url'>('code'); // Default 'code' produces large modules resistant to tape
  const [baseUrl, setBaseUrl] = useState('https://script.google.com/macros/s/AKfycb.../exec');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImg, setIsDownloadingImg] = useState(false);
  const [downloadingStickerCode, setDownloadingStickerCode] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);

  const stickers = Array.from({ length: count }, (_, i) => {
    const seqNum = (startSeq + i).toString().padStart(3, '0');
    const assetCode = `${seqNum}-VMI-${category}`;
    // Jika qrMode 'code', payload adalah kode aset pendek -> menghasilkan blok QR besar yang tembus solasi/lakban
    const payload = qrMode === 'code' ? assetCode : `${baseUrl}?code=${assetCode}`;
    return {
      assetCode,
      scanUrl: payload,
      qrUrl: getQrCodeImageUrl(payload, 180, 'H') // Level H error correction (30% tolerance)
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      await downloadQrBatchPdf(stickers, category);
    } catch (err) {
      console.error('Gagal unduh PDF lembar stiker:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!sheetRef.current || isDownloadingImg) return;
    try {
      setIsDownloadingImg(true);
      const batchName = `LEMBAR_STIKER_QR_${category}`;
      await downloadElementAsImage(sheetRef.current, `${batchName}.png`);
    } catch (err) {
      console.error('Gagal unduh gambar lembar stiker:', err);
    } finally {
      setIsDownloadingImg(false);
    }
  };

  const handleDownloadSingleSticker = async (assetCode: string, qrUrl: string) => {
    try {
      setDownloadingStickerCode(assetCode);
      await downloadQrBadgeAsImage(assetCode, qrUrl);
    } catch (err) {
      console.error('Gagal unduh stiker tunggal:', err);
    } finally {
      setDownloadingStickerCode(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Control Panel (Hidden during print) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-orange-500/30 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Generator Stiker Label QR</h2>
              <p className="text-xs text-slate-400">
                Pencetakan & unduh stiker identitas fisik batch untuk unit operasional kantor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Unduh Lembar PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center gap-2 transition disabled:opacity-75 cursor-pointer"
              title="Download lembar stiker lengkap dalam format PDF A4"
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

            {/* Unduh Lembar Gambar */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloadingImg}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
              title="Unduh seluruh lembar stiker sebagai format gambar PNG"
            >
              {isDownloadingImg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4 text-orange-400" />
              )}
              Unduh PNG
            </button>

            {/* Cetak Browser */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
              title="Cetak langsung ke mesin printer"
            >
              <Printer className="h-4 w-4" /> Cetak (A4)
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Mulai Nomor Urut</label>
            <input
              type="number"
              min="1"
              value={startSeq}
              onChange={e => setStartSeq(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Jumlah Label</label>
            <select
              value={count}
              onChange={e => setCount(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
            >
              <option value="6">6 Label</option>
              <option value="12">12 Label (Standar A4)</option>
              <option value="18">18 Label</option>
              <option value="24">24 Label</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Kategori Aset</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
            >
              {INITIAL_CATEGORIES.map(cat => (
                <option key={cat.kode} value={cat.kode}>
                  {cat.kode} ({cat.nama})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Entitas</label>
            <input
              type="text"
              disabled
              value="VMI (Voxxy Media)"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-slate-500 font-mono"
            />
          </div>
        </div>

        {/* Pilihan Mode Format QR untuk Ketahanan Solasi / Lakban */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold">Format Muatan QR:</span>
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setQrMode('code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  qrMode === 'code'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🛡️ Kode Aset Langsung (Tahan Solasi / Lakban)
              </button>
              <button
                type="button"
                onClick={() => setQrMode('url')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  qrMode === 'url'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌐 Tautan URL Scanner Web
              </button>
            </div>
          </div>

          <div className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-3 py-1 rounded-xl flex items-center gap-1.5">
            <span className="font-bold">Error Correction: Level H (30%)</span>
            <span className="text-slate-300">• Tahan goresan & pantulan solasi bening</span>
          </div>
        </div>

        {qrMode === 'code' && (
          <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            💡 <strong>Rekomendasi Terbaik:</strong> Mode <em>Kode Aset Langsung</em> menghasilkan kotak-kotak QR lebih besar & tebal dengan koreksi kesalahan Level H (30%). Stiker tetap mudah discan kamera inventaris walau tertutup solasi/lakban bening atau tergores.
          </p>
        )}
      </div>

      {/* Printable Sheet View */}
      <div 
        ref={sheetRef}
        className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0"
      >
        <div className="border-b border-slate-200 pb-3 mb-6 flex justify-between items-center text-slate-900 print:mb-3">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-7 max-w-[120px] object-contain" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-orange-500 to-blue-600 flex items-center justify-center text-white font-black text-xs">
                VMI
              </div>
            )}
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">
                VOXXY MEDIA INDONESIA — ASSET LABELS
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Batch: {stickers[0]?.assetCode} s/d {stickers[stickers.length - 1]?.assetCode}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono font-semibold">
            Format Kertas Label A4
          </span>
        </div>

        {/* Sticker Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
          {stickers.map((stk, idx) => (
            <div
              key={idx}
              className="relative group border-2 border-dashed border-slate-300 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center bg-slate-50/50 print:border-solid print:border-slate-400 print:p-2"
            >
              {/* Header Label */}
              <div className="w-full flex items-center justify-between text-[8px] font-black text-slate-700 uppercase tracking-tight border-b border-slate-200 pb-1 mb-1">
                <span className="text-orange-600">VOXXY MEDIA</span>
                <span className="text-slate-500">IT INVENTORY</span>
              </div>

              {/* QR Image */}
              <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs my-1">
                <img
                  src={stk.qrUrl}
                  alt={stk.assetCode}
                  className="h-24 w-24 object-contain print:h-20 print:w-20"
                />
              </div>

              {/* Asset Code */}
              <div className="text-xs font-mono font-black text-slate-950 tracking-wider">
                {stk.assetCode}
              </div>
              <div className="text-[8px] text-slate-500 font-bold tracking-tight">
                SCAN WITH MOBILE CAMERA
              </div>

              {/* Quick download single sticker (hidden during print) */}
              <button
                type="button"
                onClick={() => handleDownloadSingleSticker(stk.assetCode, stk.qrUrl)}
                disabled={downloadingStickerCode === stk.assetCode}
                className="mt-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg px-2 py-0.5 flex items-center gap-1 transition print:hidden cursor-pointer"
                title="Download file stiker ini saja (PNG)"
              >
                {downloadingStickerCode === stk.assetCode ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                Unduh PNG
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
