import React, { useState } from 'react';
import { Asset } from '../types';
import { CameraScanner } from './CameraScanner';
import { 
  Scan, 
  Search, 
  Laptop, 
  PlusCircle, 
  CheckCircle, 
  Camera, 
  ArrowRight,
  Keyboard,
  Sparkles
} from 'lucide-react';

interface AssetScannerProps {
  assets: Asset[];
  onScanCode: (code: string) => void;
  onRegisterNew: (code: string) => void;
}

export const AssetScanner: React.FC<AssetScannerProps> = ({
  assets,
  onScanCode,
  onRegisterNew
}) => {
  const [inputCode, setInputCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(true);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onScanCode(inputCode.trim());
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Box Utama Scanner dengan gradasi oranye & aksen biru */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-orange-500/30 p-6 md:p-8 shadow-2xl shadow-orange-950/20 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500/15 to-blue-500/15 text-orange-400 border border-orange-500/30">
            <Scan className="h-3.5 w-3.5" /> Scanner Fisik Aset Kantor
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Pemindaian QR Code Inventaris Kantor
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Arahkan kamera ke stiker QR Code pada unit inventaris (laptop, monitor, kursi, PC, kamera, AC, dll) untuk memuat profil aset atau memulai serah terima.
          </p>
        </div>

        {/* Tab Pemilih Mode */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setIsCameraActive(true)}
            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
              isCameraActive 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" /> Kamera Langsung
          </button>
          <button
            type="button"
            onClick={() => setIsCameraActive(false)}
            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
              !isCameraActive 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="h-4 w-4" /> Input Kode Manual
          </button>
        </div>

        {/* 1. Kamera Scanner Aktif */}
        {isCameraActive ? (
          <CameraScanner
            onScanSuccess={(code) => onScanCode(code)}
            onSwitchToManual={() => setIsCameraActive(false)}
          />
        ) : (
          /* 2. Mode Input Manual */
          <div className="space-y-4 py-4">
            <form onSubmit={handleManualSearch} className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">Masukkan Kode Aset:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: 001-VMI-LPT"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition"
                >
                  <Search className="h-4 w-4" /> Cari
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Akses Cepat */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onScanCode('001-VMI-LPT')}
            className="px-3 py-1.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/40 text-xs font-mono text-blue-300 border border-blue-500/30 transition flex items-center gap-1.5"
          >
            <CheckCircle className="h-3.5 w-3.5 text-blue-400" /> 001-VMI-LPT (Terdaftar)
          </button>
          <button
            type="button"
            onClick={() => onScanCode('004-VMI-LPT')}
            className="px-3 py-1.5 rounded-lg bg-orange-950/40 hover:bg-orange-900/40 text-xs font-mono text-orange-300 border border-orange-500/30 transition flex items-center gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5 text-orange-400" /> 004-VMI-LPT (Aset Baru)
          </button>
        </div>
      </div>

      {/* Daftar Aset Terdata */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider">
            Unit Terdata ({assets.length})
          </span>
          <span className="text-slate-500 text-[11px]">Pilih unit untuk melihat detail</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {assets.map(asset => (
            <div
              key={asset.kode_aset}
              onClick={() => onScanCode(asset.kode_aset)}
              className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2.5 rounded-xl cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600/20 to-orange-500/20 border border-blue-500/30 flex items-center justify-center text-orange-400">
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-orange-400">{asset.kode_aset}</span>
                    <span className="text-xs text-white font-semibold">{asset.merk} {asset.tipe_model}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    SN: {asset.nomor_seri} • Pemegang: {asset.user_saat_ini || 'Tersedia di Gudang'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  asset.status === 'Tersedia'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {asset.status}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
