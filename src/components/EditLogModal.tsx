import React, { useState, useRef } from 'react';
import { X, Save, Upload, ImageIcon, AlertCircle } from 'lucide-react';
import { ProgressLog, PLANT_STATUSES } from '../types';
import { PLANT_PRESETS } from '../presets';

interface EditLogModalProps {
  log: ProgressLog;
  onClose: () => void;
  onSave: (updates: Partial<Omit<ProgressLog, 'id' | 'createdAt'>>) => Promise<void>;
}

export default function EditLogModal({ log, onClose, onSave }: EditLogModalProps) {
  const [date, setDate] = useState(log.date ? log.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const initialTime = log.date && log.date.includes('T') ? log.date.split('T')[1].substring(0, 5) : '';
  const [logTime, setLogTime] = useState(initialTime);
  const [notes, setNotes] = useState(log.notes);
  const [status, setStatus] = useState<ProgressLog['status']>(log.status);
  const [imageUrl, setImageUrl] = useState(log.imageUrl);
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Handle client-side fast resizing
  const compressAndSetLogImage = (file: File) => {
    setIsUploading(true);
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Per favore seleziona un file immagine valido.');
      setIsUploading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 640;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploadError('Impossibile elaborare l\'immagine.');
          setIsUploading(false);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        setImageUrl(compressedDataUrl);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setSaving(true);
    setError('');
    try {
      const finalImg = activeTab === 'url' && customUrl ? customUrl : imageUrl;
      
      const now = new Date();
      const timeStr = logTime ? `${logTime}:00` : now.toTimeString().split(' ')[0]; // HH:MM:SS
      const finalDateTime = `${date}T${timeStr}`;

      await onSave({
        date: finalDateTime,
        notes: notes.trim(),
        status,
        imageUrl: finalImg
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Si è verificato un errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/[0.08] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h3 className="text-base font-bold text-white">Modifica Capitolo del Diario</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Data Capitolo
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition [color-scheme:dark] cursor-pointer"
              />
            </div>

            {/* Custom Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Orario <span className="text-slate-500 font-mono">(Opzionale)</span>
              </label>
              <input
                type="time"
                value={logTime}
                onChange={(e) => setLogTime(e.target.value)}
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition [color-scheme:dark] cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Stato di Oggi
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition h-[34px] cursor-pointer"
              >
                {PLANT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Note ed Annotazioni Botaniche <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition resize-none font-normal"
            />
          </div>

          {/* Photo customizers */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Sostituisci la Foto d'Evoluzione <span className="text-slate-500 lowercase">(opzionale)</span>
            </label>

            <div className="flex border-b border-white/[0.08] mb-3 text-xs gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`pb-1 px-0.5 font-medium border-b-2 ${
                  activeTab === 'presets' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Galleria
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-1 px-0.5 font-medium border-b-2 ${
                  activeTab === 'upload' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                File Locale 📁
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`pb-1 px-0.5 font-medium border-b-2 ${
                  activeTab === 'url' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Web URL
              </button>
            </div>

            {/* Config views */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-5 gap-1.5 mb-2 max-h-20 overflow-y-auto p-1 bg-white/[0.01] rounded">
                {PLANT_PRESETS.map((p) => (
                  <button
                    key={p.imageUrl}
                    type="button"
                    onClick={() => setImageUrl(p.imageUrl)}
                    className={`rounded border overflow-hidden aspect-square ${
                      imageUrl === p.imageUrl ? 'border-emerald-400 ring-2' : 'border-white/[0.05] hover:border-slate-500'
                    }`}
                  >
                    <img src={p.imageUrl} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="space-y-1.5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/[0.1] hover:border-emerald-500/30 rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-center gap-1.5 text-xs text-slate-300"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) compressAndSetLogImage(e.target.files[0]);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <span>🔄 Carica un file immagine per sostituire</span>
                </div>
                {uploadError && <p className="text-[10px] text-rose-400">{uploadError}</p>}
                {isUploading && <p className="text-[10px] text-slate-400 animate-pulse">Ottimizzazione...</p>}
              </div>
            )}

            {activeTab === 'url' && (
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 transition"
              />
            )}

            <div className="mt-2.5 flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.04] p-1.5 rounded-lg text-[10px] text-slate-300">
              <img
                src={activeTab === 'url' && customUrl ? customUrl : imageUrl}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = log.imageUrl;
                }}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded object-cover"
                alt=""
              />
              <span className="truncate">Anteprima della foto modificata del capitolo</span>
            </div>

          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2.5 text-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !notes.trim() || isUploading}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg transition flex items-center gap-1 cursor-pointer shadow-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Salvataggio...' : 'Aggiorna Capitolo'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
