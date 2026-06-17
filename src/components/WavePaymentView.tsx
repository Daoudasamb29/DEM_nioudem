import React from 'react';
import { ArrowLeft, Wallet, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface WavePaymentViewProps {
  onBack: () => void;
  onConfirmPayment: () => void;
  priceToPay?: number; // default to 100 as requested, but can be passed dynamically
}

export default function WavePaymentView({ onBack, onConfirmPayment, priceToPay = 100 }: WavePaymentViewProps) {
  const wavePayUrl = `https://pay.wave.com/m/M_sn_UMIt2X6-_-5B/c/sn/?amount=${priceToPay}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC]">
      
      {/* HEADER SECTION */}
      <div className="bg-[#0D1B4B] text-white px-5 pt-8 pb-6 rounded-b-[2rem] shadow-lg relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F4841C]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <button 
            id="wave-payment-back-btn"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 bg-[#1B2A5A] px-4 py-1.5 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Paiement Sécurisé</span>
          </div>
        </div>

        <div className="mt-6 text-center relative z-10">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/20 shadow-inner mb-3">
            <Wallet className="w-8 h-8 text-[#F4841C]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Finaliser votre trajet</h1>
          <p className="text-xs text-indigo-200 mt-1">Étape de paiement obligatoire</p>
        </div>
      </div>

      {/* CORE VIEW WITH SCROLL */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 flex flex-col justify-between">
        
        <div className="space-y-5">
          {/* INSTRUCTION CARD */}
          <div className="bg-white rounded-2xl border-2 border-indigo-50 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-sky-50 rounded-full"></div>
            
            <div className="relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0 font-bold">
                  🌊
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Méthode Wave</span>
                  <h2 className="text-slate-800 font-extrabold text-base mt-0.5">
                    Veuillez payer {priceToPay}F avec Wave
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Cliquez sur le bouton ci-dessous pour ouvrir directement l'application Wave de paiement.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 bg-amber-50/70 rounded-xl p-3 border border-amber-100/80 flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-[#F4841C] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-normal font-medium">
                  <strong>Important :</strong> Une fois le paiement effectué avec succès sur l'application Wave, veuillez revenir ici puis cliquer sur le bouton <strong>"J'ai payé"</strong> en bas de page pour confirmer et générer votre ticket de voyage officiel.
                </p>
              </div>
            </div>
          </div>

          {/* SECURE DIRECT LINK REDIRECT BUTTON */}
          <div id="wave-payment-redirect-box" className="bg-white rounded-2xl border border-slate-150 p-6 flex flex-col items-center gap-4 shadow-md text-center">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Veuillez payer pour sauvegarder votre place
              </h3>
            </div>

            <a 
              href={wavePayUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              id="wave-payment-direct-link"
              style={{ backgroundColor: '#1ea1f2', color: '#ffffff' }}
              className="inline-flex items-center justify-center gap-2 hover:bg-[#1589d1] active:scale-[0.98] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md transition-all duration-150 text-xs uppercase tracking-wider w-full text-center"
            >
              <span>Payer {priceToPay}F avec Wave</span>
              <ExternalLink className="w-4 h-4 text-white" />
            </a>

            <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
              Ouvrira un nouvel onglet sécurisé
            </span>
          </div>
        </div>

      </div>

      {/* FIXED FOOTER CONTROLS */}
      <div className="bg-white border-t border-slate-100 p-4 rounded-t-3xl shadow-2xl flex-shrink-0 space-y-2.5">
        <button
          id="wave-payment-vpaid-btn"
          onClick={onConfirmPayment}
          className="w-full bg-[#F4841C] hover:bg-[#d46f14] active:scale-[0.98] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
        >
          <Check className="w-5 h-5 stroke-[2.5px]" />
          J'ai payé
        </button>

        <button
          id="wave-payment-cancel-btn"
          onClick={onBack}
          className="w-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-bold py-2.5 px-6 rounded-md transition-all duration-150 flex items-center justify-center gap-1.5 text-xs text-center border border-slate-200"
        >
          Annuler
        </button>
      </div>

    </div>
  );
}
