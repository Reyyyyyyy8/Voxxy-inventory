import React, { useState } from 'react';
import { getQrCodeImageUrl } from '../utils/qrGenerator';
import { Smartphone, Laptop, Check, Copy, X, RefreshCw, Radio, ExternalLink } from 'lucide-react';

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastSyncTime: Date | null;
  onForceSync: () => void;
  isSyncing: boolean;
}

export const MobileConnectModal: React.FC<MobileConnectModalProps> = ({
  isOpen,
  onClose,
  lastSyncTime,
  onForceSync,
  isSyncing
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrUrl = getQrCodeImageUrl(currentUrl, 280);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-orange-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Hubungkan HP & Laptop</h3>
            <p className="text-xs text-slate-400">Scan untuk buka URL yang sama & sinkronisasi realtime</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center my-4 shadow-inner">
          <img
            src={qrUrl}
            alt="QR Code URL Web"
            className="w-48 h-48 object-contain"
          />
          <p className="text-[11px] font-bold text-slate-700 mt-2 text-center">
            Arahkan kamera HP ke QR Code di atas
          </p>
        </div>

        {/* Sync Status Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <Radio className="h-3 w-3" /> Auto-Sync Aktif
              </div>
              <div className="text-[10px] text-slate-400">
                Otomatis update tiap 2 detik di semua perangkat
              </div>
            </div>
          </div>
          <button
            onClick={onForceSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[11px] font-bold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 block">
            Link Aktif (Pastikan HP & Laptop membuka link yang sama):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
        </div>

        {/* Notice Guide */}
        <div className="mt-4 p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-[11px] text-blue-200 leading-relaxed">
          💡 <strong>Tips Penting:</strong> Jika mengisi data di laptop, HP yang sedang membuka link ini akan otomatis memperbarui tampilan dalam hitungan detik tanpa perlu refresh manual.
        </div>
      </div>
    </div>
  );
};
