import React, { useState } from 'react';
import { Asset, HandoverRecord } from '../types';
import { SignatureCanvas } from './SignatureCanvas';
import { generateBastNumber } from '../utils/qrGenerator';
import { DEFAULT_BAST_TEMPLATE } from '../utils/bastConfig';
import { 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  CheckSquare, 
  Square, 
  FileCheck2, 
  User, 
  Laptop,
  Monitor,
  Smartphone,
  Printer,
  Wifi,
  Armchair,
  Camera,
  Zap,
  Boxes,
  AlertCircle,
  Eye,
  FileText,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface HandoverFormProps {
  asset: Asset;
  logoUrl?: string;
  onBack: () => void;
  onSubmit: (record: HandoverRecord) => void;
}

// Aksesoris adaptif sesuai kategori aset
const DEFAULT_ACCESSORIES_MAP: Record<string, string[]> = {
  LPT: [
    'Charger Adapter Original',
    'Kabel Power / USB-C Cord',
    'Tas Laptop / Backpack Kantor',
    'Mouse Wireless / Bluetooth',
    'Dongle HDMI / Multi-Port Adapter',
    'Headset / Earphone Meeting'
  ],
  MON: [
    'Kabel Power Display',
    'Kabel HDMI / DisplayPort High-Speed',
    'Kabel Type-C to Type-C 90W',
    'Stand / Kaki Monitor Original',
    'Adaptor Daya Eksternal'
  ],
  HPN: [
    'Kepala Charger Fast Charging',
    'Kabel Data USB-C / Lightning',
    'Casing Proteksi Kantor',
    'Ejector SIM Card Pin',
    'Box & Kartu Garansi'
  ],
  PRN: [
    'Kabel Power Printer',
    'Kabel USB Printer High Speed',
    'Buku Manual & CD Driver',
    'Tinta Botol Cadangan / Cartridge'
  ],
  NET: [
    'Kabel Power / PoE Adapter',
    'Kabel Patch Cord LAN Cat6',
    'Rackmount Kit / Bracket Dinding',
    'Kunci Rack Server'
  ],
  FURN: [
    'Kunci Lemari / Laci Meja',
    'Headrest Ergonomis',
    'Bantalan Lumbar Support',
    'Kunci L / Alat Rakit Cadangan'
  ],
  AV: [
    'Baterai Original + Cadangan',
    'Charger Baterai Dual Slot',
    'Lensa Kit / Filter UV',
    'Tali Strap Kamera',
    'Memory Card SDXC High-Speed',
    'Hardcase / Tas Kamera'
  ],
  ELK: [
    'Remote Control Original + Baterai',
    'Kabel Power AC / Steker Industri',
    'Kartu Garansi Resmi & Manual Book'
  ]
};

export const HandoverForm: React.FC<HandoverFormProps> = ({
  asset,
  logoUrl,
  onBack,
  onSubmit
}) => {
  // Wizard steps: 'form' (input data) | 'review_and_sign' (karyawan baca & ttd di HP)
  const [currentStep, setCurrentStep] = useState<'form' | 'review_and_sign'>('form');

  const [namaPenerima, setNamaPenerima] = useState('');
  const [emailPenerima, setEmailPenerima] = useState('');
  const [nikKaryawan, setNikKaryawan] = useState('');
  const [departemen, setDepartemen] = useState('Creative & Video Production');
  const [jabatan, setJabatan] = useState('');
  const [kondisiFisik, setKondisiFisik] = useState('Unit normal, fisik mulus, siap pakai untuk operasional pekerjaan');
  const availableAccessories = DEFAULT_ACCESSORIES_MAP[asset.kategori] || DEFAULT_ACCESSORIES_MAP.LPT;

  const [kelengkapan, setKelengkapan] = useState<string[]>(() => {
    return availableAccessories.slice(0, 3);
  });
  const [catatanKelengkapan, setCatatanKelengkapan] = useState('');
  
  const [ttdPenerima, setTtdPenerima] = useState('');
  const [ttdPetugas, setTtdPetugas] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [bastNumber] = useState(() => generateBastNumber(Math.floor(Math.random() * 80) + 10));

  const toggleAccessory = (item: string) => {
    if (kelengkapan.includes(item)) {
      setKelengkapan(kelengkapan.filter(i => i !== item));
    } else {
      setKelengkapan([...kelengkapan, item]);
    }
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

  const handleGoToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPenerima.trim()) {
      setErrorMsg('Nama penerima wajib diisi!');
      return;
    }
    if (!emailPenerima.trim()) {
      setErrorMsg('Email penerima wajib diisi!');
      return;
    }
    setErrorMsg('');
    setCurrentStep('review_and_sign');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = () => {
    if (!ttdPenerima) {
      setErrorMsg('Tanda tangan Penerima (karyawan) wajib digoreskan di layar HP!');
      return;
    }
    if (!ttdPetugas) {
      setErrorMsg('Tanda tangan Petugas IT/GA wajib digoreskan di layar HP!');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const record: HandoverRecord = {
      id_handover: `HO-${Date.now().toString().slice(-6)}`,
      no_surat: bastNumber,
      kode_aset: asset.kode_aset,
      jenis_transaksi: 'Serah Terima Baru',
      tgl_handover: dateStr,
      nama_penerima: namaPenerima.trim(),
      email_penerima: emailPenerima.trim(),
      nik_karyawan: nikKaryawan.trim(),
      departemen,
      jabatan: jabatan.trim() || 'Staf',
      nama_petugas: 'Admin',
      email_petugas: '',
      kondisi_fisik: kondisiFisik,
      kelengkapan,
      catatan_kelengkapan: catatanKelengkapan.trim(),
      ttd_penerima: ttdPenerima,
      ttd_petugas: ttdPetugas,
      created_at: `${dateStr} ${timeStr}`
    };

    onSubmit(record);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      {/* Header & Step Indicator */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (currentStep === 'review_and_sign') {
              setCurrentStep('form');
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" /> 
          {currentStep === 'review_and_sign' ? 'Kembali ke Form' : 'Batal'}
        </button>

        {/* Step Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setCurrentStep('form')}
            className={`px-3 py-1.5 rounded-xl transition ${
              currentStep === 'form'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Data Penerima
          </button>
          <button
            type="button"
            onClick={() => {
              if (namaPenerima && emailPenerima) setCurrentStep('review_and_sign');
            }}
            className={`px-3 py-1.5 rounded-xl transition ${
              currentStep === 'review_and_sign'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Baca BAST & TTD di HP
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= STEP 1: FORMULIR INPUT DATA ================= */}
      {currentStep === 'form' && (
        <form onSubmit={handleGoToReview} className="space-y-4 md:space-y-6">
          {/* Target Asset Summary Banner */}
          <div className="p-4 md:p-5 rounded-3xl bg-slate-900 border border-orange-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 shrink-0">
                {getCategoryIcon(asset.kategori)}
              </div>
              <div>
                <div className="text-xs font-mono text-orange-400 font-bold">{asset.kode_aset}</div>
                <div className="text-sm font-black text-white">{asset.merk} {asset.tipe_model}</div>
                <div className="text-[11px] text-slate-400">SN: {asset.nomor_seri}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {asset.status}
            </span>
          </div>

          {/* Identitas Penerima */}
          <div className="p-5 md:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <User className="h-4 w-4 text-orange-400" /> Identitas Penerima Fasilitas Kantor
            </div>

            <div className="grid md:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap Karyawan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dimas Aditya"
                  value={namaPenerima}
                  onChange={e => setNamaPenerima(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Email Resmi Karyawan *</label>
                <input
                  type="email"
                  required
                  placeholder="dimas@voxxymedia.com"
                  value={emailPenerima}
                  onChange={e => setEmailPenerima(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">NIK / ID Karyawan</label>
                <input
                  type="text"
                  placeholder="VMI-2026-088"
                  value={nikKaryawan}
                  onChange={e => setNikKaryawan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Departemen / Divisi</label>
                <select
                  value={departemen}
                  onChange={e => setDepartemen(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Creative & Video Production">Creative & Video Production</option>
                  <option value="Social Media & Marketing">Social Media & Marketing</option>
                  <option value="Editorial & Content Writing">Editorial & Content</option>
                  <option value="Finance & HR/GA">Finance & HR/GA</option>
                  <option value="Technology & IT">Technology & IT</option>
                  <option value="Operations & Management">Operations & Management</option>
                </select>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Jabatan</label>
                <input
                  type="text"
                  placeholder="Video Editor"
                  value={jabatan}
                  onChange={e => setJabatan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Kelengkapan Aksesoris */}
          <div className="p-5 md:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <CheckSquare className="h-4 w-4 text-orange-400" /> Checklist Kelengkapan Aksesoris
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {availableAccessories.map((item, idx) => {
                const checked = kelengkapan.includes(item);
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleAccessory(item)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition ${
                      checked
                        ? 'bg-gradient-to-r from-orange-950/40 to-amber-950/40 border-orange-500/50 text-orange-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="h-4 w-4 text-orange-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                    <span className="font-medium">{item}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold block">Kondisi Fisik Saat Serah Terima</label>
              <input
                type="text"
                value={kondisiFisik}
                onChange={e => setKondisiFisik(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold block">Catatan Tambahan (Opsional)</label>
              <textarea
                rows={2}
                placeholder="Catatan software, lisensi, atau kondisi khusus..."
                value={catatanKelengkapan}
                onChange={e => setCatatanKelengkapan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Next Button: Tampilkan Dokumen BAST */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs md:text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 transition"
            >
              <span>Lanjut ke Lembar BAST & TTD di Layar HP</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 2: DOKUMEN BAST RESMI UNTUK DIBACA & DITANDATANGANI DI HP ================= */}
      {currentStep === 'review_and_sign' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Instruksi Serah Terima di HP */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-blue-500/15 to-transparent border border-orange-500/30 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Mode Serah Terima Langsung di HP</h4>
              <p className="text-[11px] text-slate-300">
                Tunjukkan layar HP ini kepada karyawan penerima untuk <strong>dibaca</strong> dan <strong>ditandatangani langsung dengan jari</strong> pada kotak di bawah.
              </p>
            </div>
          </div>

          {/* Lembar Surat Berita Acara Resmi (Mobile Document Sheet) */}
          <div className="bg-white text-slate-950 p-6 md:p-10 rounded-3xl shadow-2xl border border-slate-200 space-y-6 select-text">
            {/* Kop Surat Voxxy Media Indonesia */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <div className="flex items-center justify-center gap-2.5 mb-1">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-9 max-w-[130px] object-contain" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-orange-500 to-blue-600 flex items-center justify-center text-white font-black text-xs">
                    VMI
                  </div>
                )}
                <h2 className="text-base md:text-xl font-black tracking-wider text-slate-950 uppercase">
                  {DEFAULT_BAST_TEMPLATE.namaPerusahaan}
                </h2>
              </div>
              <p className="text-[11px] text-slate-600 font-semibold">
                {DEFAULT_BAST_TEMPLATE.tagline}
              </p>
              <p className="text-[10px] text-slate-500">
                {DEFAULT_BAST_TEMPLATE.alamatKantor} | {DEFAULT_BAST_TEMPLATE.kontakKantor}
              </p>
            </div>

            {/* Judul Surat */}
            <div className="text-center space-y-1">
              <h3 className="text-sm md:text-base font-black uppercase tracking-wide text-slate-900 underline underline-offset-4">
                {DEFAULT_BAST_TEMPLATE.judulSurat}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-700">
                Nomor: {bastNumber}
              </p>
            </div>

            <p className="text-xs leading-relaxed text-slate-700">
              Pada hari ini, tanggal <strong>{new Date().toISOString().split('T')[0]}</strong>, bertempat di Kantor {DEFAULT_BAST_TEMPLATE.namaPerusahaan}, 
              {DEFAULT_BAST_TEMPLATE.kalimatPembuka}
            </p>

            {/* Bagian 1: Data Penerima */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 uppercase tracking-wide border-l-4 border-orange-500">
                I. IDENTITAS PENERIMA (KARYAWAN)
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="w-1/3 py-1 font-semibold text-slate-600">Nama Karyawan</td>
                    <td className="w-4">:</td>
                    <td className="py-1 font-bold text-slate-950">{namaPenerima}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">NIK / ID Karyawan</td>
                    <td>:</td>
                    <td className="py-1 text-slate-800">{nikKaryawan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">Divisi / Departemen</td>
                    <td>:</td>
                    <td className="py-1 text-slate-800">{departemen}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">Jabatan</td>
                    <td>:</td>
                    <td className="py-1 text-slate-800">{jabatan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">Email Resmi</td>
                    <td>:</td>
                    <td className="py-1 text-slate-800">{emailPenerima}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian 2: Data Perangkat Laptop */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 uppercase tracking-wide border-l-4 border-orange-500">
                II. RINCIAN PERANGKAT ASET
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="w-1/3 py-1 font-semibold text-slate-600">Kode Aset Kantor</td>
                    <td className="w-4">:</td>
                    <td className="py-1 font-mono font-bold text-orange-600">{asset.kode_aset}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">Merk & Tipe</td>
                    <td>:</td>
                    <td className="py-1 font-bold text-slate-900">{asset.merk} {asset.tipe_model}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">Nomor Seri Fisik (SN)</td>
                    <td>:</td>
                    <td className="py-1 font-mono text-slate-800">{asset.nomor_seri}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">Kondisi Fisik</td>
                    <td>:</td>
                    <td className="py-1 text-slate-800">{kondisiFisik}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-600">Kelengkapan</td>
                    <td>:</td>
                    <td className="py-1 text-slate-800">
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {kelengkapan.map((item, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-300 font-medium">
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Klausul Legalitas yang Dibaca Karyawan */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-orange-600" /> KETENTUAN DAN TANGGUNG JAWAB PENGGUNAAN:
              </div>
              <ol className="list-decimal pl-4 space-y-1">
                {DEFAULT_BAST_TEMPLATE.klausulTanggungJawab.map((clause, idx) => (
                  <li key={idx}>{clause}</li>
                ))}
              </ol>
            </div>

            {/* ================= KOTAK TANDA TANGAN DIGITAL DI LAYAR HP ================= */}
            <div className="pt-2 border-t border-slate-200 space-y-6">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wide text-center">
                PENGESAHAN TANDA TANGAN DIGITAL (LAYAR SENTUH HP)
              </div>

              {/* Tanda Tangan Penerima */}
              <div className="bg-slate-950 text-white p-4 rounded-3xl border-2 border-orange-500/40 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-xs font-bold text-white">Tanda Tangan Penerima: <u>{namaPenerima}</u></span>
                  </div>
                  <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded font-semibold">
                    Wajib Diisi Karyawan
                  </span>
                </div>

                <SignatureCanvas
                  label="Silakan goreskan tanda tangan Anda dengan jari di bawah:"
                  onSave={setTtdPenerima}
                  defaultValue={ttdPenerima}
                />
              </div>

              {/* Tanda Tangan Petugas IT/GA */}
              <div className="bg-slate-950 text-white p-4 rounded-3xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-xs font-bold text-white">Tanda Tangan Petugas Penyerah: <u>Reyhan Fajri (IT/GA)</u></span>
                  </div>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-semibold">
                    Petugas IT/GA
                  </span>
                </div>

                <SignatureCanvas
                  label="Tanda tangan petugas IT/GA:"
                  onSave={setTtdPetugas}
                  defaultValue={ttdPetugas}
                />
              </div>
            </div>
          </div>

          {/* Action Button Sahkan */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep('form')}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition text-center"
            >
              Ubah Data Formulir
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              className="flex-1 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs md:text-sm shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 transition"
            >
              <Send className="h-4 w-4" /> Sahkan & Terbitkan Berita Acara (BAST)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
