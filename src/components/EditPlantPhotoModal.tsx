import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Sparkles, Upload, AlertCircle, Check } from 'lucide-react';
import { PLANT_PRESETS } from '../presets';
import { Plant } from '../types';

interface EditPlantPhotoModalProps {
  plant: Plant;
  onClose: () => void;
  onUpdatePhoto: (newImageUrl: string) => Promise<void>;
}

export default function EditPlantPhotoModal({ plant, onClose, onUpdatePhoto }: EditPlantPhotoModalProps) {
  const [imageUrl, setImageUrl] = useState(plant.imageUrl);
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Browser-side canvas image compression to keep photo sizes optimal for database limits
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

        // Constraint max dimensions for nice cover styling
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
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSubmitError('');
    try {
      const finalImg = activeTab === 'url' && customUrl ? customUrl : imageUrl;
      if (!finalImg) {
        throw new Error("Seleziona o carica una foto prima di salvare.");
      }
      await onUpdatePhoto(finalImg);
      onClose();
    } catch (err: any) {
      console.error("Error updating plant photo inside modal:", err);
      let errMsg = 'Si è verificato un errore durante l\'aggiornamento.';
      const rawMsg = err?.message || '';
      if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
        errMsg = 'Permesso negato: Non sei autorizzato a modificare la foto (solo il proprietario può farlo).';
      } else if (rawMsg) {
        errMsg = rawMsg;
      }
      setSubmitError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fadeIn">
      <div 
        className="bg-slate-900 border border-white/[0.08] w-full max-w-xl rounded-2xl shadow-2xl flex flex-col pointer-events-auto max-h-[90vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
        id="edit-photo-modal-card"
      >
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Modifica Foto di Copertina</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Sostituisci l'immagine principale per {plant.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 px-2 text-slate-400 hover:text-white hover:bg-white/[0.04] transition rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Active Copertina Preview Banner */}
          <div className="space-y-2">
            <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Anteprima Immagine Corrente
            </span>
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-white/[0.06] shadow-inner group">
              <img 
                src={activeTab === 'url' && customUrl ? customUrl : imageUrl} 
                onError={(e) => {
                  // Fallback for broken/error URLs
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?auto=format&fit=crop&q=80&w=640';
                }}
                referrerPolicy="no-referrer" 
                alt="preview copertina" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-slate-950/20" />
              <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-lg text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>NUOVO LOOK</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">
              Filtra Origini Foto
            </label>

            {/* Source tabs */}
            <div className="flex border-b border-white/[0.06] mb-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`pb-2 px-2.5 font-bold font-mono transition border-b-2 ${
                  activeTab === 'presets' ? 'text-emerald-400 border-emerald-400 bg-emerald-400/[0.02]' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                GALLERIA PRESET
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className={`pb-2 px-2.5 font-bold font-mono transition border-b-2 ${
                  activeTab === 'upload' ? 'text-emerald-400 border-emerald-400 bg-emerald-400/[0.02]' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                CARICA FOTO DA DISPOSITIVO
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`pb-2 px-2.5 font-bold font-mono transition border-b-2 ${
                  activeTab === 'url' ? 'text-emerald-400 border-emerald-400 bg-emerald-400/[0.02]' : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                LINK IMMAGINE WEB
              </button>
            </div>

            {/* Presets Grid */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {PLANT_PRESETS.map((preset) => {
                    const isSelected = imageUrl === preset.imageUrl;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => selectPreset(preset.imageUrl)}
                        className={`group relative rounded-xl overflow-hidden border aspect-video flex flex-col justify-end text-left transition ${
                          isSelected ? 'border-emerald-400 ring-2 ring-emerald-500/25' : 'border-white/[0.08] hover:border-slate-500'
                        }`}
                      >
                        <img
                          src={preset.imageUrl}
                          referrerPolicy="no-referrer"
                          alt={preset.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
                        <div className="relative p-1.5 z-10">
                          <p className="text-[9px] font-bold text-slate-100 truncate">{preset.name}</p>
                          <p className="text-[7.5px] font-mono italic text-emerald-400/80 truncate">{preset.scientificName}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload form */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6.5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-white/[0.08] hover:border-emerald-500/30 hover:bg-white/[0.01]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Upload className={`w-7 h-7 ${isDragging ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Trascina la foto qui o <span className="text-emerald-400 underline">sfoglia i file locale</span>
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1">PNG, JPG, WEBP compressi automaticamente per ottimizzare spazio</p>
                  </div>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 text-rose-400 text-[10px] bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {isUploading && (
                  <p className="text-[10px] text-slate-400 animate-pulse font-mono">⚙️ Compressione e adattamento pixel in corso...</p>
                )}
              </div>
            )}

            {/* Custom URL form */}
            {activeTab === 'url' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-sans font-medium text-slate-400 mb-1">
                    Indirizzo URL dell'immagine Web
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  💡 Incolla un link valido per visualizzare subito la copertina di questa pianta. Se il server non consente l'accesso alle immagini esterne, la copertina tornerà su un'immagine naturale generica.
                </p>
              </div>
            )}

          </div>

          {/* Submit error label */}
          {submitError && (
            <div className="flex items-start gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/15 p-3 rounded-xl">
              <AlertCircle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold block text-rose-300">Errore Sincronizzazione</span>
                <span className="text-slate-300 block">{submitError}</span>
              </div>
            </div>
          )}

          {/* Controls Footer */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="bg-slate-800 hover:bg-slate-700 hover:text-white transition text-slate-300 text-xs font-black px-4.5 py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || isUploading}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1 cursor-pointer border-t border-white/20 shadow-md shadow-emerald-500/10"
            >
              {saving ? (
                <>⚙️ Salvataggio...</>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-2" />
                  <span>Salva Nuova Foto</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
