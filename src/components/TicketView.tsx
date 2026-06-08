import { useRef, useState, useEffect } from 'react';
import { Check, Download, Share2, Bus, ArrowRight, Plane, Home, Loader2 } from 'lucide-react';
// @ts-ignore
import domtoimage from 'dom-to-image-more';
import senegalTravelBanner from '../assets/images/senegal_travel_banner_1779489253831.png';
import logo from '../assets/images/logo.png';
import { BookingData } from '../types';
import { formatFrenchDate, getCityAbbreviation } from '../utils';
import { genererImage } from '../supabase';

interface TicketViewProps {
  booking: BookingData;
  onHome: () => void;
  emailStatusMessage?: string | null;
}

export default function TicketView({
  booking,
  onHome,
  emailStatusMessage
}: TicketViewProps) {
  
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloadState, setDownloadState] = useState<'idle' | 'generating' | 'downloaded'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showEmailNotice, setShowEmailNotice] = useState(false);
  const [showSecretsGuide, setShowSecretsGuide] = useState(false);

  // If there's an email delivery status, show Toast
  useEffect(() => {
    if (emailStatusMessage) {
      const timer = setTimeout(() => {
        triggerToast(emailStatusMessage);
      }, 400);

      const msg = emailStatusMessage.toLowerCase();
      if (
        msg.includes('échec') || 
        msg.includes('impossible') || 
        msg.includes('erreur') ||
        (msg.includes('enregistrée') && !msg.includes('e-mail')) ||
        (msg.includes('confirmée') && !msg.includes('envoyé'))
      ) {
        setShowEmailNotice(true);
      }

      return () => clearTimeout(timer);
    }
  }, [emailStatusMessage]);

  // Get cities initials
  const fromAbb = getCityAbbreviation(booking.from);
  const toAbb = getCityAbbreviation(booking.to);

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Convert ticket ref to PNG image and download using dom-to-image-more directly
  const telechargerTicket = async () => {
    if (!ticketRef.current || downloadState !== 'idle') return;
    
    try {
      setDownloadState('generating');
      
      const blob = await domtoimage.toBlob(ticketRef.current, {
        scale: 3,
        bgcolor: '#EEF2FF'
      });
      
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `ticket-${booking.id}.png`;
      document.body.appendChild(lien);
      lien.click();
      document.body.removeChild(lien);
      URL.revokeObjectURL(url);
      
      setDownloadState('downloaded');
      triggerToast('✓ Ticket téléchargé avec succès !');
      
      setTimeout(() => {
        setDownloadState('idle');
      }, 2000);
      
    } catch (e) {
      console.error('Error generating image ticket:', e);
      triggerToast('Erreur lors du téléchargement. Veuillez réessayer.');
      setDownloadState('idle');
    }
  };

  // Share ticket information
  const handleShareTicket = async () => {
    const textInfo = `niou_dem Sénégal 🇸🇳\nRéférence: ${booking.id}\nTrajet: ${booking.from} → ${booking.to}\nDate: ${formatFrenchDate(booking.date)} à ${booking.time}\nPassager: ${booking.fullName}\nAdresse de prise en charge: ${booking.departureAddress}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DEM Ticket - ${booking.id}`,
          text: textInfo,
        });
      } catch (err) {
        // Ignored or canceled share
      }
    } else {
      // Fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(textInfo);
        triggerToast('📋 Informations du ticket copiées dans le presse-papiers !');
      } catch (err) {
        triggerToast('Impossible de copier automatiquement.');
      }
    }
  };

  // Render varying width barcode lines for realistic visual aesthetic
  const renderFakeBarcode = () => {
    const barValues = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6];
    return (
      <div className="flex justify-center items-end gap-[2px] h-9 select-none opacity-90 my-2">
        {barValues.map((val, i) => {
          // Map values to heights
          const h = 24 + (val * 1.5);
          const w = (val % 3 === 0) ? 'w-[3px]' : (val % 2 === 0) ? 'w-[2px]' : 'w-[1.2px]';
          return (
            <div 
              key={i} 
              className={`bg-[#0D1B4B] rounded-[0.5px] ${w}`} 
              style={{ height: `${h}px` }} 
            />
          );
        })}
      </div>
    );
  };

  return (
    <div id="ticket-view" className="flex flex-col min-h-screen bg-[#EEF2FF]">
      
      {/* SUCCESS BANNER HEADER */}
      <header className="bg-[#0D1B4B] text-white pt-6 pb-6 px-4 shadow-md text-center">
        <div className="w-12 h-12 rounded-full bg-orange-100 text-[#F4841C] flex items-center justify-center mx-auto mb-2 shadow-inner border border-orange-200">
          <Check className="w-7 h-7 stroke-[3px]" />
        </div>
        <h2 className="font-extrabold text-lg tracking-tight">Réservé avec succès !</h2>
        <p className="text-xs text-indigo-350 mt-1">Votre ticket est prêt & enregistré</p>
      </header>

      {/* CORE WORKFLOW AREA */}
      <div className="flex-1 p-5 pb-24 max-w-md mx-auto w-full flex flex-col gap-4">

        {/* EmailJS configuration notice if not configured */}
        {showEmailNotice && (
          <div className="bg-amber-50 border border-amber-250 rounded-2xl p-4 text-xs text-amber-900 shadow-sm flex flex-col gap-2 animate-fadeIn">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <span className="text-sm">📧</span>
              <span>Réservation validée ! (Email non configuré)</span>
            </div>
            <p className="leading-relaxed">
              Votre ticket a bien été <strong>enregistré avec succès</strong>. Le SMS / E-mail de simulation a été généré, mais pour recevoir un vrai e-mail sur votre téléphone, vous devez configurer <strong>EmailJS</strong> dans l'éditeur.
            </p>
            <p className="leading-relaxed font-semibold text-slate-700">
              C'est tout à fait normal durant les tests ! Vos billets s'enregistrent toujours dans la base de données.
            </p>
            <button
              onClick={() => setShowSecretsGuide(!showSecretsGuide)}
              className="text-left font-extrabold text-[#F4841C] hover:underline mt-1 cursor-pointer flex items-center gap-1 self-start"
            >
              {showSecretsGuide ? "Masquer les étapes d'activation ▲" : "Comment activer les envois réels ? ▼"}
            </button>
            {showSecretsGuide && (
              <div className="mt-3 bg-white/95 rounded-xl p-3.5 border border-amber-200/80 flex flex-col gap-2 font-sans text-xs leading-relaxed text-slate-700 shadow-sm animate-fadeIn">
                <div className="font-bold text-slate-900 text-[12px] pb-1 border-b border-amber-100">
                  ⚠️ Guide de configuration (Local & Production - Vercel/Netlify)
                </div>
                
                <div className="font-semibold text-amber-900 mt-1">
                  1. Pour l'environnement de développement (AI Studio) :
                </div>
                <p className="pl-1 text-slate-600 text-[11px]">
                  Ajoutez simplement ces clés dans l'onglet <strong>"Secrets" (icône Engrenage ⚙️)</strong> ou directement dans votre fichier <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> :
                </p>
                <div className="pl-3 font-mono text-[11px] flex flex-col gap-0.5 text-slate-800">
                  <div>• <span className="font-bold">EMAILJS_PUBLIC_KEY</span></div>
                  <div>• <span className="font-bold">EMAILJS_SERVICE_ID</span></div>
                  <div>• <span className="font-bold">EMAILJS_TEMPLATE_ID</span></div>
                  <div>• <span className="font-bold">EMAILJS_TO_EMAIL</span> <span className="text-slate-400 font-sans text-[10px]">(votre e-mail de réception)</span></div>
                </div>

                <div className="font-bold text-red-800 mt-2 flex items-center gap-1">
                  <span>🚀</span> 2. IMPORTANT pour Vercel / Netlify / Hébergement Web :
                </div>
                <p className="pl-1 text-slate-600 text-[11px]">
                  Puisque Vercel compile votre application sous forme de site statique (sans serveur Node actif), l'application s'exécute entièrement dans le navigateur de l'utilisateur. 
                </p>
                <p className="pl-1 text-[#F4841C] font-extrabold text-[11px]">
                  Vous DEVEZ impérativement ajouter le préfixe <code className="bg-orange-50 text-orange-700 px-1 py-0.5 rounded font-mono font-black text-[10px]">VITE_</code> à toutes vos variables dans les paramètres de Vercel/Netlify :
                </p>
                <div className="pl-3 font-mono text-[11px] flex flex-col gap-0.5 text-slate-800">
                  <div>• <span className="font-bold text-rose-700">VITE_</span>EMAILJS_PUBLIC_KEY</div>
                  <div>• <span className="font-bold text-rose-700">VITE_</span>EMAILJS_SERVICE_ID</div>
                  <div>• <span className="font-bold text-rose-700">VITE_</span>EMAILJS_TEMPLATE_ID</div>
                  <div>• <span className="font-bold text-rose-700">VITE_</span>EMAILJS_TO_EMAIL</div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1.5 leading-normal">
                  💡 Vite bloque automatiquement l'accès à toutes les variables qui n'ont pas ce préfixe pour protéger vos secrets de base de données.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* PREMIUM VISUAL PRESENTATION & DOWNLOAD CONTAINER */}
        <div 
          ref={ticketRef}
          id="ticket-download-frame"
          className="bg-[#EEF2FF] p-4 rounded-[32px] border border-indigo-150/40 shadow-sm flex items-center justify-center w-full relative"
        >
          {/* Inject style tag to ensure SVG rasterizer resolves web fonts correctly inside downloaded blobs */}
          <style dangerouslySetInnerHTML={{ __html: `
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
            
            #ticket-download-frame, #ticket-card-rendered {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            #ticket-download-frame .font-mono {
              font-family: 'JetBrains Mono', monospace !important;
            }
          `}} />

          {/* BOARDING PASS TICKET CARD CONTAINER */}
          <div 
            id="ticket-card-rendered"
            className="bg-white rounded-3xl shadow-md border border-indigo-100 overflow-hidden relative w-full"
          >
          {/* Ticket Header inside the card */}
          <div className="bg-[#0D1B4B] px-5 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#F4841C]/80 bg-white flex items-center justify-center shadow-inner">
                <img 
                  src={logo} 
                  alt="DEM Logo Icon" 
                  className="w-full h-full object-contain p-0.5"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-black text-xs text-[#F4841C] tracking-widest leading-none block">DEM</span>
                <span className="text-[7.5px] text-indigo-200 mt-0.5 font-bold leading-none tracking-tight block">niou_dem</span>
              </div>
            </div>
            
            <span className="bg-indigo-950/45 text-indigo-200 font-bold text-[8.5px] tracking-widest px-2.5 py-0.5 rounded uppercase border border-indigo-800/30">
              ALLER SIMPLE
            </span>
          </div>

          {/* Travel Visual Indicator */}
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div className="text-left w-20">
              <span className="text-2xl font-black text-[#0D1B4B] font-mono tracking-tight block">
                {fromAbb}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase truncate">
                {booking.from}
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center px-2">
              <div className="w-full relative flex items-center justify-center">
                {/* Horizontal line */}
                <div className="w-full h-[1.5px] bg-[#F4841C] opacity-70 border-b border-dashed border-orange-200" />
                {/* Centered Route icon decoration */}
                <div className="absolute w-8 h-8 rounded-full bg-orange-50/90 border border-orange-100 flex items-center justify-center text-[#F4841C]">
                  {booking.tripType === 'aibd' ? (
                    <Plane className="w-4 h-4" />
                  ) : (
                    <Bus className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>

            <div className="text-right w-20">
              <span className="text-2xl font-black text-[#0D1B4B] font-mono tracking-tight block">
                {toAbb}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase truncate">
                {booking.to}
              </span>
            </div>
          </div>

          {/* Ticket metadata properties */}
          <div className="px-5 py-4 grid grid-cols-2 gap-y-4 gap-x-2 border-t border-slate-100 bg-slate-50/55 font-sans">
            <div>
              <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Passager</span>
              <span className="text-xs font-extrabold text-[#0D1B4B] uppercase block pr-1 truncate">
                {booking.fullName}
              </span>
            </div>

            <div>
              <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold flex-shrink-0">Mobile</span>
              <span className="text-xs font-bold text-slate-800 font-mono block">
                {booking.phone}
              </span>
            </div>

            <div>
              <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Date de départ</span>
              <span className="text-xs font-bold text-slate-800 block">
                {formatFrenchDate(booking.date)}
              </span>
            </div>

            <div>
              <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Heure précise</span>
              <span className="text-xs font-extrabold text-[#0D1B4B] font-mono block">
                {booking.time}
              </span>
            </div>

            <div className="col-span-2">
              <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">Adresse de prise en charge</span>
              <span className="text-xs font-bold text-slate-800 leading-snug break-all line-clamp-2">
                {booking.departureAddress}
              </span>
            </div>

            {booking.options && (booking.options.baggage || booking.options.ac) && (
              <div className="col-span-2 pt-1.5 flex gap-2">
                {booking.options.baggage && (
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span>• Bagages inclus (23kg)</span>
                  </span>
                )}
                {booking.options.ac && (
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span>• Climatisé</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SEMI CIRCULAR HOLES FOR AUTHENTIC BOARDING PASS AESTHETICS */}
          <div className="relative h-6 bg-slate-50/55 select-none">
            {/* Left Hole */}
            <div className="absolute -left-3 top-0 w-6 h-6 bg-[#EEF2FF] rounded-full border-r border-indigo-100/50 z-10" />
            {/* Dashed separators */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[1px] border-t-2 border-dashed border-slate-200 z-0" />
            {/* Right Hole */}
            <div className="absolute -right-3 top-0 w-6 h-6 bg-[#EEF2FF] rounded-full border-l border-indigo-100/50 z-10" />
          </div>

          {/* BARCODE & REFERENTIAL BLOCK */}
          <div className="bg-white px-5 pt-3 pb-5 text-center flex flex-col items-center">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
              Référence de réservation
            </span>
            <span className="text-sm font-black text-[#0D1B4B] font-mono tracking-tight mt-0.5">
              {booking.id}
            </span>

            {/* Simulated bar code lines */}
            <div className="w-full flex justify-center mt-2 mb-1.5 h-10">
              {renderFakeBarcode()}
            </div>
            
            <div className="text-[8px] text-slate-400 font-semibold font-mono">
              DEM-SNTK-{booking.createdAt.replace(/[^0-9]/g, '').slice(-10)}
            </div>
          </div>
        </div>
      </div>

        {/* WORKFLOW CTAS - DOWNLOAD AND SHARE */}
        <div className="flex flex-col gap-2.5 mt-3">
          {/* DOWNLOAD IMAGE CTA */}
          <button
            onClick={telechargerTicket}
            disabled={downloadState !== 'idle'}
            className="w-full bg-[#F4841C] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#eb770f] active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-85"
          >
            {downloadState === 'generating' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Génération...</span>
              </>
            ) : downloadState === 'downloaded' ? (
              <span>Téléchargé ✓</span>
            ) : (
              <span>Télécharger en image</span>
            )}
          </button>

          {/* SECUNDARY SHARE CTA */}
          <button
            onClick={handleShareTicket}
            className="w-full bg-white text-[#0D1B4B] border border-slate-200 font-bold py-3 px-6 rounded-xl hover:border-indigo-200 active:bg-slate-55 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#0D1B4B]" />
            <span>Partager le ticket</span>
          </button>
        </div>

        {/* BACK TO HOME ACTION */}
        <div className="mt-4 text-center">
          <button
            onClick={onHome}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
          >
            <span>Retourner à l'accueil</span>
          </button>
        </div>

      </div>

      {/* FIXED TOAST NOTIFICATION IF TRIGGERED */}
      {showToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#0D1B4B] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs leading-none z-50 font-semibold border border-indigo-900/40 opacity-100 transition-opacity flex items-center gap-1.5 select-none animate-fadeIn">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
