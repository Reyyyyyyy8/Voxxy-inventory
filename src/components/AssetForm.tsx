import React, { useState } from 'react';
import { Asset, AssetCondition } from '../types';
import { ArrowLeft, Save, Boxes, AlertCircle, Trash2, Laptop, Monitor, Smartphone, Printer, Wifi, Armchair, Camera, Zap } from 'lucide-react';
import { INITIAL_CATEGORIES } from '../mockData';

interface AssetFormProps {
  initialCode?: string;
  existingAsset?: Asset | null;
  onBack: () => void;
  onSave: (asset: Asset) => void;
  onDelete?: (code: string) => void;
}

export const AssetForm: React.FC<AssetFormProps> = ({
  initialCode = '',
  existingAsset,
  onBack,
  onSave,
  onDelete
}) => {
  const isEditing = !!existingAsset;

  const [kodeAset, setKodeAset] = useState(existingAsset?.kode_aset || initialCode);
  const [kategori, setKategori] = useState(existingAsset?.kategori || 'LPT');
  const [merk, setMerk] = useState(existingAsset?.merk || 'Lenovo');
  const [tipeModel, setTipeModel] = useState(existingAsset?.tipe_model || '');
  const [nomorSeri, setNomorSeri] = useState(existingAsset?.nomor_seri || '');
  const [spesifikasi, setSpesifikasi] = useState(existingAsset?.spesifikasi || '');
  const [tglBeli, setTglBeli] = useState(existingAsset?.tgl_beli || new Date().toISOString().split('T')[0]);
  const [harga, setHarga] = useState(existingAsset?.harga ? existingAsset.harga.toString() : '5000000');
  const [vendor, setVendor] = useState(existingAsset?.vendor || 'PT Sentra Pratama Niaga');
  const [kondisi, setKondisi] = useState<AssetCondition>(existingAsset?.kondisi || 'Sangat Baik (Baru)');
  const [lokasi, setLokasi] = useState(existingAsset?.lokasi || 'Voxxy HQ - Ruang Server / IT Lt. 2');
  const [catatan, setCatatan] = useState(existingAsset?.catatan || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!kodeAset.trim()) {
      setErrorMsg('Kode aset wajib diisi!');
      return;
    }
    if (!tipeModel.trim()) {
      setErrorMsg('Tipe model / nama barang wajib diisi!');
      return;
    }
    if (!nomorSeri.trim()) {
      setErrorMsg('Nomor seri fisik (SN) atau barcode pabrik wajib diisi!');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const assetData: Asset = {
      kode_aset: kodeAset.trim().toUpperCase(),
      kategori,
      merk: merk.trim(),
      tipe_model: tipeModel.trim(),
      nomor_seri: nomorSeri.trim().toUpperCase(),
      spesifikasi: spesifikasi.trim(),
      tgl_beli: tglBeli,
      harga: parseInt(harga, 10) || 0,
      vendor: vendor.trim(),
      kondisi,
      status: existingAsset?.status || 'Tersedia',
      lokasi: lokasi.trim(),
      user_saat_ini: existingAsset?.user_saat_ini || '',
      departemen_user: existingAsset?.departemen_user || '',
      catatan: catatan.trim(),
      created_at: existingAsset?.created_at || `${dateStr} ${timeStr}`,
      updated_at: `${dateStr} ${timeStr}`
    };

    onSave(assetData);
  };

  const getCategoryIcon = (catCode: string) => {
    switch (catCode) {
      case 'MON': return <Monitor className="h-6 w-6" />;
      case 'HPN': return <Smartphone className="h-6 w-6" />;
      case 'PRN': return <Printer className="h-6 w-6" />;
      case 'NET': return <Wifi className="h-6 w-6" />;
      case 'FURN': return <Armchair className="h-6 w-6" />;
      case 'AV': return <Camera className="h-6 w-6" />;
      case 'ELK': return <Zap className="h-6 w-6" />;
      default: return <Laptop className="h-6 w-6" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Batal / Kembali
        </button>
        <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-3.5 py-1 rounded-full border border-orange-500/20">
          {isEditing ? 'Perbarui Data Aset Kantor' : 'Registrasi Inventaris Baru'}
        </span>
      </div>

      <div className="p-5 rounded-3xl bg-slate-900 border border-orange-500/30 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
          {getCategoryIcon(kategori)}
        </div>
        <div>
          <h3 className="text-base font-black text-white">
            {isEditing ? `Edit Aset: ${existingAsset.kode_aset}` : 'Form Registrasi Inventaris Kantor'}
          </h3>
          <p className="text-xs text-slate-400">
            {isEditing
              ? 'Perbarui spesifikasi, lokasi, atau catatan kondisi fisik perangkat.'
              : 'Daftarkan perlengkapan kantor (laptop, PC, monitor, kamera, furnitur, AC, dll).'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            1. Klasifikasi & Identitas Barang
          </div>

          <div className="grid md:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Kode Aset *</label>
              <input
                type="text"
                required
                value={kodeAset}
                onChange={e => setKodeAset(e.target.value)}
                placeholder="001-VMI-LPT"
                className="w-full bg-slate-950 border border-orange-500/40 rounded-xl p-2.5 text-orange-400 font-mono font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Kategori Inventaris *</label>
              <select
                value={kategori}
                onChange={e => {
                  setKategori(e.target.value);
                  // Update code category prefix if still default pattern
                  if (!isEditing && kodeAset.includes('-VMI-')) {
                    const parts = kodeAset.split('-VMI-');
                    setKodeAset(`${parts[0]}-VMI-${e.target.value}`);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              >
                {INITIAL_CATEGORIES.map(cat => (
                  <option key={cat.kode} value={cat.kode}>
                    {cat.kode} - {cat.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Merk / Brand / Vendor *</label>
              <input
                type="text"
                required
                value={merk}
                onChange={e => setMerk(e.target.value)}
                placeholder="Lenovo / Apple / Dell / Ergohuman / Daikin"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Tipe / Model / Nama Barang *</label>
              <input
                type="text"
                required
                value={tipeModel}
                onChange={e => setTipeModel(e.target.value)}
                placeholder="ThinkPad E14 Gen 4 / Meja Standing Desk / AC 2PK"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Nomor Seri Fisik (SN) / Barcode *</label>
              <input
                type="text"
                required
                value={nomorSeri}
                onChange={e => setNomorSeri(e.target.value)}
                placeholder="PF-3X92KM / SN-4029188 / TANPA-SN-01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="text-slate-300 font-semibold block mb-1">Spesifikasi Detail / Keterangan Fisik</label>
            <input
              type="text"
              value={spesifikasi}
              onChange={e => setSpesifikasi(e.target.value)}
              placeholder="Contoh: Core i7, RAM 16GB / Resolusi 4K IPS / Full Mesh Ergonomis / 17.100 BTU"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            2. Pengadaan & Lokasi
          </div>

          <div className="grid md:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Tanggal Pengadaan</label>
              <input
                type="date"
                value={tglBeli}
                onChange={e => setTglBeli(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Harga Beli (Rp)</label>
              <input
                type="number"
                value={harga}
                onChange={e => setHarga(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Vendor / Toko</label>
              <input
                type="text"
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Kondisi Fisik</label>
              <select
                value={kondisi}
                onChange={e => setKondisi(e.target.value as AssetCondition)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Sangat Baik (Baru)">Sangat Baik (Baru)</option>
                <option value="Baik (Normal)">Baik (Normal)</option>
                <option value="Ada Baret / Lecet">Ada Baret / Lecet Pemakaian</option>
                <option value="Kendala Minor">Kendala Minor (Perlu Servis Ringan)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Lokasi Penyimpanan</label>
              <input
                type="text"
                value={lokasi}
                onChange={e => setLokasi(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="text-slate-300 font-semibold block mb-1">Catatan Khusus</label>
            <textarea
              rows={2}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Informasi garansi atau kondisi khusus..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {isEditing && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(existingAsset.kode_aset)}
              className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs border border-rose-800/60 flex items-center gap-1.5 transition"
            >
              <Trash2 className="h-4 w-4 text-rose-400" /> Hapus Unit Ini
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white shadow-lg shadow-orange-500/25 flex items-center gap-2 transition"
            >
              <Save className="h-4 w-4" /> {isEditing ? 'Perbarui Data' : 'Simpan Data Aset'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
