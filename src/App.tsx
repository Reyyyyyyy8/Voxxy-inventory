import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Asset, HandoverRecord, ActivityLog, SystemConfig } from './types';
import { INITIAL_ASSETS, INITIAL_HANDOVERS, INITIAL_LOGS } from './mockData';
import { AssetScanner } from './components/AssetScanner';
import { AssetDetail } from './components/AssetDetail';
import { AssetForm } from './components/AssetForm';
import { HandoverForm } from './components/HandoverForm';
import { BastPdfPreview } from './components/BastPdfPreview';
import { QrBatchGenerator } from './components/QrBatchGenerator';
import { SheetsViewer } from './components/SheetsViewer';
import { TutorialGuide } from './components/TutorialGuide';
import { PinModal } from './components/PinModal';
import { DeleteModal } from './components/DeleteModal';
import { FullInventoryView } from './components/FullInventoryView';
import { MobileConnectModal } from './components/MobileConnectModal';
import { generateNextAssetCode } from './utils/qrGenerator';
import { 
  Laptop, 
  QrCode, 
  FileText, 
  Table, 
  Lock, 
  Unlock, 
  BookOpen, 
  CheckCircle2, 
  Sparkles,
  Layers,
  Boxes,
  Scan,
  Database,
  RefreshCw,
  Smartphone,
  Radio
} from 'lucide-react';

