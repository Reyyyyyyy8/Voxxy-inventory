import React, { useState } from 'react';
import { Asset } from '../types';
import { formatRupiah } from '../utils/qrGenerator';
import { INITIAL_CATEGORIES } from '../mockData';
import { 
  Laptop, 
  Search, 
  Plus, 
  Filter, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  X,
  Smartphone,
  Monitor,
  Printer,
  Wifi,
  Armchair,
  Camera,
  Zap,
  Boxes,
  Edit,
  Trash2
} from 'lucide-react';

interface FullInventoryViewProps {
  assets: Asset[];
  onSelectAsset: (code: string) => void;
  onAddNewManual: () => void;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (code: string) => void;
  onResetDemo?: () => void;
  onClearAll?: () => void;
}

export const FullInventoryView: React.FC<FullInventoryViewProps> = ({
  assets,
  onSelectAsset,
  onAddNewManual,
  onEditAsset,
  onDeleteAsset,
  onResetDemo,
  onClearAll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Dinamis: Semua kategori kantor
  const categories = [
    { id: 'ALL', label: 'Semua', count: assets.length },
    ...INITIAL_CATEGORIES.map(cat => ({
      id: cat.kode,
      label: cat.nama.split('&')[0].trim(),
      count: assets.filter(a => a.kategori === cat.kode).length
    }))
  ];

  const filteredAssets = assets.filter(asset => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      asset.kode_aset.toLowerCase().includes(q) ||
      asset.merk.toLowerCase().includes(q) ||
      asset.tipe_model.toLowerCase().includes(q) ||
      asset.nomor_seri.toLowerCase().includes(q) ||
      asset.user_saat_ini.toLowerCase().includes(q) ||
      (asset.spesifikasi && asset.spesifikasi.toLowerCase().includes(q)) ||
      (asset.lokasi && asset.lokasi.toLowerCase().includes(q));

    const matchCategory = selectedCategory === 'ALL' || asset.kategori === selectedCategory;
    const matchStatus = selectedStatus === 'ALL' || asset.status === selectedStatus;

    return matchSearch && matchCategory && matchStatus;
  });

  const getCategoryIcon = (kategori: string) => {
    switch (kategori) {
      case 'MON': return <Monitor className="h-4 w-4" />;
      case 'HPN': return <Smartphone className="h-4 w-4" />;
      case 'PRN': return <Printer className="h-4 w-4" />;
      case 'NET': return <Wifi className="h-4 w-4" />;
      case 'FURN': return <Armchair className="h-4 w-4" />;
      case 'AV': return <Camera className="h-4 w-4" />;
      case 'ELK': return <Zap className="h-4 w-4" />;
      default: return <Laptop className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Top Action Bar */}
      <div className="p-4 md:p-6 rounded-3xl bg-slate-900 border border-orange-500/30 space-y-3.5 shadow-xl shadow-orange-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-black text-white tracking-tight">
              Katalog Seluruh Inventaris Kantor
            </h2>
            <p className="text-xs text-slate-400">
              Total {assets.length} aset terdata di sistem Voxxy Media Indonesia
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onClearAll && assets.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                title="Kosongkan database untuk mulai input aset baru"
              >
                <Trash2 className="h-4 w-4 text-rose-400" />
                <span>Kosongkan Semua</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAddNewManual}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
            >
              <Plus className="h-4 w-4" /> + Tambah Unit Manual
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari kode aset, merk, model, serial number, atau nama karyawan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-10 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 shadow-inner"
          />
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-orange-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === cat.id ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}

          <div className="h-6 w-px bg-slate-800 mx-1 self-center hidden sm:block" />

          {/* Status filter toggle */}
          {['ALL', 'Tersedia', 'Dipakai'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <span>Menampilkan <strong>{filteredAssets.length}</strong> unit</span>
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedStatus('ALL'); }}
            className="text-orange-400 hover:text-orange-300 font-medium"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Card Grid / List (Mobile-First Card Layout) */}
      {filteredAssets.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Tidak ada unit yang ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery 
              ? `Tidak ditemukan inventaris dengan kata kunci "${searchQuery}".` 
              : 'Belum ada aset terdaftar di database kantor.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={onAddNewManual}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
            >
              <Plus className="h-4 w-4" /> Daftarkan Unit Baru
            </button>
            {onResetDemo && assets.length === 0 && (
              <button
                onClick={onResetDemo}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <Boxes className="h-4 w-4 text-orange-400" /> Muat Ulang Data Kantor (8 Kategori)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAssets.map(asset => (
            <div
              key={asset.kode_aset}
              onClick={() => onSelectAsset(asset.kode_aset)}
              className="p-4 md:p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 active:scale-[0.99] cursor-pointer transition-all shadow-lg hover:shadow-orange-950/20 space-y-3 group"
            >
              {/* Header Card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-blue-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition shrink-0">
                    {getCategoryIcon(asset.kategori)}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/25">
                      {asset.kode_aset}
                    </span>
                    <h3 className="text-sm font-black text-white mt-1 leading-snug group-hover:text-orange-300 transition">
                      {asset.merk} {asset.tipe_model}
                    </h3>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                  asset.status === 'Tersedia'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {asset.status}
                </span>
              </div>

              {/* Specs & SN */}
              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between">
                  <span>Serial No (SN):</span>
                  <code className="text-slate-200 font-mono font-semibold">{asset.nomor_seri}</code>
                </div>
                {asset.spesifikasi && (
                  <p className="line-clamp-1 text-slate-300">
                    {asset.spesifikasi}
                  </p>
                )}
              </div>

              {/* Pemegang & Action Bar (CRUD Buttons) */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <User className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="truncate max-w-[130px] text-slate-300 font-medium">
                    {asset.user_saat_ini ? asset.user_saat_ini : 'Gudang (Tersedia)'}
                  </span>
                </div>

                {/* Quick CRUD Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {onEditAsset && (
                    <button
                      type="button"
                      title="Edit Data Aset"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAsset(asset);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-orange-500/20 text-slate-300 hover:text-orange-400 border border-slate-700 transition flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Edit className="h-3 w-3 text-orange-400" />
                      <span>Edit</span>
                    </button>
                  )}

                  {onDeleteAsset && (
                    <button
                      type="button"
                      title="Hapus Unit dari Database"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAsset(asset.kode_aset);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 transition flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Trash2 className="h-3 w-3 text-rose-400" />
                      <span>Hapus</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 text-orange-400 font-bold text-xs group-hover:translate-x-1 transition ml-1 px-1.5 py-1">
                    <span className="hidden sm:inline">Detail</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
