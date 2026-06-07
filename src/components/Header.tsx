import React, { useEffect, useState } from 'react';
import { Sprout, LogIn, LogOut, Database, HelpCircle, Check, Copy } from 'lucide-react';
import { auth, GoogleAuthProvider, signInWithPopup, signOut, isFirebaseMock } from '../firebase';
import AuthModal from './AuthModal';
import { Plant } from '../types';

export interface UserState {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface HeaderProps {
  user: UserState | null;
  setUser: (user: UserState | null) => void;
  selectedPlant?: Plant | null;
  selectedOwnerId?: string | null;
  onClearOwnerId?: () => void;
}

export default function Header({ user, setUser, selectedPlant, selectedOwnerId, onClearOwnerId }: HeaderProps) {
  const [showStatusHelp, setShowStatusHelp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync with Firebase Auth state if we are not in Mock mode
  useEffect(() => {
    if (isFirebaseMock || !auth) return;

    const unsubscribe = auth.onAuthStateChanged((firebaseUser: any) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
    });

    return unsubscribe;
  }, [setUser]);

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    if (isFirebaseMock) {
      setUser(null);
      return;
    }

    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Auth sign-out error:", err);
    }
  };

  const handleShareProfile = () => {
    let targetUid = '';
    if (selectedPlant) {
      targetUid = selectedPlant.ownerId;
    } else if (selectedOwnerId) {
      targetUid = selectedOwnerId;
    } else if (user) {
      targetUid = user.uid;
    }

    const shareUrl = targetUid
      ? `${window.location.origin}${window.location.pathname}?ownerId=${targetUid}`
      : `${window.location.origin}${window.location.pathname}`;

    // Show immediate prompt pop-up so user sees and can easily copy the link manually
    window.prompt("Diario Botanico - Copia questo link per condividerlo con chi vuoi:", shareUrl);

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(err => {
      console.warn("Clipboard blocked but prompt dialog was shown:", err);
    });
  };

  return (
    <header className="bg-slate-900 border-b border-white/[0.08] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand Logo and Title */}
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => {
            if (onClearOwnerId) onClearOwnerId();
            else window.history.replaceState({}, '', window.location.pathname);
          }}
        >
          <div className="p-2 sm:p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400 font-bold">
            <Sprout className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white flex items-center gap-1.5">
              Botanica <span className="text-emerald-400 text-xs font-mono font-normal tracking-wide px-1.5 py-0.5 bg-emerald-400/10 rounded border border-emerald-400/20">Evolution</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 leading-none mt-0.5">Progressi Botanici in Tempo Reale</p>
          </div>
        </div>

        {/* Database, Share & Account Options */}
        <div className="flex items-center space-x-3 ml-auto sm:ml-0">
          
          {/* Share Profile button "due amici" 👥 in alto a sinistra di cloud */}
          <button
            onClick={handleShareProfile}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition cursor-pointer ${
              copiedLink 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
            }`}
            title="Copia link profilo botanico per condividerlo con amici"
          >
            <span className="text-sm">👥</span>
            <span className="hidden sm:inline font-semibold">
              {copiedLink ? 'Link Copiato!' : 'Profilo Botanico'}
            </span>
          </button>

          {/* Status Pillar (Cloud) */}
          <div className="relative">
            <button
              onClick={() => setShowStatusHelp(!showStatusHelp)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition ${
                isFirebaseMock
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20 hover:bg-amber-400/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DB:</span>
              <span className="font-medium">{isFirebaseMock ? 'Locale' : 'Cloud'}</span>
              <div className={`w-2 h-2 rounded-full ${isFirebaseMock ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            </button>

            {showStatusHelp && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-800 border border-white/[0.1] rounded-xl p-4 shadow-2xl text-slate-300 text-xs z-[60]">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-1.5 text-sm">
                  {isFirebaseMock ? '👉 Stato: Modalità Offline' : '🟢 Stato: Sincronizzazione Attiva'}
                </h4>
                {isFirebaseMock ? (
                  <div className="space-y-2">
                    <p>
                      La tua app sta salvando i dati nella <b>memoria locale (localStorage)</b> del browser perché il database Cloud non è configurato.
                    </p>
                    <p className="font-medium text-emerald-400">
                      💡 Clicca sul pulsante "Accetta i Termini" del box Firebase in AI Studio per abilitare il Cloud!
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Una volta approvato, i progressi saranno salvati su Cloud Run e potrai condividerli con la tua amica in tempo reale.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>
                      La sincronizzazione cloud con Firebase Firestore è <b>attiva</b>.
                    </p>
                    <p>
                      Ogni modifica, foto o progresso che carichi è visibile <b>in tempo reale</b> a chiunque visiti il link di condivisione di questa app!
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowStatusHelp(false)}
                  className="mt-3 w-full bg-slate-700 hover:bg-slate-600 font-medium py-1 rounded text-white text-[11px]"
                >
                  Ho Capito
                </button>
              </div>
            )}
          </div>

          {/* User Sign-In/Out Block */}
          {user ? (
            <div className="flex items-center bg-white/[0.04] pl-2 pr-1.5 py-1 rounded-xl border border-white/[0.08]" id="user-profile-badge">
              <div className="flex flex-col items-end mr-2 max-w-[100px] sm:max-w-[150px]">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-100 truncate w-full">
                  {user.displayName || 'Proprietario'}
                </span>
                <span className="text-[9px] text-slate-400 leading-none">
                  {isFirebaseMock ? 'Caretaker Demo' : 'Proprietario'}
                </span>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  alt={user.displayName || 'user'}
                  className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg outline outline-1 outline-emerald-500/40 object-cover"
                />
              ) : (
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold font-mono">
                  {(user.displayName || 'P')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={handleLogout}
                title="Esci"
                className="ml-1.5 sm:ml-2.5 p-1.5 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              id="google-login-btn"
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition shadow-lg shadow-emerald-500/10 border-t border-white/20 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Accedi / Registrati</span>
            </button>
          )}

        </div>
      </div>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={(fetchedUser) => {
            setUser(fetchedUser);
          }} 
        />
      )}
    </header>
  );
}
