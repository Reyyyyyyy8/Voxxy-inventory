import React, { useState } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/gasScriptTemplate';
import { 
  Copy, 
  Check, 
  FileCode, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const TutorialGuide: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const steps = [
    {
      step: 1,
      title: 'Struktur Google Spreadsheet (4 Tab)',
      desc: 'Buat file baru di Google Sheets dengan 4 lembar tab terpisah.',
      details: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>
            1. Buka <strong>sheets.new</strong> di browser Anda.
          </p>
          <p>
            2. Beri nama file: <code className="bg-slate-800 text-orange-300 px-2 py-0.5 rounded">Inventory_Voxxy_Media</code>.
          </p>
          <p>
            3. Buat 4 tab di bagian bawah spreadsheet dengan format header kolom berikut:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-200">
            <li>
              <strong>Tab 1: <code>ASET</code></strong> — Baris ke-1 (Kolom A s/d P):
              <div className="bg-slate-950 p-2 rounded mt-1 font-mono text-[11px] text-orange-400 overflow-x-auto">
                kode_aset | kategori | merk | tipe_model | nomor_seri | spesifikasi | tgl_beli | harga | vendor | kondisi | status | lokasi | user_saat_ini | catatan | created_at | updated_at
              </div>
            </li>
            <li>
              <strong>Tab 2: <code>HANDOVER</code></strong> — Baris ke-1 (Kolom A s/d O):
              <div className="bg-slate-950 p-2 rounded mt-1 font-mono text-[11px] text-orange-400 overflow-x-auto">
                no_surat | tgl_handover | jenis_transaksi | kode_aset | nama_penerima | email_penerima | nik_karyawan | departemen | jabatan | nama_petugas | kondisi_fisik | kelengkapan | catatan_kelengkapan | link_pdf | created_at
              </div>
            </li>
            <li>
              <strong>Tab 3: <code>LOG_AKTIVITAS</code></strong> — Baris ke-1 (Kolom A s/d F):
              <div className="bg-slate-950 p-2 rounded mt-1 font-mono text-[11px] text-orange-400 overflow-x-auto">
                id_log | timestamp | user_admin | aksi | kode_aset | deskripsi
              </div>
            </li>
            <li>
              <strong>Tab 4: <code>MASTER_PENGATURAN</code></strong> — Kategori dan daftar email admin.
            </li>
          </ul>
        </div>
      )
    },
    {
      step: 2,
      title: 'Editor Google Apps Script',
      desc: 'Penghubung Google Sheets, Web App, dan Google Drive.',
      details: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>1. Di spreadsheet Anda, klik menu atas: <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</p>
          <p>2. Ganti nama proyek di kiri atas menjadi <strong>API_Inventory_VMI</strong>.</p>
        </div>
      )
    },
    {
      step: 3,
      title: 'Pemasangan Kode (Code.gs)',
      desc: 'Ganti seluruh isi file Code.gs dengan kode backend Voxxy Media Indonesia.',
      details: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>1. Hapus fungsi bawaan yang ada di editor.</p>
          <p>2. Klik tombol <strong>Salin Seluruh Kode Code.gs</strong> di bawah, lalu paste ke editor.</p>
          <p>3. Simpan proyek (Ctrl+S).</p>
        </div>
      )
    },
    {
      step: 4,
      title: 'Folder Google Drive untuk File PDF',
      desc: 'Folder penyimpanan otomatis surat Berita Acara (BAST).',
      details: (
        <div className="space-y-2 text-xs text-slate-300">
          <p>1. Buka Google Drive Anda (drive.google.com).</p>
          <p>2. Buat folder baru dengan nama: <code className="bg-slate-800 text-orange-300 px-2 py-0.5 rounded">BAST_Inventaris_Voxxy</code>.</p>
        </div>
      )
    },
    {
      step: 5,
      title: 'Deploy Web App',
      desc: 'Publikasikan sistem agar dapat diakses dari kamera perangkat.',
      details: (
        <div className="space-y-3 text-xs text-slate-300">
          <p>1. Di Apps Script, klik <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan baru (New deployment)</strong>.</p>
          <p>2. Pilih tipe: <strong>Aplikasi web (Web app)</strong>.</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-200">
            <li><strong>Jalankan sebagai:</strong> Saya (email Anda)</li>
            <li><strong>Akses:</strong> Siapa saja (Anyone)</li>
          </ul>
          <p>3. Klik <strong>Terapkan</strong> dan berikan otorisasi izin Google.</p>
          <p>4. Salin URL Aplikasi Web yang berakhiran <code>/exec</code>.</p>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Code Snippet Box */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-orange-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-blue-600 flex items-center justify-center text-white">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Source Code: Code.gs (Google Apps Script)</h3>
              <p className="text-xs text-slate-400">Backend siap pakai untuk Voxxy Media Indonesia.</p>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              copiedCode
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25'
            }`}
          >
            {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedCode ? 'Tersalin!' : 'Salin Kode Code.gs'}
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed">
          <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>
      </div>

      {/* Step by Step Accordion */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
          Tahapan Setup Spreadsheet & Drive:
        </h3>

        {steps.map(s => {
          const isOpen = activeStep === s.step;
          return (
            <div
              key={s.step}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setActiveStep(isOpen ? 0 : s.step)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isOpen ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {s.step}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{s.title}</h4>
                    <p className="text-[11px] text-slate-400">{s.desc}</p>
                  </div>
                </div>

                {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="p-4 pt-2 border-t border-slate-800/80 bg-slate-950/40">
                  {s.details}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
