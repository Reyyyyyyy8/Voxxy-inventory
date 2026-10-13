import React, { useState, useRef, useEffect } from 'react';
import { Asset, HandoverRecord, ActivityLog, SystemConfig } from '../types';
import { INITIAL_CATEGORIES } from '../mockData';
import { formatRupiah } from '../utils/qrGenerator';
import { 
  Table, 
  ExternalLink, 
  Download, 
  Plus, 
  Save, 
  KeyRound, 
  Mail, 
  FileSpreadsheet, 
  Link, 
  CheckCircle2, 
  Image as ImageIcon,
  Upload,
  Building,
  Edit,
  Trash2,
  HardDrive,
  UploadCloud,
  Globe,
  Database,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { 
  DEFAULT_SUPABASE_PUB_KEY, 
  DEFAULT_SUPABASE_SEC_KEY, 
  SUPABASE_SCHEMA_SQL 
} from '../utils/supabaseSync';

interface SheetsViewerProps {
  assets: Asset[];
  handovers: HandoverRecord[];
  logs: ActivityLog[];
  config: SystemConfig;
  onUpdateConfig: (newConfig: SystemConfig) => void;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (code: string) => void;
  onRestoreBackup?: (backupData: { assets: Asset[]; handovers: HandoverRecord[]; logs: ActivityLog[]; config: SystemConfig }) => void;
}

export const SheetsViewer: React.FC<SheetsViewerProps> = ({
  assets,
  handovers,
  logs,
  config,
  onUpdateConfig,
  onEditAsset,
  onDeleteAsset,
  onRestoreBackup
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<'ASET' | 'HANDOVER' | 'LOG' | 'MASTER' | 'SUPABASE'>('SUPABASE');
  const [sheetUrlInput, setSheetUrlInput] = useState(config.googleSheetsUrl || '');
  const [pinInput, setPinInput] = useState(config.adminPin || '');
  const [emailsInput, setEmailsInput] = useState(config.adminEmails.join(', '));
  const [logoUrlInput, setLogoUrlInput] = useState(config.logoUrl || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Supabase Cloud State
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(config.supabaseUrl || '');
  const [supabasePubKeyInput, setSupabasePubKeyInput] = useState(config.supabasePublishableKey || DEFAULT_SUPABASE_PUB_KEY);
  const [supabaseSecKeyInput, setSupabaseSecKeyInput] = useState(config.supabaseSecretKey || DEFAULT_SUPABASE_SEC_KEY);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [supabaseStatusInfo, setSupabaseStatusInfo] = useState<{
    configured: boolean;
    connected: boolean;
    message: string;
    tables?: { assets: boolean; handovers: boolean; logs: boolean };
  } | null>(null);
  const [isPushingSupabase, setIsPushingSupabase] = useState(false);
  const [isPullingSupabase, setIsPullingSupabase] = useState(false);
  const [supabaseActionMsg, setSupabaseActionMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  // Cek Status Supabase dari backend
  const fetchSupabaseStatus = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setSupabaseStatusInfo(data);
      if (data.url && !supabaseUrlInput) setSupabaseUrlInput(data.url);
      if (data.publishableKey) setSupabasePubKeyInput(data.publishableKey);
      if (data.secretKey) setSupabaseSecKeyInput(data.secretKey);
    } catch (err: any) {
      setSupabaseStatusInfo({
        configured: Boolean(config.supabaseUrl),
        connected: false,
        message: 'Tidak dapat menjangkau server API: ' + (err.message || 'Error')
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  useEffect(() => {
    fetchSupabaseStatus();
  }, []);

  // Simpan & Hubungkan Supabase
  const handleSaveSupabaseConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCheckingSupabase(true);
    setSupabaseActionMsg(null);

    const updatedConfig: SystemConfig = {
      ...config,
      supabaseUrl: supabaseUrlInput.trim(),
      supabasePublishableKey: supabasePubKeyInput.trim() || DEFAULT_SUPABASE_PUB_KEY,
      supabaseSecretKey: supabaseSecKeyInput.trim() || DEFAULT_SUPABASE_SEC_KEY
    };

    try {
      const res = await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: updatedConfig.supabaseUrl,
          supabasePublishableKey: updatedConfig.supabasePublishableKey,
          supabaseSecretKey: updatedConfig.supabaseSecretKey,
          pin: config.adminPin || ''
        })
      });
      const data = await res.json();
      onUpdateConfig(updatedConfig);
      setSupabaseStatusInfo({
        configured: Boolean(updatedConfig.supabaseUrl),
        connected: Boolean(data.connected),
        message: data.message || (data.connected ? 'Berhasil terhubung ke Supabase Cloud!' : 'Konfigurasi tersimpan.'),
        tables: data.tables
      });
      setSupabaseActionMsg({
        text: data.connected ? 'Tersambung ke Supabase Cloud!' : (data.message || 'Konfigurasi tersimpan.'),
        isError: !data.connected && Boolean(updatedConfig.supabaseUrl)
      });
    } catch (err: any) {
      onUpdateConfig(updatedConfig);
      setSupabaseActionMsg({
        text: 'Konfigurasi disimpan di cache lokal: ' + err.message,
        isError: true
      });
    } finally {
      setIsCheckingSupabase(false);
      setTimeout(() => setSupabaseActionMsg(null), 6000);
    }
  };

  // Push Semua Data Lokal ke Supabase
  const handlePushToSupabase = async () => {
    setIsPushingSupabase(true);
    setSupabaseActionMsg(null);
    try {
      const res = await fetch('/api/supabase/push-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: config.adminPin || '' })
      });
      const data = await res.json();
      setSupabaseActionMsg({
        text: data.message || 'Berhasil mengunggah seluruh data ke Supabase!',
        isError: !data.success
      });
      fetchSupabaseStatus();
    } catch (err: any) {
      setSupabaseActionMsg({ text: 'Gagal push ke Supabase: ' + err.message, isError: true });
    } finally {
      setIsPushingSupabase(false);
      setTimeout(() => setSupabaseActionMsg(null), 6000);
    }
  };

  // Tarik Data dari Supabase ke Lokal
  const handlePullFromSupabase = async () => {
    setIsPullingSupabase(true);
    setSupabaseActionMsg(null);
    try {
      const res = await fetch('/api/supabase/pull-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: config.adminPin || '' })
      });
      const data = await res.json();
      setSupabaseActionMsg({
        text: data.message || 'Berhasil menarik data dari Supabase!',
        isError: !data.success
      });
      if (data.success && onRestoreBackup && data.data) {
        onRestoreBackup(data.data);
      }
      fetchSupabaseStatus();
    } catch (err: any) {
      setSupabaseActionMsg({ text: 'Gagal pull dari Supabase: ' + err.message, isError: true });
    } finally {
      setIsPullingSupabase(false);
      setTimeout(() => setSupabaseActionMsg(null), 6000);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Export JSON Backup
  const downloadJsonBackup = () => {
    const backupObj = {
      version: 1,
      appName: 'Voxxy Media Indonesia Office Asset Management',
      exportedAt: new Date().toISOString(),
      config,
      assets,
      handovers,
      logs
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VMI_OFFICE_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (onRestoreBackup && parsed) {
          onRestoreBackup({
            assets: Array.isArray(parsed.assets) ? parsed.assets : [],
            handovers: Array.isArray(parsed.handovers) ? parsed.handovers : [],
            logs: Array.isArray(parsed.logs) ? parsed.logs : [],
            config: parsed.config || config
          });
          setSaveSuccessMsg(true);
          setTimeout(() => setSaveSuccessMsg(false), 3000);
        }
      } catch (err) {
        console.error('File backup tidak valid:', err);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Export CSV Helper
  const downloadCsv = (tabName: 'ASET' | 'HANDOVER' | 'LOG') => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (tabName === 'ASET') {
      headers = ['kode_aset', 'kategori', 'merk', 'tipe_model', 'nomor_seri', 'spesifikasi', 'tgl_beli', 'harga', 'vendor', 'kondisi', 'status', 'lokasi', 'user_saat_ini', 'catatan', 'created_at', 'updated_at'];
      rows = assets.map(a => [
        a.kode_aset, a.kategori, a.merk, a.tipe_model, a.nomor_seri, `"${a.spesifikasi.replace(/"/g, '""')}"`, a.tgl_beli, a.harga.toString(), a.vendor, a.kondisi, a.status, a.lokasi, a.user_saat_ini, `"${a.catatan.replace(/"/g, '""')}"`, a.created_at, a.updated_at
      ]);
    } else if (tabName === 'HANDOVER') {
      headers = ['no_surat', 'tgl_handover', 'jenis_transaksi', 'kode_aset', 'nama_penerima', 'email_penerima', 'nik_karyawan', 'departemen', 'jabatan', 'nama_petugas', 'kondisi_fisik', 'kelengkapan', 'catatan_kelengkapan', 'link_pdf', 'created_at'];
      rows = handovers.map(h => [
        h.no_surat, h.tgl_handover, h.jenis_transaksi, h.kode_aset, h.nama_penerima, h.email_penerima, h.nik_karyawan, h.departemen, h.jabatan, h.nama_petugas, `"${h.kondisi_fisik}"`, `"${h.kelengkapan.join(', ')}"`, `"${h.catatan_kelengkapan}"`, h.pdf_drive_link || '', h.created_at
      ]);
    } else {
      headers = ['id_log', 'timestamp', 'user_admin', 'aksi', 'kode_aset', 'deskripsi'];
      rows = logs.map(l => [
        l.id, l.timestamp, l.user_admin, l.aksi, l.kode_aset, `"${l.deskripsi.replace(/"/g, '""')}"`
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VMI_${tabName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrlInput(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedEmails = emailsInput
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const updatedConfig: SystemConfig = {
      ...config,
      adminPin: pinInput.trim() || '',
      adminEmails: parsedEmails,
      googleSheetsUrl: sheetUrlInput.trim(),
      logoUrl: logoUrlInput.trim()
    };

    onUpdateConfig(updatedConfig);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Google Sheet Direct Link & Quick Actions Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950/25 to-slate-900 border border-orange-500/30 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Database Inventaris Kantor</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25 font-mono">
                  Voxxy Media Indonesia
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pencatatan data aset, riwayat serah terima, dan log aktivitas operasional.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.googleSheetsUrl ? (
              <a
                href={config.googleSheetsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition"
              >
                <ExternalLink className="h-4 w-4" /> Buka Google Sheets
              </a>
            ) : (
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition"
              >
                <Plus className="h-4 w-4" /> Buka Sheet Baru
              </a>
            )}

            <button
              onClick={() => {
                const tabToExport = (activeSheetTab === 'ASET' || activeSheetTab === 'HANDOVER' || activeSheetTab === 'LOG') ? activeSheetTab : 'ASET';
                downloadCsv(tabToExport);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
              title="Unduh format tabel CSV"
            >
              <Download className="h-4 w-4" /> CSV
            </button>

            <button
              onClick={downloadJsonBackup}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
              title="Unduh seluruh database dalam format JSON untuk backup / Vercel"
            >
              <HardDrive className="h-4 w-4 text-orange-400" /> Backup JSON
            </button>

            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
              title="Upload file JSON backup"
            >
              <UploadCloud className="h-4 w-4 text-blue-400" /> Restore JSON
            </button>
            <input
              type="file"
              ref={jsonFileInputRef}
              onChange={handleJsonFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Input Tautan Google Sheet */}
        <form onSubmit={handleSaveSettings} className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 items-center text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Link className="h-3.5 w-3.5 text-orange-400" /> Tautan Google Sheets:
          </span>
          <input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrlInput}
            onChange={e => setSheetUrlInput(e.target.value)}
            className="flex-1 min-w-[280px] bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition"
          >
            <Save className="h-3.5 w-3.5" /> Simpan Tautan
          </button>
          {saveSuccessMsg && (
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Tersimpan!
            </span>
          )}
        </form>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveSheetTab('SUPABASE')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-2 ${
            activeSheetTab === 'SUPABASE' 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="h-4 w-4 text-emerald-400" />
          <span>⚡ DATABASE SUPABASE</span>
          {supabaseStatusInfo?.connected ? (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-400" title="Belum terhubung"></span>
          )}
        </button>
        <button
          onClick={() => setActiveSheetTab('ASET')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
            activeSheetTab === 'ASET' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          Tab 2: ASET ({assets.length} Unit)
        </button>
        <button
          onClick={() => setActiveSheetTab('HANDOVER')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
            activeSheetTab === 'HANDOVER' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          Tab 3: HANDOVER ({handovers.length} Surat)
        </button>
        <button
          onClick={() => setActiveSheetTab('LOG')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
            activeSheetTab === 'LOG' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          Tab 4: LOG_AKTIVITAS ({logs.length})
        </button>
        <button
          onClick={() => setActiveSheetTab('MASTER')}
          className={`px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
            activeSheetTab === 'MASTER' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          Tab 5: PENGATURAN UMUM & LOGO
        </button>
      </div>

      {/* Sheet Content Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {activeSheetTab === 'SUPABASE' && (
          <div className="p-6 space-y-6 text-xs">
            {/* Header Status Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950 border border-emerald-500/30 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">Database Cloud Supabase (PostgreSQL)</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono">
                        Realtime Multi-Device
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Menghubungkan inventaris ke database cloud Supabase agar data sinkron otomatis dan tidak hilang saat refresh.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchSupabaseStatus}
                    disabled={isCheckingSupabase}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingSupabase ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                    <span>Cek Status</span>
                  </button>
                </div>
              </div>

              {/* Status Indicator Bar */}
              <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                supabaseStatusInfo?.connected 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                  : supabaseUrlInput.trim()
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  {supabaseStatusInfo?.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : supabaseUrlInput.trim() ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                  ) : (
                    <Zap className="h-5 w-5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-sm text-white">
                      {supabaseStatusInfo?.connected 
                        ? 'Status: Terhubung ke Cloud Supabase' 
                        : supabaseUrlInput.trim()
                        ? 'Status: Memeriksa Koneksi / Tabel Supabase'
                        : 'Status: Kunci API Tersedia — Masukkan URL Proyek Supabase'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {supabaseStatusInfo?.message || (
                        supabaseUrlInput.trim() 
                          ? 'Klik "Simpan & Tes Koneksi" untuk menguji sambungan.' 
                          : 'Kunci Publishable dan Secret sudah aktif di aplikasi. Lengkapi "URL Proyek Supabase" di bawah.'
                      )}
                    </div>
                  </div>
                </div>

                {supabaseStatusInfo?.tables && (
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className={`px-2 py-0.5 rounded-md border ${supabaseStatusInfo.tables.assets ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
                      assets: {supabaseStatusInfo.tables.assets ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border ${supabaseStatusInfo.tables.handovers ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
                      handovers: {supabaseStatusInfo.tables.handovers ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border ${supabaseStatusInfo.tables.logs ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
                      logs: {supabaseStatusInfo.tables.logs ? '✓' : '✗'}
                    </span>
                  </div>
                )}
              </div>

              {/* Toast Message inside Tab */}
              {supabaseActionMsg && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  supabaseActionMsg.isError 
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' 
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                }`}>
                  {supabaseActionMsg.isError ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  <span>{supabaseActionMsg.text}</span>
                </div>
              )}
            </div>

            {/* Form Konfigurasi Kunci & URL */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Kolom 1: Konfigurasi Endpoint & Kunci */}
              <form onSubmit={handleSaveSupabaseConfig} className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-emerald-400" />
                    <h4 className="font-bold text-white text-sm">Kredensial Akun Supabase</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
                    Proyek Voxxy
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Link className="h-3.5 w-3.5 text-emerald-400" /> URL Proyek Supabase (Project URL)
                    </span>
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      Buka Supabase <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </label>
                  <input
                    type="url"
                    placeholder="https://xxxxxxxxxxxxxxxx.supabase.co"
                    value={supabaseUrlInput}
                    onChange={e => setSupabaseUrlInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    Contoh: <code className="text-emerald-400 font-mono">https://xyzcompany.supabase.co</code> (Dapatkan di Project Settings &gt; API &gt; Project URL).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center justify-between">
                    <span>Publishable Key (Client Anon Key)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">Aktif</span>
                  </label>
                  <input
                    type="text"
                    value={supabasePubKeyInput}
                    onChange={e => setSupabasePubKeyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Kunci publik untuk membaca/menulis data aset secara aman.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center justify-between">
                    <span>Secret Key (Service Role Key)</span>
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {showSecretKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showSecretKey ? 'Sembunyikan' : 'Perlihatkan'}</span>
                    </button>
                  </label>
                  <input
                    type={showSecretKey ? "text" : "password"}
                    value={supabaseSecKeyInput}
                    onChange={e => setSupabaseSecKeyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Kunci rahasia server untuk sinkronisasi otomatis tanpa blokade RLS.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isCheckingSupabase}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isCheckingSupabase ? 'Menghubungkan...' : 'Simpan & Tes Koneksi'}</span>
                  </button>
                </div>
              </form>

              {/* Kolom 2: Sync & Operasi Database */}
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="h-4 w-4 text-blue-400" />
                      <h4 className="font-bold text-white text-sm">Operasi Migrasi & Sinkronisasi</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {assets.length} Aset Lokal
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    Unggah seluruh data lokal kantor saat ini ke Supabase agar tersimpan permanen di cloud PostgreSQL, atau tarik data Supabase ke perangkat ini.
                  </p>

                  <div className="grid gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handlePushToSupabase}
                      disabled={isPushingSupabase}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-slate-900 border border-blue-500/30 hover:border-blue-400 text-left flex items-center justify-between group transition disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">Unggah Semua Data ke Supabase (Push)</div>
                          <div className="text-[11px] text-slate-400">
                            Push {assets.length} unit aset, {handovers.length} BAST, dan {logs.length} riwayat log
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shrink-0 transition">
                        {isPushingSupabase ? 'Mengunggah...' : 'Push Sekarang'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePullFromSupabase}
                      disabled={isPullingSupabase}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900/30 via-slate-900 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 text-left flex items-center justify-between group transition disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                          <Download className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">Tarik Data dari Supabase (Pull)</div>
                          <div className="text-[11px] text-slate-400">
                            Download database cloud untuk perbarui cache perangkat ini
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 transition">
                        {isPullingSupabase ? 'Menarik...' : 'Pull Sekarang'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Info Otomatisasi Realtime */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Sinkronisasi Otomatis Sudah Aktif</span>
                  </div>
                  <p>
                    Setiap kali Anda menambah aset, mengedit spesifikasi, menghapus unit, atau menandatangani BAST serah terima, sistem akan <b>otomatis mengirim data langsung ke Supabase Cloud</b> secara instan di latar belakang.
                  </p>
                </div>
              </div>
            </div>

            {/* Skrip SQL Setup (1-Klik Salin) */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Database className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h4 className="font-bold text-white text-sm">Skrip SQL Inisialisasi Database Supabase</h4>
                    <p className="text-[11px] text-slate-400">
                      Jalankan skrip ini sekali di menu <b>SQL Editor</b> dashboard Supabase Anda untuk membuat tabel dan aturan akses.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Buka SQL Editor
                  </a>

                  <button
                    onClick={handleCopySql}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition"
                  >
                    {copiedSql ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL'}</span>
                  </button>
                </div>
              </div>

              {/* Panduan 3 Langkah */}
              <div className="grid md:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-bold text-emerald-400">Langkah 1:</span>
                  <p className="text-slate-300">Klik tombol <b>"Salin Skrip SQL"</b> di atas.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-bold text-emerald-400">Langkah 2:</span>
                  <p className="text-slate-300">Buka Supabase Dashboard &gt; pilih proyek &gt; menu <b>SQL Editor</b> &gt; Tempel dan klik <b>Run</b>.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-bold text-emerald-400">Langkah 3:</span>
                  <p className="text-slate-300">Salin <b>Project URL</b> ke form konfigurasi di atas &amp; klik <b>Simpan &amp; Tes Koneksi</b>.</p>
                </div>
              </div>

              {/* Pratinjau Kode SQL */}
              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeSheetTab === 'ASET' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Kode Aset</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Merk & Tipe</th>
                  <th className="p-3.5">Serial Number</th>
                  <th className="p-3.5">Spesifikasi</th>
                  <th className="p-3.5">Harga Beli</th>
                  <th className="p-3.5">Kondisi</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Pemegang</th>
                  <th className="p-3.5">Lokasi</th>
                  <th className="p-3.5 text-center">Aksi (Kelola)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {assets.map(item => (
                  <tr key={item.kode_aset} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono font-bold text-orange-400">{item.kode_aset}</td>
                    <td className="p-3.5">{item.kategori}</td>
                    <td className="p-3.5 font-bold text-white">{item.merk} {item.tipe_model}</td>
                    <td className="p-3.5 font-mono text-slate-400">{item.nomor_seri}</td>
                    <td className="p-3.5 max-w-xs truncate text-slate-300" title={item.spesifikasi}>{item.spesifikasi}</td>
                    <td className="p-3.5 font-mono text-orange-400 font-semibold">{formatRupiah(item.harga)}</td>
                    <td className="p-3.5">{item.kondisi}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'Tersedia'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5">{item.user_saat_ini || <span className="text-slate-500">-</span>}</td>
                    <td className="p-3.5 text-slate-400">{item.lokasi}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onEditAsset && (
                          <button
                            type="button"
                            title="Edit Data"
                            onClick={() => onEditAsset(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-500/20 text-slate-300 hover:text-orange-400 border border-slate-700 transition"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onDeleteAsset && (
                          <button
                            type="button"
                            title="Hapus Unit"
                            onClick={() => onDeleteAsset(item.kode_aset)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSheetTab === 'HANDOVER' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">No. BAST</th>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Kode Aset</th>
                  <th className="p-3.5">Nama Penerima</th>
                  <th className="p-3.5">Departemen</th>
                  <th className="p-3.5">Jabatan</th>
                  <th className="p-3.5">Petugas IT</th>
                  <th className="p-3.5">Kelengkapan</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {handovers.map(ho => (
                  <tr key={ho.id_handover} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono font-bold text-white">{ho.no_surat}</td>
                    <td className="p-3.5 text-slate-400">{ho.tgl_handover}</td>
                    <td className="p-3.5 font-mono text-orange-400 font-bold">{ho.kode_aset}</td>
                    <td className="p-3.5 font-bold text-white">{ho.nama_penerima}</td>
                    <td className="p-3.5">{ho.departemen}</td>
                    <td className="p-3.5 text-slate-300">{ho.jabatan}</td>
                    <td className="p-3.5 text-slate-400">{ho.nama_petugas}</td>
                    <td className="p-3.5 max-w-xs truncate text-slate-400" title={ho.kelengkapan.join(', ')}>
                      {ho.kelengkapan.join(', ')}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-800">
                        Dokumen Sah
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSheetTab === 'LOG' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Operator</th>
                  <th className="p-3.5">Aksi</th>
                  <th className="p-3.5">Kode Aset</th>
                  <th className="p-3.5">Rincian Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-slate-400">{log.timestamp}</td>
                    <td className="p-3.5 text-orange-300 font-medium">{log.user_admin}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                        {log.aksi}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-orange-400 font-bold">{log.kode_aset}</td>
                    <td className="p-3.5 text-slate-300">{log.deskripsi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSheetTab === 'MASTER' && (
          <div className="p-6 space-y-6 text-xs">
            {/* Bagian Upload / Tautkan Logo Perusahaan */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-orange-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="h-5 w-5 text-orange-400" />
                  <div>
                    <h4 className="font-bold text-white text-sm">Logo Resmi Perusahaan (Voxxy Media Indonesia)</h4>
                    <p className="text-[11px] text-slate-400">
                      Logo ini akan muncul di Header aplikasi, Kop Surat PDF Berita Acara (BAST), dan Stiker Label QR.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5 items-center">
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Upload File Logo dari Komputer/HP:</label>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
                    >
                      <Upload className="h-4 w-4 text-orange-400" /> Pilih File Gambar Logo (PNG / JPG / SVG)
                    </button>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Atau Masukkan URL Logo Gambar:</label>
                    <input
                      type="text"
                      placeholder="https://voxxymedia.com/assets/logo.png atau /logo.png"
                      value={logoUrlInput}
                      onChange={e => setLogoUrlInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Pratinjau Logo */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center min-h-[120px]">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                    Pratinjau Logo Saat Ini
                  </span>
                  {logoUrlInput ? (
                    <div className="p-2 bg-white rounded-xl max-h-20 flex items-center justify-center">
                      <img src={logoUrlInput} alt="Preview Logo" className="max-h-16 max-w-[200px] object-contain" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/25">
                      VMI
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Pengaturan PIN & Email Admin */}
            <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-orange-400" />
                  <h4 className="font-bold text-white text-sm">Otorisasi PIN & Whitelist Email Admin</h4>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-orange-400" /> PIN Akses Cepat (6 Digit)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-orange-500 text-sm"
                  />
                  <p className="text-[11px] text-slate-400">
                    PIN otorisasi serah terima laptop atau perubahan data di HP.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-orange-400" /> Email Admin Pengelola (Pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={emailsInput}
                    onChange={e => setEmailsInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Akun yang memiliki wewenang administrator.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 transition"
                >
                  <Save className="h-4 w-4" /> Simpan Pengaturan
                </button>
              </div>
            </form>

            {/* Tabel Kategori */}
            <div>
              <h4 className="font-bold text-white text-sm mb-3">Kategori Aset Operasional</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {INITIAL_CATEGORIES.map(cat => (
                  <div key={cat.kode} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-400">{cat.kode}</span>
                        <span className="font-bold text-white">{cat.nama}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{cat.deskripsi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panduan Deployment Vercel & Multi-Device */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Panduan Publish ke Vercel & Hosting Cloud</h4>
                    <p className="text-[11px] text-slate-400">Cara deploy aplikasi ini ke Vercel atau server cloud mandiri.</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  Ready to Deploy
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-white text-black font-black text-[10px]">▲ Vercel</span>
                    <span>Publish di Vercel (Front-end SPA)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Aplikasi sudah dilengkapi file <code className="text-orange-400 font-mono">vercel.json</code> dan integrasi <code className="text-orange-400 font-mono">localStorage</code>. Data Anda di browser tidak akan hilang saat direfresh di HP maupun laptop.
                  </p>
                  <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px]">
                    <li>Upload folder project ini ke GitHub Repository Anda.</li>
                    <li>Buka <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-orange-400 underline">vercel.com</a> &gt; <b>Add New Project</b> &gt; Import repo Anda.</li>
                    <li>Framework Preset pilih <b>Vite</b>, klik <b>Deploy</b>. Selesai!</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Database className="h-4 w-4 text-blue-400" />
                    <span>Sync Multi-Device Realtime di Production</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Karena Vercel serverless tidak menyimpan file fisik permanen, jika Anda ingin database realtime sync 100% antar-device tanpa konfigurasi database tambahan:
                  </p>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                    <li><b>Railway / Render.com</b>: Deploy via 1-klik dengan start command <code className="text-orange-400 font-mono">npm start</code> (Node.js fullstack).</li>
                    <li><b>Fitur Backup &amp; Restore</b>: Gunakan tombol <b className="text-orange-400">Backup JSON</b> &amp; <b className="text-blue-400">Restore JSON</b> di atas untuk transfer data antar perangkat kapan saja.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
