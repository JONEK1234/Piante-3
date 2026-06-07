import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Share2,
  Plus,
  Trash2,
  Clock,
  Check,
  Copy,
  PlusCircle,
  Image as ImageIcon,
  Tag,
  Heart,
  Upload,
  AlertCircle,
  Leaf,
  Edit
} from 'lucide-react';
import { subscribeToLogs, addProgressLog, deleteProgressLog, updatePlant, updateProgressLog } from '../db';
import { Plant, ProgressLog, PLANT_STATUSES } from '../types';
import { PLANT_PRESETS } from '../presets';
import EditPlantPhotoModal from './EditPlantPhotoModal';
import PlantEditModal from './PlantEditModal';
import EditLogModal from './EditLogModal';
import ConfirmModal from './ConfirmModal';

interface PlantDetailProps {
  plant: Plant;
  currentUserUid?: string | null;
  isWriterAuthorized?: boolean;
  onBack: () => void;
  onImageClick?: (url: string) => void;
}

export default function PlantDetail({ plant, currentUserUid, isWriterAuthorized, onBack, onImageClick }: PlantDetailProps) {
  const isOwner = !!currentUserUid && plant.ownerId === currentUserUid;
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New Log form states
  const [showAddLog, setShowAddLog] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [logTime, setLogTime] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ProgressLog['status']>('in_crescita');
  const [imageUrl, setImageUrl] = useState(plant.imageUrl); // Fallbacks to plant's image as default
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [savingLog, setSavingLog] = useState(false);
  const [submitLogError, setSubmitLogError] = useState('');

  // Share system state
  const [copied, setCopied] = useState(false);
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [showEditPlantModal, setShowEditPlantModal] = useState(false);
  const [selectedEditLog, setSelectedEditLog] = useState<ProgressLog | null>(null);
  const [logToDeleteId, setLogToDeleteId] = useState<string | null>(null);

  const handleSavePlantUpdates = async (updates: Partial<Plant>) => {
    await updatePlant(plant.id, updates);
  };

  const handleSaveLogUpdates = async (updates: Partial<Omit<ProgressLog, 'id' | 'createdAt'>>) => {
    if (!selectedEditLog) return;
    try {
      await updateProgressLog(plant.id, selectedEditLog.id, updates);
    } catch (err: any) {
      console.error("Errore durante l'aggiornamento della nota:", err);
      throw err; // Propagate to EditLogModal to show within modal error alerts
    }
  };

  // Subscribe to real-time logs in useEffect
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToLogs(plant.id, (fetchedLogs) => {
      setLogs(fetchedLogs);
      setLoading(false);
    });
    return unsubscribe;
  }, [plant.id]);

  const handleShare = async () => {
    // Generate share link
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    const shareUrl = `${origin}${window.location.pathname}?plantId=${plant.id}`;
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        // Fallback alert with textarea for older/sandboxed iframe browsers
        prompt("Copia questo link e invialo alla tua amica:", shareUrl);
      }
    } catch (e) {
      prompt("Copia questo link e invialo alla tua amica:", shareUrl);
    }
  };

  const getStatusBadge = (logStatus: string) => {
    const matched = PLANT_STATUSES.find(s => s.value === logStatus);
    return matched || { label: logStatus, color: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  // Client-side image resizing/compression (under 200KB for firestore)
  const compressAndSetLogImage = (file: File) => {
    setIsUploading(true);
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Per favore seleziona un file immagine valido (PNG, JPG, WEBP).');
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

        const MAX_WIDTH = 640; // slightly smaller for logs to save space
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
        // Compressed JPEG at 65% quality is tiny and plenty of detail for log timeline
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        setImageUrl(compressedDataUrl);
        setIsUploading(false);
      };
      img.onerror = () => {
        setUploadError('File immagine non corretto.');
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      compressAndSetLogImage(e.target.files[0]);
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
      compressAndSetLogImage(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setSavingLog(true);
    setSubmitLogError('');
    try {
      const finalImg = activeTab === 'url' && customUrl ? customUrl : imageUrl;
      const now = new Date();
      const timeStr = logTime ? `${logTime}:00` : now.toTimeString().split(' ')[0]; // format HH:MM:SS
      const finalDateTime = `${date}T${timeStr}`;

      await addProgressLog(plant.id, {
        date: finalDateTime,
        imageUrl: finalImg,
        notes: notes.trim(),
        status
      });
      // Reset State
      setNotes('');
      setLogTime('');
      setSubmitLogError('');
      setShowAddLog(false);
    } catch (err: any) {
      console.error("Error saving progress log in PlantDetail:", err);
      let errMsg = 'Si è verificato un errore durante il salvataggio del progresso.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions'))) {
          errMsg = 'Permesso negato: Non sei autorizzato a pubblicare progressi per questa pianta (solo il proprietario può caricare aggiornamenti).';
        } else if (parsed.error) {
          errMsg = `Errore di sincronizzazione: ${parsed.error}`;
        }
      } catch (e) {
        const rawMsg = err.message || '';
        if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
          errMsg = 'Permesso negato: Non sei autorizzato a pubblicare progressi per questa pianta.';
        } else if (rawMsg) {
          errMsg = rawMsg;
        }
      }
      setSubmitLogError(errMsg);
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    setLogToDeleteId(logId);
  };

  const confirmDeleteLog = async () => {
    if (!logToDeleteId) return;
    const logId = logToDeleteId;
    setLogToDeleteId(null);
    try {
      await deleteProgressLog(plant.id, logId);
    } catch (err: any) {
      console.error("Errore durante l'eliminazione della nota:", err);
      const errMsg = err.message || '';
      if (errMsg.includes('permission-denied') || errMsg.includes('Missing or insufficient permissions')) {
        alert("Permesso negato: Solo il proprietario registrato di questa pianta può eliminare le note del diario.");
      } else {
        alert(`Impossibile eliminare la nota: ${errMsg || "Errore sconosciuto di sincronizzazione"}`);
      }
    }
  };

  const formattedPlantStartDate = new Date(plant.startDate).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" id="plant-details-screen">
      
      {/* Return & Subactions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-slate-900 border border-white/[0.08] hover:border-slate-500 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Indietro alla Galleria</span>
        </button>
      </div>

      {/* Main Grid: Left is Meta Card, Right is Progression Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: GENERAL INFO CARD & FORM (4 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Leaf Profile Card */}
          <div className="bg-slate-900 border border-white/[0.08] rounded-2xl p-6 overflow-hidden relative shadow-xl">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 mb-5 relative border border-white/[0.05] group/profile">
              <img
                src={plant.imageUrl}
                referrerPolicy="no-referrer"
                alt={plant.name}
                className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition"
                onClick={() => onImageClick?.(plant.imageUrl)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
              {isOwner && (
                <button
                  onClick={() => setShowEditPhotoModal(true)}
                  className="absolute bottom-3 right-3 bg-slate-950/80 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-bold font-mono uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-lg hover:scale-102"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Cambia Foto</span>
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5 uppercase tracking-wider font-mono">
                    Carta d'Identità
                  </span>
                  {plant.category && (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 rounded px-1.5 py-0.5 uppercase tracking-wider font-mono">
                      {plant.category === 'seme' ? '🌱 Seme' : plant.category === 'talea' ? '✂️ Talea' : '🪴 Altro'}
                    </span>
                  )}
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowEditPlantModal(true)}
                    className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold transition cursor-pointer"
                    title="Modifica informazioni pianta"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Modifica</span>
                  </button>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline gap-2">
                {plant.name}
                {plant.nickname && <span className="text-emerald-400 font-sans italic font-medium text-lg">"{plant.nickname}"</span>}
              </h2>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-2 font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Viaggio iniziato il {formattedPlantStartDate}</span>
              </div>

              {plant.description && (
                <div className="mt-4 bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl">
                  <p className="text-xs text-slate-300 leading-relaxed font-normal italic">
                    "{plant.description}"
                  </p>
                </div>
              )}

              <div className="mt-5 border-t border-white/[0.08] pt-4.5 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Botanico Custode</span>
                  <span className="text-white font-medium">{isOwner ? 'Tu (Proprietario)' : plant.ownerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Progressi Registrati</span>
                  <span className="text-emerald-400 font-bold font-mono">{logs.length} Capitoli 📑</span>
                </div>
              </div>
            </div>
          </div>



          {/* OWNER PANEL: FORM TO ADD NEW EVOLUTION LOGS */}
          {isOwner ? (
            <div className="bg-slate-900 border border-white/[0.08] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <PlusCircle className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                  <span>Aggiungi Capitolo Evolutivo</span>
                </h4>
                {!showAddLog && (
                  <button
                    onClick={() => setShowAddLog(true)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1 bg-emerald-400/5 hover:bg-emerald-400/15 border border-emerald-400/20 rounded-lg transition"
                  >
                    Scrivi Diario
                  </button>
                )}
              </div>

              {showAddLog && (
                <form onSubmit={handleSubmitLog} className="space-y-4 pt-1 transition">
                  
                  {/* Calendar / Date */}
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Data di questa Foto / Progresso <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Orario <span className="text-slate-500 font-mono">(Opzionale)</span>
                        </label>
                        <input
                          type="time"
                          value={logTime}
                          onChange={(e) => setLogTime(e.target.value)}
                          className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Healthy / Status Category slider */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Stadio Vitale di Oggi <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                    >
                      {PLANT_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Notes & Description text field */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Note Botaniche dell'Evoluzione <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Racconta cosa è cambiato: è spuntata una nuova foglia? È comparsa una radice? Hai irrigato? Ci sono boccioli?"
                      className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition placeholder-slate-500 resize-none font-normal"
                    />
                  </div>

                  {/* Image Chooser Area for Log */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Carica la Foto del Progresso</span>
                      <span className="text-[10px] text-slate-500 lowercase">(consigliato l'upload)</span>
                    </label>

                    {/* Source tab */}
                    <div className="flex border-b border-white/[0.08] mb-3 text-xs gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className={`pb-1 px-0.5 font-medium border-b ${
                          activeTab === 'upload' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                      >
                        Carica Foto Miei 📁
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('presets')}
                        className={`pb-1 px-0.5 font-medium border-b ${
                          activeTab === 'presets' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                      >
                        Presettate della Galleria
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('url')}
                        className={`pb-1 px-0.5 font-medium border-b ${
                          activeTab === 'url' ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent hover:text-slate-200'
                        }`}
                      >
                        Web Link
                      </button>
                    </div>

                    {/* Presets Grid */}
                    {activeTab === 'presets' && (
                      <div className="grid grid-cols-5 gap-1.5 mb-2 max-h-24 overflow-y-auto p-1 bg-white/[0.01] rounded">
                        {PLANT_PRESETS.map((p) => (
                          <button
                            key={p.imageUrl}
                            type="button"
                            onClick={() => setImageUrl(p.imageUrl)}
                            className={`rounded border overflow-hidden aspect-square ${
                              imageUrl === p.imageUrl ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-white/[0.05] hover:border-slate-500'
                            }`}
                          >
                            <img src={p.imageUrl} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Canvas drag-drop optimizer */}
                    {activeTab === 'upload' && (
                      <div className="space-y-2">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                            isDragging
                              ? 'border-emerald-400 bg-emerald-500/10'
                              : 'border-white/[0.1] hover:border-emerald-500/30'
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <Upload className="w-5 h-5 text-slate-400" />
                          <p className="text-[11px] font-medium text-slate-200">Trascina qui la foto progressi o fai click</p>
                        </div>
                        {uploadError && <p className="text-[10.5px] text-rose-400">{uploadError}</p>}
                        {isUploading && <p className="text-[10px] text-slate-400 animate-pulse">Ottimizzazione...</p>}
                      </div>
                    )}

                    {/* URL */}
                    {activeTab === 'url' && (
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-800 border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    )}

                    {/* Image Preview Indicator */}
                    <div className="mt-2.5 flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.04] p-1.5 rounded-lg text-[10px] text-slate-300">
                      <img
                        src={activeTab === 'url' && customUrl ? customUrl : imageUrl}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = plant.imageUrl;
                        }}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded object-cover"
                        alt=""
                      />
                      <span className="truncate">Anteprima foto capitolo da registrare</span>
                    </div>

                  </div>

                  {submitLogError && (
                    <div className="flex items-start gap-2 text-rose-400 text-[11px] bg-rose-500/10 border border-rose-500/15 p-3 rounded-xl">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-rose-300">Errore di Pubblicazione</span>
                        <span className="text-slate-300 block leading-relaxed">{submitLogError}</span>
                      </div>
                    </div>
                  )}

                  {/* Submission buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setShowAddLog(false)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={savingLog || !notes.trim() || isUploading}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-black rounded-lg transition flex items-center gap-1"
                    >
                      {savingLog ? 'Salvataggio...' : 'Salva Capitolo 🌱'}
                    </button>
                  </div>

                </form>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-white/[0.08] rounded-2xl p-5 shadow-xl text-center">
              <span className="text-xs text-slate-400">
                🔒 Sei in <b>Visualizzazione Ospite</b>. Solo il proprietario registrato di questa pianta può aggiungere foto ed annotazioni del diario evolutivo.
              </span>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: GORGEOUS TIMELINE (7 Cols) */}
        <div className="lg:col-span-7">
          
          <div className="bg-slate-900 border border-white/[0.08] rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-black text-white tracking-tight mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Diario dell'Evoluzione Cronologico</span>
            </h3>

            {loading ? (
              <div className="py-16 text-center space-y-2">
                <Leaf className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <p className="text-xs text-slate-400 animate-pulse">Mappatura dei capitoli cronologici in corso...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center space-y-5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                <Plus className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="max-w-xs mx-auto">
                  <h4 className="text-sm font-semibold text-white mb-1">Nessun capitolo registrato</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nessuna foto di progresso è ancora stata caricata per questa pianta. 
                    {isOwner ? " Carica il tuo primo progresso per iniziare la timeline di fioritura!" : " Il proprietario pubblicherà a breve i primi progressi botanici."}
                  </p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowAddLog(true)}
                    className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black px-4 py-2 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Carica la Prima Foto</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="relative pl-6 lg:pl-10 space-y-8">
                
                {/* Visual Connector Timeline Vertical Thread Line string */}
                <div className="absolute left-[11px] lg:left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500/80 via-emerald-500/30 to-indigo-500/10" />

                {/* Timeline loops */}
                {logs.map((log, index) => {
                  const badge = getStatusBadge(log.status);
                  const logDateObj = new Date(log.date);
                  const formattedLogDate = logDateObj.toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });
                  const formattedLogTime = log.date.includes('T') || logDateObj.getHours() !== 0 || logDateObj.getMinutes() !== 0
                    ? logDateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                    : null;

                  return (
                    <div key={log.id} className="relative group/item" id={`log-item-${log.id}`}>
                      
                      {/* Timeline Dot Bulb */}
                      <div className="absolute -left-[24px] lg:-left-[32px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500 shadow-xl group-hover/item:scale-125 group-hover/item:bg-emerald-400 transition" />

                      {/* Timeline Post Details */}
                      <div className="bg-white/[0.02] border border-white/[0.05] hover:border-emerald-400/20 rounded-2xl p-5 hover:bg-white/[0.03] transition duration-200">
                        
                        {/* Information Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono">
                              {formattedLogDate} {formattedLogTime && `alle ${formattedLogTime}`}
                            </span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span className={`text-[10px] font-semibold font-mono border rounded px-2 py-0.5 ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>

                          {/* Owner Log actions */}
                          {isOwner && (
                            <div className="flex items-center gap-1.5 opacity-100 lg:opacity-60 lg:group-hover/item:opacity-100 transition duration-150 bg-slate-950/40 px-2 py-0.5 rounded-xl border border-white/[0.03]">
                              <button
                                onClick={() => setSelectedEditLog(log)}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:scale-110 transition-all rounded hover:bg-emerald-500/10 cursor-pointer"
                                title="Modifica questa nota"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:scale-110 transition-all rounded hover:bg-rose-500/10 cursor-pointer"
                                title="Rimuovi questo capitolo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Flex Container for log content (photo + description) */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                          
                          {/* Progress Photo snapshot */}
                          <div className="sm:col-span-5 aspect-square rounded-xl overflow-hidden bg-slate-950 border border-white/[0.08] relative group/photo">
                            <img
                              src={log.imageUrl}
                              referrerPolicy="no-referrer"
                              alt="Progress Photo"
                              className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition group-hover/photo:scale-105 duration-300"
                              onClick={() => onImageClick?.(log.imageUrl)}
                            />
                          </div>

                          {/* Captions and Notes */}
                          <div className="sm:col-span-7 flex flex-col justify-start">
                            <h5 className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider mb-2 font-mono flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-emerald-400" />
                              <span>ANNOTAZIONI EVOLUZIONE</span>
                            </h5>
                            <p className="text-xs sm:text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-line bg-slate-950/30 p-3.5 rounded-xl border border-white/[0.03]">
                              {log.notes}
                            </p>
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}

                {/* Growth Complete Signpost indicator */}
                <div className="text-center pt-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.02] border border-white/[0.05] rounded-full text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                    <Heart className="w-3 h-3 text-rose-500" />
                    <span>Inizio del viaggio botanico</span>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {showEditPhotoModal && (
        <EditPlantPhotoModal
          plant={plant}
          onClose={() => setShowEditPhotoModal(false)}
          onUpdatePhoto={async (newImageUrl) => {
            await updatePlant(plant.id, { imageUrl: newImageUrl });
          }}
        />
      )}

      {showEditPlantModal && (
        <PlantEditModal
          plant={plant}
          onClose={() => setShowEditPlantModal(false)}
          onSave={handleSavePlantUpdates}
        />
      )}

      {selectedEditLog && (
        <EditLogModal
          log={selectedEditLog}
          onClose={() => setSelectedEditLog(null)}
          onSave={handleSaveLogUpdates}
        />
      )}

      <ConfirmModal
        isOpen={!!logToDeleteId}
        title="Elimina Nota?"
        message="Sei sicuro di voler eliminare questo aggiornamento dal diario della pianta? Questa operazione non può essere annullata."
        confirmText="Sì, elimina"
        cancelText="Annulla"
        type="danger"
        onConfirm={confirmDeleteLog}
        onCancel={() => setLogToDeleteId(null)}
      />

    </div>
  );
}
