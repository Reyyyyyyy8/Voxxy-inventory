import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  assetCode: string | null;
  assetName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  assetCode,
  assetName,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !assetCode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl shadow-rose-950/40 text-center space-y-5">
        <div className="flex justify-between items-start">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 border border-rose-400/40 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
            <Trash2 className="h-6 w-6" />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white -mr-2 -mt-2 p-1.5 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Hapus Unit dari Inventaris?</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Anda akan menghapus unit <strong className="text-orange-400 font-mono">{assetCode}</strong>
            {assetName ? ` (${assetName})` : ''} dari database. Tindakan ini akan dicatat di log audit.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2 text-left">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>Pastikan unit fisik benar-benar telah diafkir atau dikeluarkan dari kantor.</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition"
          >
            Ya, Hapus Data
          </button>
        </div>
      </div>
    </div>
  );
};