export default function App() {
  // Navigation Tabs: 'scan' | 'inventory' | 'stickers' | 'sheets' | 'guide' (Persistent on Refresh)
  const [activeMainTab, setActiveMainTab] = useState<'scan' | 'inventory' | 'stickers' | 'sheets' | 'guide'>(() => {
    try {
      const saved = localStorage.getItem('vmi_active_tab');
      if (saved && ['scan', 'inventory', 'stickers', 'sheets', 'guide'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'inventory'; // Default ke Katalog Inventaris agar user langsung melihat data asetnya
  });
  
  // App Sub-screens: scanner | inventory | detail | register | edit | handover | bast (Persistent on Refresh)
  const [appScreen, setAppScreen] = useState<'scanner' | 'detail' | 'register' | 'edit' | 'handover' | 'bast'>(() => {
    try {
      const saved = localStorage.getItem('vmi_app_screen');
      if (saved && ['scanner', 'detail', 'register', 'edit', 'handover', 'bast'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'scanner';
  });

  // Active Selection State (Persistent on Refresh)
  const [selectedAssetCode, setSelectedAssetCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vmi_selected_asset_code');
      if (saved) return saved;
    } catch {}
    return '001-VMI-LPT';
  });

  const changeMainTab = (tab: 'scan' | 'inventory' | 'stickers' | 'sheets' | 'guide') => {
    setActiveMainTab(tab);
    try {
      localStorage.setItem('vmi_active_tab', tab);
    } catch {}
  };

  const changeAppScreen = (screen: 'scanner' | 'detail' | 'register' | 'edit' | 'handover' | 'bast') => {
    setAppScreen(screen);
    try {
      localStorage.setItem('vmi_app_screen', screen);
    } catch {}
  };

  const selectAsset = (code: string) => {
    setSelectedAssetCode(code);
    try {
      localStorage.setItem('vmi_selected_asset_code', code);
    } catch {}
  };

  // Database State with LocalStorage Hydration fallback (Anti-loss)
  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem('vmi_assets');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_ASSETS;
  });

  const [handovers, setHandovers] = useState<HandoverRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vmi_handovers');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_HANDOVERS;
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem('vmi_logs');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_LOGS;
  });

  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem('vmi_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      companyName: 'Voxxy Media Indonesia',
      prefix: 'VMI',
      adminPin: '',
      adminEmails: [],
      googleSheetsUrl: '',
      logoUrl: '',
      supabaseUrl: '',
      supabasePublishableKey: '',
      supabaseSecretKey: ''
    };
  });

  // Helper untuk menyimpan ke localStorage
  const persistLocally = useCallback((newAssets?: Asset[], newHandovers?: HandoverRecord[], newLogs?: ActivityLog[], newConfig?: SystemConfig) => {
    try {
      if (newAssets !== undefined) localStorage.setItem('vmi_assets', JSON.stringify(newAssets));
      if (newHandovers !== undefined) localStorage.setItem('vmi_handovers', JSON.stringify(newHandovers));
      if (newLogs !== undefined) localStorage.setItem('vmi_logs', JSON.stringify(newLogs));
      if (newConfig !== undefined) localStorage.setItem('vmi_config', JSON.stringify(newConfig));
    } catch {}
  }, []);

  // Realtime Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);

  // BroadcastChannel untuk update realtime instan antar tab di HP / Laptop yang sama
  const syncChannel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        return new BroadcastChannel('voxxy_inventory_sync');
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const notifyChange = useCallback(() => {
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: 'INVENTORY_CHANGED', timestamp: Date.now() });
      } catch {}
    }
  }, [syncChannel]);

  // SMART SYNC: Melakukan sinkronisasi dua arah tanpa pernah menghapus data lokal yang belum tersimpan
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      // Baca data lokal yang tersimpan di localStorage
      let localAssets: Asset[] = [];
      let localHandovers: HandoverRecord[] = [];
      let localLogs: ActivityLog[] = [];
      try {
        const savedAssets = localStorage.getItem('vmi_assets');
        if (savedAssets) localAssets = JSON.parse(savedAssets);
        const savedHandovers = localStorage.getItem('vmi_handovers');
        if (savedHandovers) localHandovers = JSON.parse(savedHandovers);
        const savedLogs = localStorage.getItem('vmi_logs');
        if (savedLogs) localLogs = JSON.parse(savedLogs);
      } catch {}

      // Kirim sync dua arah ke backend
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({
          assets: localAssets,
          handovers: localHandovers,
          logs: localLogs
        })
      });

      if (!res.ok) throw new Error('HTTP error ' + res.status);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.config) {
          setConfig(prev => ({ ...prev, ...json.data.config }));
        }

        if (Array.isArray(json.data.assets)) {
          setAssets(json.data.assets);
        }
        if (Array.isArray(json.data.handovers)) {
          setHandovers(json.data.handovers);
        }
        if (Array.isArray(json.data.logs)) {
          setLogs(json.data.logs);
        }
        persistLocally(json.data.assets, json.data.handovers, json.data.logs, json.data.config);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      if (!silent) console.warn('Fetch sync notice:', err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [persistLocally]);

  // Realtime Polling Engine (Setiap 3 detik + saat tab kembali dibuka / layar HP menyala)
  useEffect(() => {
    // 1. Initial fetch & bi-directional sync on load
    fetchData(false);

    // 2. Background polling tiap 3 detik
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);

    // 3. Listener saat tab/browser di HP dibuka kembali setelah lock screen
    const handleFocus = () => fetchData(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Listener BroadcastChannel (instan antar-tab)
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data?.type === 'INVENTORY_CHANGED') {
          fetchData(true);
        }
      };
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, syncChannel]);

  const handleUpdateConfig = async (newConfig: SystemConfig) => {
    setConfig(newConfig);
    persistLocally(undefined, undefined, undefined, newConfig);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig, pin: newConfig.adminPin })
      });
      notifyChange();
      showToast('Pengaturan sistem berhasil disimpan!');
    } catch (err) {
      console.warn('Gagal simpan config ke server:', err);
      showToast('Pengaturan disimpan di browser lokal!');
    }
  };

  const [pendingNewCode, setPendingNewCode] = useState<string>('');
  const [activeBastHandover, setActiveBastHandover] = useState<HandoverRecord | null>(INITIAL_HANDOVERS[0]);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Security & PIN State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Guard action with PIN
  const executeWithPinGuard = (action: () => void) => {
    if (isPinAuthenticated) {
      action();
    } else {
      setPendingAction(() => action);
      setIsPinModalOpen(true);
    }
  };

  const handlePinSuccess = () => {
    setIsPinAuthenticated(true);
    setIsPinModalOpen(false);
    showToast('PIN Terverifikasi! Akses Admin Aktif.');
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Alur Scan QR Code
  const handleScanCode = (scannedCode: string) => {
    const formattedCode = scannedCode.trim().toUpperCase();
    const existing = assets.find(a => a.kode_aset.toUpperCase() === formattedCode);

    if (existing) {
      selectAsset(existing.kode_aset);
      changeAppScreen('detail');
      showToast(`Aset Ditemukan: ${existing.merk} ${existing.tipe_model}`);
    } else {
      setPendingNewCode(formattedCode);
      executeWithPinGuard(() => {
        changeAppScreen('register');
        showToast(`Unit ${formattedCode} belum terdaftar.`);
      });
    }
  };

  // Buka Form Tambah Manual dari Full Inventory
  const handleAddNewManual = () => {
    executeWithPinGuard(() => {
      const existingCodes = assets.map(a => a.kode_aset);
      const nextCode = generateNextAssetCode(existingCodes, config.prefix || 'VMI', 'LPT');
      setPendingNewCode(nextCode);
      changeAppScreen('register');
    });
  };

  // Simpan Pendaftaran Baru atau Edit (Anti-loss & Instan Tersimpan)
  const handleSaveAsset = async (assetData: Asset) => {
    const existingIndex = assets.findIndex(a => a.kode_aset.toUpperCase() === assetData.kode_aset.toUpperCase());
    let updated: Asset[];

    if (existingIndex >= 0) {
      updated = [...assets];
      updated[existingIndex] = assetData;
      setAssets(updated);
      showToast(`Data aset ${assetData.kode_aset} berhasil diperbarui!`);
    } else {
      updated = [assetData, ...assets];
      setAssets(updated);
      showToast(`Unit ${assetData.kode_aset} resmi terdaftar!`);
    }
    // Langsung amankan ke LocalStorage
    persistLocally(updated);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: assetData,
          pin: config.adminPin || '',
          operatorEmail: config.adminEmails[0] || 'admin'
        })
      });
      if (res.ok) {
        notifyChange();
      }
    } catch (e) {
      console.warn('Backend sync notice (offline/vercel):', e);
    }

    selectAsset(assetData.kode_aset);
    changeAppScreen('detail');
  };

  // Simpan Serah Terima (Handover)
  const handleCompleteHandover = async (handoverRecord: HandoverRecord) => {
    const updatedHandovers = [handoverRecord, ...handovers];
    setHandovers(updatedHandovers);

    const updatedAssets = assets.map(a => {
      if (a.kode_aset.toUpperCase() === handoverRecord.kode_aset.toUpperCase()) {
        return {
          ...a,
          status: 'Dipakai' as const,
          user_saat_ini: handoverRecord.nama_penerima,
          departemen_user: handoverRecord.departemen,
          updated_at: handoverRecord.tgl_handover
        };
      }
      return a;
    });
    setAssets(updatedAssets);
    persistLocally(updatedAssets, updatedHandovers);

    try {
      const res = await fetch('/api/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handover: handoverRecord,
          pin: config.adminPin || '',
          operatorEmail: config.adminEmails[0] || 'admin'
        })
      });
      if (res.ok) {
        notifyChange();
      }
    } catch (e) {
      console.warn('Backend handover notice (offline/vercel):', e);
    }

    setActiveBastHandover(handoverRecord);
    changeAppScreen('bast');
    showToast('Handover Selesai! Berita Acara PDF diterbitkan.');
  };

  // Pengembalian Unit (Return)
  const handleReturnAsset = async () => {
    executeWithPinGuard(async () => {
      const target = assets.find(a => a.kode_aset.toUpperCase() === selectedAssetCode.toUpperCase());
      if (!target) return;

      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const updatedAssets = assets.map(a => {
        if (a.kode_aset.toUpperCase() === selectedAssetCode.toUpperCase()) {
          return {
            ...a,
            status: 'Tersedia' as const,
            user_saat_ini: '',
            departemen_user: '',
            updated_at: now
          };
        }
        return a;
      });
      setAssets(updatedAssets);
      persistLocally(updatedAssets);

      try {
        const res = await fetch(`/api/assets/${encodeURIComponent(selectedAssetCode)}/return`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin: config.adminPin || '',
            operatorEmail: config.adminEmails[0] || 'admin'
          })
        });
        if (res.ok) {
          notifyChange();
        }
      } catch (e) {
        console.warn('Backend return notice (offline/vercel):', e);
      }

      showToast(`Unit ${target.kode_aset} dikembalikan ke status Tersedia!`);
    });
  };

  // Hapus Aset (Delete)
  const handleRequestDeleteAsset = (code: string) => {
    const target = assets.find(a => a.kode_aset.toUpperCase() === code.toUpperCase());
    if (!target) return;
    executeWithPinGuard(() => {
      setAssetToDelete(target);
    });
  };

  const handleConfirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    const code = assetToDelete.kode_aset.toUpperCase();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Optimistic / Local update
    const updatedAssets = assets.filter(a => a.kode_aset.toUpperCase() !== code);
    setAssets(updatedAssets);
    const newLog: ActivityLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: now,
      user_admin: config.adminEmails[0] || 'admin',
      aksi: 'HAPUS_ASET',
      kode_aset: code,
      deskripsi: `Penghapusan unit ${assetToDelete.merk} ${assetToDelete.tipe_model} (SN: ${assetToDelete.nomor_seri}) dari database.`
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    persistLocally(updatedAssets, undefined, updatedLogs);

    try {
      await fetch(`/api/assets/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: config.adminPin || '',
          operatorEmail: config.adminEmails[0] || 'admin'
        })
      });
      notifyChange();
    } catch (e) {
      console.warn('Backend delete notice (offline/vercel):', e);
    }

    showToast(`Unit ${code} (${assetToDelete.merk} ${assetToDelete.tipe_model}) berhasil dihapus!`);
    setAssetToDelete(null);

    // Jika sedang di halaman detail/edit unit ini, arahkan ke daftar inventaris
    if (selectedAssetCode.toUpperCase() === code) {
      changeMainTab('inventory');
      changeAppScreen('scanner');
    }
  };

  // Kosongkan Seluruh Database Inventaris (Siap Pakai untuk Input Nyata)
  const handleClearAll = async () => {
    executeWithPinGuard(async () => {
      setIsSyncing(true);
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const newLogs: ActivityLog[] = [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          timestamp: now,
          user_admin: config.adminEmails[0] || 'admin',
          aksi: 'HAPUS_SEMUA',
          kode_aset: 'ALL',
          deskripsi: 'Database inventaris dikosongkan secara menyeluruh oleh admin.'
        }
      ];

      // Optimistic / Local update
      setAssets([]);
      setHandovers([]);
      setLogs(newLogs);
      persistLocally([], [], newLogs);

      try {
        await fetch('/api/clear-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: config.adminPin || '' })
        });
        notifyChange();
      } catch (e) {
        console.warn('Backend clear notice:', e);
      } finally {
        setIsSyncing(false);
      }
      showToast('Seluruh inventaris berhasil dikosongkan. Sistem siap diisi data kantor Anda!');
    });
  };

  // Reset Demo Data (8 kategori inventaris kantor)
  const handleResetDemo = async () => {
    executeWithPinGuard(async () => {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/reset-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: config.adminPin || '' })
        });
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.config) setConfig(json.data.config);
          if (Array.isArray(json.data.assets)) setAssets(json.data.assets);
          if (Array.isArray(json.data.handovers)) setHandovers(json.data.handovers);
          if (Array.isArray(json.data.logs)) setLogs(json.data.logs);
          persistLocally(json.data.assets, json.data.handovers, json.data.logs, json.data.config);
          notifyChange();
          showToast('Data demo kantor (8 kategori) berhasil dimuat ulang!');
        }
      } catch (e) {
        // Fallback jika backend tidak tersedia (misal static di Vercel atau offline)
        setAssets(INITIAL_ASSETS);
        setHandovers(INITIAL_HANDOVERS);
        setLogs(INITIAL_LOGS);
        persistLocally(INITIAL_ASSETS, INITIAL_HANDOVERS, INITIAL_LOGS);
        notifyChange();
        showToast('Data kantor (8 kategori) berhasil dimuat ulang!');
      } finally {
        setIsSyncing(false);
      }
    });
  };

  // Restore Backup Data (JSON)
  const handleRestoreBackup = async (backupData: { assets?: Asset[]; handovers?: HandoverRecord[]; logs?: ActivityLog[]; config?: SystemConfig }) => {
    executeWithPinGuard(async () => {
      if (Array.isArray(backupData.assets)) setAssets(backupData.assets);
      if (Array.isArray(backupData.handovers)) setHandovers(backupData.handovers);
      if (Array.isArray(backupData.logs)) setLogs(backupData.logs);
      if (backupData.config) setConfig(backupData.config);

      persistLocally(backupData.assets, backupData.handovers, backupData.logs, backupData.config);

      try {
        await fetch('/api/restore-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: backupData,
            pin: config.adminPin || ''
          })
        });
      } catch (e) {
        console.warn('Backend restore notice:', e);
      }
      notifyChange();
      showToast('Data inventaris berhasil dipulihkan dari file backup!');
    });
  };

  // Edit Aset
  const handleRequestEditAsset = (assetOrCode: Asset | string) => {
    const code = typeof assetOrCode === 'string' ? assetOrCode : assetOrCode.kode_aset;
    selectAsset(code);
    executeWithPinGuard(() => {
      changeAppScreen('edit');
    });
  };

  const currentSelectedAsset = assets.find(a => a.kode_aset === selectedAssetCode);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-white pb-24 md:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 md:top-20 right-4 left-4 md:left-auto md:w-auto z-50 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl shadow-orange-950/40 flex items-center gap-2 border border-orange-400 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Connect QR Modal */}
      <MobileConnectModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        lastSyncTime={lastSyncTime}
        onForceSync={() => fetchData(false)}
        isSyncing={isSyncing}
      />

      {/* PIN Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        configuredPin={config.adminPin}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!assetToDelete}
        assetCode={assetToDelete?.kode_aset || null}
        assetName={assetToDelete ? `${assetToDelete.merk} ${assetToDelete.tipe_model}` : ''}
        onClose={() => setAssetToDelete(null)}
        onConfirm={handleConfirmDeleteAsset}
      />

      {/* Main App Bar (Clean Mobile Optimized) */}
      <header className="border-b border-orange-500/20 bg-slate-900/95 backdrop-blur sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="h-9 max-w-[120px] object-contain rounded-lg" />
            ) : (
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-blue-600 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white font-black text-sm tracking-tighter">
                VMI
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-white text-sm md:text-base leading-tight">
                  Voxxy Media
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                  Inventory
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-slate-400">
                Asset & Handover System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Sync Indicator & Force Refresh Button */}
            <button
              onClick={() => fetchData(false)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={lastSyncTime ? `Terakhir sync: ${lastSyncTime.toLocaleTimeString('id-ID')}` : 'Sinkronkan data realtime'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <RefreshCw className={`h-3 w-3 text-slate-400 ${isSyncing ? 'animate-spin text-orange-400' : ''}`} />
              <span className="hidden md:inline text-[11px] font-mono text-slate-400">
                {isSyncing ? 'Syncing...' : 'Live'}
              </span>
            </button>

            {/* Buka di HP (QR Code) Button */}
            <button
              onClick={() => setIsMobileModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition"
              title="Buka link ini di HP via QR Code"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buka di HP</span>
            </button>

            {/* Admin PIN Lock Button */}
            <button
              onClick={() => {
                if (isPinAuthenticated) {
                  setIsPinAuthenticated(false);
                  showToast('Sesi Admin dikunci.');
                } else {
                  setIsPinModalOpen(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                isPinAuthenticated
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:border-orange-500/50'
              }`}
            >
              {isPinAuthenticated ? (
                <>
                  <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Admin Aktif</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Kunci PIN</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desktop Tabs (Hidden on small mobile screens to prevent clutter) */}
        <div className="max-w-6xl mx-auto px-4 hidden md:flex gap-1.5 border-t border-slate-800/80 overflow-x-auto text-xs py-1.5">
          <button
            onClick={() => {
              changeMainTab('scan');
              changeAppScreen('scanner');
            }}
            className={`px-4 py-2 font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'scan' && appScreen === 'scanner'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Scan className="h-3.5 w-3.5" />
            1. Scan QR Kamera
          </button>

          <button
            onClick={() => {
              changeMainTab('inventory');
              changeAppScreen('scanner'); // return to main view container
            }}
            className={`px-4 py-2 font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'inventory'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            2. Katalog Inventaris ({assets.length})
          </button>

          <button
            onClick={() => changeMainTab('stickers')}
            className={`px-4 py-2 font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'stickers'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            3. Cetak Label QR (A4)
          </button>

          <button
            onClick={() => changeMainTab('sheets')}
            className={`px-4 py-2 font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'sheets'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            4. Database & Cloud Supabase
          </button>

          <button
            onClick={() => changeMainTab('guide')}
            className={`px-4 py-2 font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'guide'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Panduan Google Sheets
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 md:py-6">
        {/* TAB 1: Scan QR Code View */}
        {activeMainTab === 'scan' && (
          <div className="space-y-6">
            {appScreen === 'scanner' && (
              <AssetScanner
                assets={assets}
                onScanCode={handleScanCode}
                onRegisterNew={code => {
                  setPendingNewCode(code);
                  executeWithPinGuard(() => changeAppScreen('register'));
                }}
              />
            )}

            {appScreen === 'detail' && currentSelectedAsset && (
              <AssetDetail
                asset={currentSelectedAsset}
                handovers={handovers}
                isAdmin={isPinAuthenticated}
                onRequestAdminLogin={() => setIsPinModalOpen(true)}
                onStartHandover={() => {
                  executeWithPinGuard(() => changeAppScreen('handover'));
                }}
                onReturnAsset={handleReturnAsset}
                onEditAsset={() => handleRequestEditAsset(currentSelectedAsset)}
                onDeleteAsset={handleRequestDeleteAsset}
                onViewBast={record => {
                  setActiveBastHandover(record);
                  changeAppScreen('bast');
                }}
              />
            )}

            {appScreen === 'register' && (
              <AssetForm
                initialCode={pendingNewCode || `00${assets.length + 1}-VMI-LPT`}
                onBack={() => changeAppScreen('scanner')}
                onSave={handleSaveAsset}
              />
            )}

            {appScreen === 'edit' && currentSelectedAsset && (
              <AssetForm
                existingAsset={currentSelectedAsset}
                onBack={() => changeAppScreen('detail')}
                onSave={handleSaveAsset}
                onDelete={handleRequestDeleteAsset}
              />
            )}

            {appScreen === 'handover' && currentSelectedAsset && (
              <HandoverForm
                asset={currentSelectedAsset}
                logoUrl={config.logoUrl}
                onBack={() => changeAppScreen('detail')}
                onSubmit={handleCompleteHandover}
              />
            )}

            {appScreen === 'bast' && activeBastHandover && (
              <BastPdfPreview
                handover={activeBastHandover}
                asset={assets.find(a => a.kode_aset === activeBastHandover.kode_aset)}
                logoUrl={config.logoUrl}
                onBack={() => changeAppScreen('detail')}
              />
            )}
          </div>
        )}

        {/* TAB 2: Full Inventory Browser Catalog */}
        {activeMainTab === 'inventory' && (
          <div className="space-y-6">
            {appScreen === 'detail' && currentSelectedAsset ? (
              <AssetDetail
                asset={currentSelectedAsset}
                handovers={handovers}
                isAdmin={isPinAuthenticated}
                onRequestAdminLogin={() => setIsPinModalOpen(true)}
                onStartHandover={() => {
                  executeWithPinGuard(() => changeAppScreen('handover'));
                }}
                onReturnAsset={handleReturnAsset}
                onEditAsset={() => handleRequestEditAsset(currentSelectedAsset)}
                onDeleteAsset={handleRequestDeleteAsset}
                onViewBast={record => {
                  setActiveBastHandover(record);
                  changeAppScreen('bast');
                }}
              />
            ) : appScreen === 'register' ? (
              <AssetForm
                initialCode={pendingNewCode || `00${assets.length + 1}-VMI-LPT`}
                onBack={() => changeAppScreen('scanner')}
                onSave={handleSaveAsset}
              />
            ) : appScreen === 'edit' && currentSelectedAsset ? (
              <AssetForm
                existingAsset={currentSelectedAsset}
                onBack={() => changeAppScreen('detail')}
                onSave={handleSaveAsset}
                onDelete={handleRequestDeleteAsset}
              />
            ) : appScreen === 'handover' && currentSelectedAsset ? (
              <HandoverForm
                asset={currentSelectedAsset}
                logoUrl={config.logoUrl}
                onBack={() => changeAppScreen('detail')}
                onSubmit={handleCompleteHandover}
              />
            ) : appScreen === 'bast' && activeBastHandover ? (
              <BastPdfPreview
                handover={activeBastHandover}
                asset={assets.find(a => a.kode_aset === activeBastHandover.kode_aset)}
                logoUrl={config.logoUrl}
                onBack={() => changeAppScreen('detail')}
              />
            ) : (
              <FullInventoryView
                assets={assets}
                onSelectAsset={(code) => {
                  selectAsset(code);
                  changeAppScreen('detail');
                }}
                onAddNewManual={handleAddNewManual}
                onEditAsset={handleRequestEditAsset}
                onDeleteAsset={handleRequestDeleteAsset}
                onResetDemo={handleResetDemo}
                onClearAll={handleClearAll}
              />
            )}
          </div>
        )}

        {/* TAB 3: Batch Sticker Generator */}
        {activeMainTab === 'stickers' && (
          <QrBatchGenerator logoUrl={config.logoUrl} />
        )}

        {/* TAB 4: Google Sheets Live Sync Viewer */}
        {activeMainTab === 'sheets' && (
          <SheetsViewer
            assets={assets}
            handovers={handovers}
            logs={logs}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onEditAsset={handleRequestEditAsset}
            onDeleteAsset={handleRequestDeleteAsset}
            onRestoreBackup={handleRestoreBackup}
          />
        )}

        {/* TAB 5: Guide */}
        {activeMainTab === 'guide' && <TutorialGuide />}
      </main>

      {/* ================= STICKY MOBILE BOTTOM NAVIGATION BAR ================= */}
      {/* Thumb-friendly mobile navigation for phones */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-orange-500/20 z-40 md:hidden print:hidden px-2 py-1.5 shadow-2xl">
        <div className="grid grid-cols-4 gap-1 text-center">
          <button
            onClick={() => {
              changeMainTab('scan');
              changeAppScreen('scanner');
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition ${
              activeMainTab === 'scan'
                ? 'text-orange-400 font-bold bg-orange-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scan className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Scan QR</span>
          </button>

          <button
            onClick={() => {
              changeMainTab('inventory');
              changeAppScreen('scanner');
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition ${
              activeMainTab === 'inventory'
                ? 'text-orange-400 font-bold bg-orange-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Katalog ({assets.length})</span>
          </button>

          <button
            onClick={() => {
              changeMainTab('stickers');
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition ${
              activeMainTab === 'stickers'
                ? 'text-orange-400 font-bold bg-orange-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Label QR</span>
          </button>

          <button
            onClick={() => {
              changeMainTab('sheets');
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition ${
              activeMainTab === 'sheets'
                ? 'text-orange-400 font-bold bg-orange-500/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Database</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
