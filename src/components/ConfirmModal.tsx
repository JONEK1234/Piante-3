import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  type = 'danger',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getColorTheme = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500/20'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500/20'
        };
      default:
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500/20'
        };
    }
  };

  const theme = getColorTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div 
        className="relative bg-slate-900 border border-white/[0.08] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
        id="custom-confirm-modal"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-4 ${theme.iconBg}`}>
          {type === 'danger' ? (
            <Trash2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>

        <h3 className="text-base font-bold text-white mb-2 tracking-tight">
          {title}
        </h3>
        
        <p className="text-xs text-slate-400 leading-relaxed mb-6 font-normal">
          {message}
        </p>

        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl border border-white/[0.05] transition cursor-pointer"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-xs font-semibold rounded-xl transition focus:ring-4 focus:outline-none cursor-pointer ${theme.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
