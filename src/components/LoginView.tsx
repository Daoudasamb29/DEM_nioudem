import React, { useState } from 'react';
import { User, Lock, Phone, LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { creerCompte, connecterCompte } from '../supabase';
import logo from '../assets/images/logo.png';

interface LoginViewProps {
  onLoginSuccess: (name: string, phone: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status/Error messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError(null);
    setSuccess(null);
    setName('');
    setPhone('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!name.trim()) {
      setError("Le nom complet est obligatoire.");
      return;
    }
    if (isSignup && !phone.trim()) {
      setError("Le numéro de téléphone est obligatoire.");
      return;
    }
    if (!password.trim()) {
      setError("Le mot de passe est obligatoire.");
      return;
    }
    if (password.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        // Create account
        const user = await creerCompte(name, phone, password);
        setSuccess("Votre compte a été créé avec succès !");
        
        // Short delay to let the user see the success message
        setTimeout(() => {
          onLoginSuccess(user.fullName, user.phone);
        }, 1200);
      } else {
        // Authenticate
        const user = await connecterCompte(name, password);
        setSuccess("Connexion réussie !");
        
        setTimeout(() => {
          onLoginSuccess(user.fullName, user.phone);
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de l'opération.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center min-h-screen p-6 bg-gradient-to-b from-[#0D1B4B] to-[#1E293B] text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center animate-fadeIn">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#F4841C]/80 bg-white flex items-center justify-center shadow-lg mb-4">
          <img 
            src={logo} 
            alt="Niou Dem" 
            className="w-16 h-16 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
          DEM <span className="text-[#F4841C] font-semibold text-lg">Voyage</span>
        </h1>
        <p className="text-xs text-slate-300 max-w-xs">
          Réservez et gérez vos tickets de voyage vers Dakar, Touba, Tivaouane, Thiès et Aéroport AIBD.
        </p>
      </div>

      {/* Main Authentication card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl animate-scaleIn">
        <div className="flex justify-center border-b border-white/10 pb-4 mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-center font-bold text-sm transition-all duration-200 border-b-2 ${
              !isSignup ? 'text-[#F4841C] border-[#F4841C]' : 'text-slate-400 border-transparent hover:text-white'
            }`}
            onClick={() => { if (isSignup) toggleMode(); }}
          >
            Se Connecter
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-center font-bold text-sm transition-all duration-200 border-b-2 ${
              isSignup ? 'text-[#F4841C] border-[#F4841C]' : 'text-slate-400 border-transparent hover:text-white'
            }`}
            onClick={() => { if (!isSignup) toggleMode(); }}
          >
            Créer un Compte
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-rose-200 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#F41C1C]" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs text-center animate-pulse">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nom Complet Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300 font-medium tracking-wide">Nom Complet</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Ex: Daouda Samb"
                required
                disabled={loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#F4841C]/60 focus:border-[#F4841C]/60 transition-all duration-150"
              />
            </div>
          </div>

          {/* Phone Input (Visible only in Signup mode) */}
          {isSignup && (
            <div className="flex flex-col gap-1 transition-all duration-300">
              <label className="text-xs text-slate-300 font-medium tracking-wide">Numéro de Téléphone</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  placeholder="Ex: 77 123 45 67"
                  required={isSignup}
                  disabled={loading}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#F4841C]/60 focus:border-[#F4841C]/60 transition-all duration-150"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-300 font-medium tracking-wide">Mot de Passe</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Votre mot de passe"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#F4841C]/60 focus:border-[#F4841C]/60 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#F4841C] hover:bg-[#d67012] disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isSignup ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>S'inscrire</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Se Connecter</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-slate-500 text-[10px]">
        DEM Sénégal • Version Sécurisée PWA
      </div>
    </div>
  );
}
