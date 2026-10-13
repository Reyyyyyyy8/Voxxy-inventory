import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  SwitchCamera, 
  Upload, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Keyboard
} from 'lucide-react';

interface CameraScannerProps {
  onScanSuccess: (decodedCode: string) => void;
  onSwitchToManual?: () => void;
  onClose?: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  onSwitchToManual,
  onClose
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper untuk mengekstrak kode aset dari teks atau URL
  const extractAssetCode = (decodedText: string): string => {
    try {
      if (decodedText.includes('code=')) {
        const url = new URL(decodedText.startsWith('http') ? decodedText : `http://${decodedText}`);
        const codeParam = url.searchParams.get('code');
        if (codeParam) return codeParam.trim().toUpperCase();
      }
    } catch {
      // bukan URL, abaikan
    }

    const match = decodedText.match(/(\d{3,4}-[A-Za-z0-9]+-[A-Za-z0-9]+)/);
    if (match) {
      return match[1].toUpperCase();
    }

    return decodedText.trim().toUpperCase();
  };

  const handleDecoded = (decodedText: string) => {
    const assetCode = extractAssetCode(decodedText);
    setScannedResult(assetCode);

    // Audio beep konfirmasi
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start();
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 150);
    } catch {
      // Ignore audio error
    }

    stopCamera().then(() => {
      setTimeout(() => {
        onScanSuccess(assetCode);
      }, 300);
    });
  };

  const startCamera = async (cameraId?: string) => {
    setIsStarting(true);
    setErrorMessage(null);

    try {
      // Inisialisasi scanner jika belum ada
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Gunakan akselerasi hardware ponsel untuk tembus pantulan solasi
          }
        });
      }

      const qrScanner = html5QrCodeRef.current;

      if (qrScanner.isScanning) {
        await qrScanner.stop();
      }

      // Dapatkan daftar kamera jika didukung
      let targetCameraConfig: any = { facingMode: 'environment' };

      try {
        const availableDevices = await Html5Qrcode.getCameras();
        if (availableDevices && availableDevices.length > 0) {
          setCameras(availableDevices);
          const preferredCamera = cameraId || (
            availableDevices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('belakang') ||
              d.label.toLowerCase().includes('environment')
            )?.id || availableDevices[0].id
          );
          setSelectedCameraId(preferredCamera);
          targetCameraConfig = preferredCamera;
        }
      } catch (e) {
        // Fallback default facingMode
        targetCameraConfig = { facingMode: 'environment' };
      }

      await qrScanner.start(
        targetCameraConfig,
        {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(200, Math.floor(minEdge * 0.78));
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: 'environment'
          }
        },
        (decodedText) => handleDecoded(decodedText),
        () => {
          // Frame scanner loop
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err: any) {
      console.warn('Izin kamera / status:', err);
      setIsScanning(false);

      const errString = (err?.message || err?.name || String(err)).toLowerCase();
      if (
        errString.includes('permission denied') || 
        errString.includes('notallowederror') || 
        errString.includes('permission')
      ) {
        setHasPermission(false);
        setErrorMessage(
          'Izin kamera belum diberikan oleh browser. Silakan klik ikon gembok / kamera di address bar browser untuk memberi izin (Allow Camera), atau gunakan opsi Upload Foto QR di bawah.'
        );
      } else {
        setErrorMessage(
          err?.message || 'Tidak dapat memulai kamera pada perangkat ini. Silakan coba opsi Upload Foto.'
        );
      }
    } finally {
      setIsStarting(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }
    setIsScanning(false);
  };

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextCamera = cameras[(currentIndex + 1) % cameras.length];
    setSelectedCameraId(nextCamera.id);
    await startCamera(nextCamera.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }
      const qrScanner = html5QrCodeRef.current;
      const decodedText = await qrScanner.scanFile(file, true);
      handleDecoded(decodedText);
    } catch (err: any) {
      setErrorMessage('Tidak ditemukan QR Code yang valid pada foto tersebut. Pastikan gambar QR jelas dan fokus.');
    }
  };

  // Mulai kamera otomatis saat dibuka
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Viewfinder Video Container */}
      <div className="relative rounded-2xl bg-black overflow-hidden border-2 border-indigo-500/50 shadow-2xl min-h-[300px] flex items-center justify-center">
        {/* Kontainer HTML5 QR Code */}
        <div id="qr-reader-container" className="w-full max-w-sm h-full" />

        {/* Loading Spinner saat menginisialisasi kamera */}
        {isStarting && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-300">Menghubungkan ke kamera perangkat...</p>
          </div>
        )}

        {/* Overlay Animasi Laser Scanning saat kamera aktif */}
        {isScanning && !scannedResult && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative w-56 h-56 border-2 border-dashed border-indigo-400/80 rounded-2xl flex items-center justify-center">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1 rounded-br-lg"></div>
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400 animate-pulse"></div>
            </div>
            <p className="text-[11px] text-cyan-300 font-mono mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur">
              Arahkan kamera ke stiker QR fisik
            </p>
          </div>
        )}

        {/* Scan Sukses Popup */}
        {scannedResult && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2 animate-in zoom-in duration-150">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-sm text-slate-300">QR Code Berhasil Terbaca!</div>
            <div className="text-lg font-mono font-bold text-white bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700">
              {scannedResult}
            </div>
          </div>
        )}

        {/* Error / Permission Denied State */}
        {errorMessage && !isScanning && !isStarting && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <CameraOff className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Akses Kamera Ditolak / Dibatasi</h4>
            <p className="text-xs text-rose-300/90 max-w-sm leading-relaxed">
              {errorMessage}
            </p>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 text-left space-y-1.5 max-w-sm">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" /> Cara Mengizinkan Kamera:
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>Klik ikon gembok / pengaturan situs di address bar browser Anda.</li>
                <li>Ubah pengaturan <strong>Camera (Kamera)</strong> menjadi <strong>Allow (Izinkan)</strong>.</li>
                <li>Klik tombol <em>Coba Nyalakan Lagi</em> di bawah.</li>
              </ol>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => startCamera(selectedCameraId)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" /> Coba Nyalakan Lagi
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Foto QR dari Galeri
              </button>

              {onSwitchToManual && (
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-indigo-400 border border-indigo-500/30 transition flex items-center gap-1.5"
                >
                  <Keyboard className="h-3.5 w-3.5" /> Ketik Kode Manual
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Kontrol Tambahan Kamera */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <SwitchCamera className="h-3.5 w-3.5" /> Ganti Kamera ({cameras.length})
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" /> Scan dari Galeri
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            Tutup Kamera
          </button>
        )}
      </div>

      {/* Panduan Anti-Pantulan Solasi / Lakban Bening */}
      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-400">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-400" /> 
          <span>Tips Jika Stiker Ditutup Solasi / Lakban Bening:</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="font-bold text-amber-300 block mb-0.5">1. Miringkan Kamera 20°</span>
            <span className="text-slate-400 text-[10px]">
              Jangan tegak lurus 90° agar kilau pantulan lampu neon tidak menutupi kotak hitam QR.
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="font-bold text-amber-300 block mb-0.5">2. Jarak 15 - 25 cm</span>
            <span className="text-slate-400 text-[10px]">
              Beri jarak sedikit agar fokus kamera tajam dan tidak blur oleh ketebalan plastik solasi.
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="font-bold text-amber-300 block mb-0.5">3. Geser Titik Silau</span>
            <span className="text-slate-400 text-[10px]">
              Gerakkan HP sedikit hingga titik putih pantulan lampu berada di luar 3 kotak sudut QR.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
