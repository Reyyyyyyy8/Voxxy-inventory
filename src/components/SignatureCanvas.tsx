import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, CheckCircle, Edit3 } from 'lucide-react';

interface SignatureCanvasProps {
  label: string;
  sublabel?: string;
  onSave: (dataUrl: string) => void;
  defaultValue?: string;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  label,
  sublabel,
  onSave,
  defaultValue = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!defaultValue);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0284c7'; // Vibrant ink blue

    if (defaultValue && defaultValue.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = defaultValue;
    }
  }, [defaultValue]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width * 2, rect.height * 2);
    setHasDrawn(false);
    onSave('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-slate-200 block">{label}</label>
          {sublabel && <span className="text-[11px] text-slate-400">{sublabel}</span>}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/30 border border-rose-900/40 hover:bg-rose-950/60 transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Ulangi TTD
        </button>
      </div>

      <div className="relative border-2 border-dashed border-slate-700 hover:border-orange-500/50 rounded-2xl bg-slate-900/90 overflow-hidden touch-none select-none shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 md:h-40 cursor-crosshair block touch-none"
        />

        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 p-4 text-center">
            <Edit3 className="h-5 w-5 text-orange-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Tanda Tangan dengan Jari di Kotak Ini</span>
            <span className="text-[10px] text-slate-500">Layar sentuh HP / Stylus / Mouse</span>
          </div>
        )}

        {hasDrawn && (
          <div className="pointer-events-none absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/90 px-2.5 py-1 rounded-lg border border-emerald-800 shadow-md">
            <CheckCircle className="h-3.5 w-3.5" /> Terekam Sah
          </div>
        )}
      </div>
    </div>
  );
};
