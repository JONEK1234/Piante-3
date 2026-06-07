import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Info, Sparkles, Sprout } from 'lucide-react';
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  isFirebaseMock
} from '../firebase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }) => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleIframeWarning, setGoogleIframeWarning] = useState(false);

  const translateAuthError = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'L\'indirizzo email inserito non è nel formato corretto.';
      case 'auth/user-disabled':
        return 'Questa utenza email è stata sospesa.';
      case 'auth/user-not-found':
        return 'Nessun account registrato con questa email. Passa al tab "Registrati"!';
      case 'auth/wrong-password':
        return 'Password inserita non corretta. Riprova.';
      case 'auth/email-already-in-use':
        return 'Esiste già un account con questo indirizzo email.';
      case 'auth/weak-password':
        return 'La password deve contenere almeno 6 caratteri.';
      case 'auth/operation-not-allowed':
        return 'L\'accesso tramite email e password non è abilitato in console.';
      default:
        return 'Impossibile accedere. Verifica le tue credenziali o prova l\'accesso con email.';
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleIframeWarning(false);
    
    if (isFirebaseMock) {
      const demoUser = {
        uid: 'demo_owner',
        displayName: 'Giardiniere',
        email: 'loliodioliva231@gmail.com',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      };
      onSuccess(demoUser);
      onClose();
      return;
    }

    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onSuccess({
          uid: result.user.uid,
          displayName: result.user.displayName || result.user.email,
          email: result.user.email,
          photoURL: result.user.photoURL,
        });
        onClose();
      }
    } catch (err: any) {
      console.error("Popup credentials error:", err);
      // Frequently blocked in iframes
      if (err.message && (err.message.includes('popup-blocked') || err.message.includes('closed-by-user') || err.message.includes('sandbox'))) {
        setGoogleIframeWarning(true);
      } else {
        setError('L\'accesso Google è stato rifiutato o annullato.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setError('');
    setLoading(true);

    if (isFirebaseMock) {
      // In Mock Mode, authenticate client-side demo account easily
      const fakeUser = {
        uid: 'offline_user_' + email.replace(/[^a-zA-Z0-9]/g, ''),
        displayName: displayName.trim() || email.split('@')[0],
        email: email.trim(),
        photoURL: null
      };
      onSuccess(fakeUser);
      onClose();
      setLoading(false);
      return;
    }

    try {
      if (activeTab === 'signin') {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (credential.user) {
          onSuccess({
            uid: credential.user.uid,
            displayName: credential.user.displayName || credential.user.email,
            email: credential.user.email,
            photoURL: credential.user.photoURL,
          });
          onClose();
        }
      } else {
        // Sign up flow
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (credential.user) {
          await updateProfile(credential.user, {
            displayName: displayName.trim() || email.split('@')[0]
          });
          onSuccess({
            uid: credential.user.uid,
            displayName: displayName.trim() || credential.user.email,
            email: credential.user.email,
            photoURL: credential.user.photoURL,
          });
          onClose();
        }
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      const code = err.code || '';
      setError(translateAuthError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fadeIn">
      
      {/* Modal Card */}
      <div 
        className="bg-slate-900 border border-white/[0.08] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
        id="auth-modal-card"
      >
        
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Area Riservata Custodi</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Gestisci i tuoi diari botanici e fioriture</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/[0.04]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/[0.05]">
          <button
            onClick={() => { setActiveTab('signin'); setError(''); }}
            className={`flex-1 py-3 text-center text-xs font-bold font-mono transition ${
              activeTab === 'signin' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/[0.02]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ACCEDI
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={`flex-1 py-3 text-center text-xs font-bold font-mono transition ${
              activeTab === 'signup' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/[0.02]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            REGISTRATI
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Third-party Google Login */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 text-xs font-bold py-2.5 rounded-xl transition shadow-md shadow-emerald-500/5 cursor-pointer"
            >
              <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.92 3.04C6.35 7.37 8.93 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.46C17.9 16.14 15.44 19 12 19c-3.07 0-5.65-2.33-6.58-5.5L1.5 16.54C3.39 20.35 7.35 23 12 23c6.08 0 11-4.92 11-11c0-.25-.01-.5-.02-.73z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.42 13.5c-.24-.71-.38-1.47-.38-2.5s.14-1.79.38-2.5L1.5 5.46C.54 7.38 0 9.5 0 12s.54 4.62 1.5 6.54l3.92-3.04z"
                />
                <path
                  fill="#34A853"
                  d="M12 19c3.44 0 5.9-2.86 6.46-4.76h-6.46V12.27h11.29c.14.73.2 1.52.2 2.36c0 6.08-4.92 11-11 11c-4.65 0-8.61-2.65-10.5-6.46l3.92-3.04C5.65 16.67 8.93 19 12 19z"
                />
              </svg>
              <span>Accedi con Google</span>
            </button>

            {googleIframeWarning && (
              <div className="flex items-start gap-2.5 text-amber-400 text-[10px] bg-amber-500/10 border border-amber-500/15 p-3 rounded-lg leading-relaxed">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300">Nota sull'Iframe di Sviluppo</p>
                  <p className="text-slate-300">
                    I blocchi sui popup del browser impediscono il completamento di Google all'interno dell'iframe di anteprima.
                  </p>
                  <p className="text-emerald-400">
                    💡 Per favore usa il form <b>Email & Password</b> qui sotto, oppure apri l'app in una nuova finestra cliccando sull'icona della freccia in alto a destra!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-[1px] bg-white/[0.08] flex-grow" />
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-2">oppure inserisci indirizzo</span>
            <div className="h-[1px] bg-white/[0.08] flex-grow" />
          </div>

          {/* Standard Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Display Name - Only on Sign Up */}
            {activeTab === 'signup' && (
              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nome Completo / Pseudonimo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="E.g. Samuel D'Angelo"
                    className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-normal"
                  />
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Indirizzo Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E.g. loliodioliva231@gmail.com"
                  className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-normal"
                />
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Parola Chiave (Password) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full bg-slate-950 border border-white/[0.1] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-normal"
                />
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Error Indicators */}
            {error && (
              <div className="flex items-start gap-2 text-rose-400 text-[11px] bg-rose-500/10 border border-rose-500/15 p-3 rounded-xl leading-relaxed">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Control */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 border-t border-white/20 cursor-pointer"
            >
              <span>{activeTab === 'signin' ? 'Accedi al Diario' : 'Crea Nuovo Account'}</span>
            </button>
          </form>

        </div>

        {/* Info Footer */}
        <div className="bg-slate-950 p-4 border-t border-white/[0.04] text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>I tuoi dati botanici sono sintonizzati in tempo reale su database Cloud.</span>
        </div>

      </div>

    </div>
  );
}
