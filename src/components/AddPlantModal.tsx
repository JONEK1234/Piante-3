import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Sparkles, Upload, Calendar, AlertCircle } from 'lucide-react';
import { PLANT_PRESETS } from '../presets';
import { Plant } from '../types';

interface AddPlantModalProps {
  onClose: () => void;
  onSave: (plant: Omit<Plant, 'id' | 'ownerId' | 'ownerName' | 'createdAt'>) => Promise<void>;
}

export default function AddPlantModal({ onClose, onSave }: AddPlantModalProps) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [category, setCategory] = useState<'seme' | 'talea' | 'altro'>('seme');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(PLANT_PRESETS[0].imageUrl);
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Compress image on current client browser canvas to keep under 200KB for Firestore limits
  const compressAndSetImage = (file: File) => {
    setIsUploading(true);
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Per favore, seleziona un file immagine valido (PNG, JPG, WEBP).');
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

        // Constraint max dimensions
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

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

        // Convert to highly optimized JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImageUrl(compressedDataUrl);
        setIsUploading(false);
      };
      
      img.onerror = () => {
        setUploadError('Errore nel caricamento del file immagine.');
        setIsUploading(false);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setUploadError('Impossibile leggere il file selezionato.');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      compressAndSetImage(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      compressAndSetImage(e.dataTransfer.files[0]);
    }
  };

  const selectPreset = (url: string) => {
    setImageUrl(url);
    // Auto sync description if empty
    const matched = PLANT_PRESETS.find(p => p.imageUrl === url);
    if (matched && !description) {
      setDescription(matched.description);
    }
    if (matched && !name) {
      setName(matched.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setSubmitError('');
    try {
      const finalImg = activeTab === 'url' && customUrl ? customUrl : imageUrl;
      await onSave({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        startDate,
        description: description.trim() || undefined,
        imageUrl: finalImg,
        category: category
      });
      onClose();
    } catch (err: any) {
      console.error("Error saving plant inside modal:", err);
      let errMsg = 'Si è verificato un errore durante il salvataggio.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions'))) {
          errMsg = 'Permesso negato: Non sei autorizzato a pubblicare nel database oppure la sessione Google è scaduta.';
        } else if (parsed.error) {
          errMsg = `Errore di sincronizzazione: ${parsed.error}`;
        }
      } catch (e) {
        const rawMsg = err.message || '';
        if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
          errMsg = 'Permesso negato: Non sei autorizzato a pubblicare nel database.';
        } else if (rawMsg) {
          errMsg = rawMsg;
        }
      }
      setSubmitError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/[0.08] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Inizia un Nuovo Diario Botanico</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plant Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome della Pianta <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Ficus Elastica, Basilico, Monstera"
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Soprannome <span className="text-slate-500">(Opzionale)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="es. Rosy, Verde, Sprout"
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Data d'Inizio / Semina <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-white/[0.1] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer [color-scheme:dark]"
                />
                <Calendar className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tipo di Riproduzione / Categoria <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer h-[42px]"
              >
                <option value="seme">🌱 Seme</option>
                <option value="talea">✂️ Talea</option>
                <option value="altro">🪴 Pianta adulta / Altro</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Descrizione o Appunti Iniziali <span className="text-slate-500">(Opzionale)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fornisci qualche informazione: da dove arriva? Ha particolari esigenze di luce o acqua? Qual è il tuo obiettivo?"
              className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          {/* Image Chooser Block */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Seleziona la Foto di Copertina
            </label>

            {/* Image Source Tabs */}
            <div className="flex border-b border-white/[0.08] mb-4 gap-2 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`pb-2 px-1 font-medium transition border-b-2 ${
                  activeTab === 'presets' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Icone d'Autore
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-2 px-1 font-medium transition border-b-2 ${
                  activeTab === 'upload' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Carica File Miei 📁
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`pb-2 px-1 font-medium transition border-b-2 ${
                  activeTab === 'url' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                Link Immagine Web
              </button>
            </div>

            {/* Presets Tab View */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {PLANT_PRESETS.map((preset) => {
                    const isSelected = imageUrl === preset.imageUrl;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => selectPreset(preset.imageUrl)}
                        className={`group relative rounded-xl overflow-hidden border aspect-square flex flex-col justify-end text-left transition ${
                          isSelected ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-white/[0.08] hover:border-slate-500'
                        }`}
                      >
                        <img
                          src={preset.imageUrl}
                          referrerPolicy="no-referrer"
                          alt={preset.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                        <div className="relative p-2 z-10">
                          <p className="text-[10px] font-bold text-slate-100 truncate">{preset.name}</p>
                          <p className="text-[8px] font-mono italic text-emerald-400/80 truncate">{preset.scientificName}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {imageUrl && (
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
                    <img src={imageUrl} referrerPolicy="no-referrer" alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-400">IMMAGINE REGISTRATA</p>
                      <p className="text-xs text-slate-300 truncate max-w-md">Copertina abbinata dai Preset della Galleria</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Tab View */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-white/[0.1] hover:border-emerald-500/30 hover:bg-white/[0.01]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Trascina la foto qui oppure <span className="text-emerald-400 underline">sfoglia i file</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, WEBP fino a 5MB (verrà compressa automaticamente)</p>
                  </div>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {isUploading && (
                  <p className="text-xs text-slate-400 animate-pulse">⚙️ Ottimizzazione e compressione dell'immagine in corso...</p>
                )}

                {imageUrl && imageUrl.startsWith('data:') && (
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
                    <img src={imageUrl} referrerPolicy="no-referrer" alt="Uploaded Thumbnail" className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-400">IMMAGINE CARICATA E COMPRESSA 🟢</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-sm">Salva per archiviarla nel diario</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom URL Tab View */}
            {activeTab === 'url' && (
              <div className="space-y-3">
                <div>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... o qualsiasi link immagine"
                    className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                {(customUrl || imageUrl) && (
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
                    <img
                      src={customUrl || imageUrl}
                      referrerPolicy="no-referrer"
                      alt="Custom URL Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLANT_PRESETS[0].imageUrl;
                      }}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-400">ANTEPRIMA WEB LINK</p>
                      <p className="text-xs text-slate-300 truncate max-w-md">{customUrl || imageUrl}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {submitError && (
            <div className="flex items-start gap-2.5 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/15 p-3.5 rounded-xl">
              <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold block text-rose-300">Errore di Sincronizzazione</span>
                <span className="text-slate-300 block">{submitError}</span>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || isUploading}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-sm font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 border-t border-white/20"
            >
              {saving ? 'Creazione in corso...' : 'Salva Pianta 🌱'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
