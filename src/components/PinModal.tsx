import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Check, X } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  configuredPin?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Verifikasi Otorisasi Admin',
  description = 'Masukkan 6 digit PIN untuk otorisasi tindakan di Voxxy Media Indonesia.',
  configuredPin = ''
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 6) {
        verify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const verify = (inputPin: string) => {
    if (inputPin === configuredPin) {
      setError('');
      onSuccess();
      setPin('');
    } else {
      setError('PIN tidak valid. Silakan coba kembali.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-orange-500/30 p-6 shadow-2xl shadow-orange-950/40 text-center space-y-5">
        <div className="flex justify-between items-start">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 border border-orange-400/40 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Lock className="h-6 w-6" />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white -mr-2 -mt-2 p-1.5 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>

        {/* PIN Indicators with Orange Glow */}
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3, 4, 5].map(idx => (
            <div
              key={idx}
              className={`h-3.5 w-3.5 rounded-full border transition-all ${
                pin.length > idx
                  ? 'bg-gradient-to-r from-orange-500 to-amber-400 border-orange-400 scale-110 shadow-lg shadow-orange-500/60'
                  : 'bg-slate-950 border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad with Blue/Slate base and Orange hover */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-xl bg-slate-800/90 hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 active:scale-95 text-lg font-bold text-white transition-all border border-slate-700/60 hover:border-orange-400/50 hover:shadow-md hover:shadow-orange-500/20"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition-all border border-slate-800"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-slate-800/90 hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 active:scale-95 text-lg font-bold text-white transition-all border border-slate-700/60 hover:border-orange-400/50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-rose-400 transition-all border border-slate-800"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};
