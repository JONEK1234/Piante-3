import React, { useState, useRef } from 'react';
import { X, Save, Edit3, Calendar, Tag, Upload, ImageIcon } from 'lucide-react';
import { Plant } from '../types';
import { PLANT_PRESETS } from '../presets';

interface EditPlantModalProps {
  plant: Plant;
  onClose: () => void;
  onSave: (updates: Partial<Plant>) => Promise<void>;
}

export default function EditPlantModal({ plant, onClose, onSave }: EditPlantModalProps) {
  const [name, setName] = useState(plant.name);
  const [nickname, setNickname] = useState(plant.nickname || '');
  const [category, setCategory] = useState<string>(plant.category || 'seme');
  const [startDate, setStartDate] = useState(plant.startDate);
  const [description, setDescription] = useState(plant.description || '');
  
  // Image editing states
  const [imageUrl, setImageUrl] = useState(plant.imageUrl || '');
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const compressAndSetPlantImage = (file: File) => {
    setIsUploading(true);
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Seleziona un file immagine valido.');
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
    if (!name.trim()) return;

    setSaving(true);
    setError('');
    try {
      const finalImg = activeTab === 'url' && customUrl ? customUrl : imageUrl;
      
      await onSave({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        category,
        startDate,
        description: description.trim() || undefined,
        imageUrl: finalImg
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Errore durante il salvataggio delle modifiche.');
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
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Modifica Informazioni Pianta</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plant Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Nome Pianta <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Soprannome
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                placeholder="Nessun soprannome"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Data d'Inizio <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-white/[0.1] rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer [color-scheme:dark]"
                />
                <Calendar className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Categoria / Origine <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer h-[34px]"
              >
                <option value="seme">🌱 Seme</option>
                <option value="talea">✂️ Talea</option>
                <option value="altro">🪴 Pianta adulta / Altro</option>
              </select>
            </div>
          </div>

          {/* Photo customizers for cover image */}
          <div className="border-t border-white/[0.04] pt-3.5 mt-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Sostituisci Foto Copertina Pianta <span className="text-slate-500 lowercase">(opzionale)</span>
            </label>

            <div className="flex border-b border-white/[0.08] mb-3 text-xs gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`pb-1 px-0.5 font-medium border-b-2 transition ${
                  activeTab === 'presets' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Presets 🌱
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-1 px-0.5 font-medium border-b-2 transition ${
                  activeTab === 'upload' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                File Locale 📁
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`pb-1 px-0.5 font-medium border-b-2 transition ${
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
                    className={`rounded border overflow-hidden aspect-square cursor-pointer ${
                      imageUrl === p.imageUrl ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-white/[0.05] hover:border-slate-500'
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
                      if (e.target.files && e.target.files[0]) compressAndSetPlantImage(e.target.files[0]);
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
                  (e.target as HTMLImageElement).src = plant.imageUrl;
                }}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded object-cover"
                alt=""
              />
              <span className="truncate">Anteprima della foto copertina modificata</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Descrizione o Appunti Botanici
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition placeholder-slate-500 resize-none font-normal"
            />
          </div>

          {error && (
            <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              {error}
            </p>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2 text-xs">
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
              disabled={saving}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg transition flex items-center gap-1 cursor-pointer shadow-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
