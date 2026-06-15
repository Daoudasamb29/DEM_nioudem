import React, { useState, useEffect } from 'react';
import { Plane, Bus, Ticket, ChevronRight, ArrowRight, LogOut } from 'lucide-react';
import { BookingData } from '../types';
import logo from '../assets/images/logo.png';

// Import new dynamic background images to cycle/slideshow
import dakarImg from '../assets/images/Dakar.png';
import aibdImg from '../assets/images/aibd.png';
import thiesImg from '../assets/images/thies.png';
import tivaouaneImg from '../assets/images/tivaouane.png';
import toubaImg from '../assets/images/touba.png';

const DESTINATIONS = [
  { url: dakarImg, title: "Dakar", subtitle: "Capitale vibrante au bord de l'océan" },
  { url: aibdImg, title: "AIBD", subtitle: "Aéroport international moderne" },
  { url: thiesImg, title: "Thiès", subtitle: "Ville du rail chaleureuse et dynamique" },
  { url: tivaouaneImg, title: "Tivaouane", subtitle: "Cité religieuse historique du pays" },
  { url: toubaImg, title: "Touba", subtitle: "Métropole spirituelle et accueillante" }
];

interface HomeViewProps {
  onSelectStandardTrip: (from: string, to: string, price: number) => void;
  onSelectAibdTrip: () => void;
  onViewMyTickets: () => void;
  savedBookingsCount: number;
  availableTrips?: Array<{ from: string; to: string; price: number }>;
  onLogout?: () => void;
  clientFullName?: string;
}

export default function HomeView({
  onSelectStandardTrip,
  onSelectAibdTrip,
  onViewMyTickets,
  savedBookingsCount,
  availableTrips,
  onLogout,
  clientFullName
 }: HomeViewProps) {
  
  // Track scroll position to power dynamic premium layout transitions
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Dynamically cycle matching background image index every 4 seconds
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % DESTINATIONS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Trajet prices with requested pricing updates
  const defaultTrips = [
    { from: 'Dakar', to: 'Tivaouane', price: 6000 },
    { from: 'Tivaouane', to: 'Dakar', price: 6000 },
    { from: 'Dakar', to: 'Thiès', price: 5000 },
    { from: 'Thiès', to: 'Dakar', price: 5000 },
    { from: 'Dakar', to: 'Touba', price: 10000 },
    { from: 'Touba', to: 'Dakar', price: 10000 },
  ];

  const standardTrips = availableTrips && availableTrips.length > 0 ? availableTrips : defaultTrips;

  // Compute dynamic dimensions based on screen size and scroll state
  const maxHeroHeight = windowHeight * 0.48; // Hero covers 48% of the viewport height initially
  const minHeroHeight = 110;                 // Sticky collapsed header size
  const scrollThreshold = maxHeroHeight - minHeroHeight;

  // Active interpolation values restricted between correct bounds
  const currentHeroHeight = Math.max(minHeroHeight, maxHeroHeight - scrollTop);
  const progress = Math.min(1, Math.max(0, scrollTop / (scrollThreshold || 1)));

  // Premium transition styles and shifts
  const parallaxY = scrollTop * 0.35;
  const heroScale = 1 + (progress * 0.06);
  const welcomeTextOpacity = Math.max(0, 1 - progress * 1.8); // Dims greeting text early
  const logoScale = 1 - (progress * 0.12); // Smoothly downscale logo area by 12%

  return (
    <div 
      id="home-view" 
      onScroll={handleScroll}
      className="relative flex flex-col min-h-screen bg-[#EEF2FF] overflow-y-auto"
    >
      
      {/* PREMIUM DYNAMIC COLLAPSIBLE HERO SECTION */}
      <div 
        style={{ height: `${currentHeroHeight}px` }}
        className="fixed top-0 left-0 right-0 w-full overflow-hidden select-none pointer-events-none z-10 transition-all duration-75 ease-out"
      >
        {/* Dynamic Zoom & Parallax Image */}
        {DESTINATIONS.map((dest, idx) => (
          <img 
            key={idx}
            src={dest.url} 
            alt="Voyage au Sénégal avec Niou Dem" 
            referrerPolicy="no-referrer"
            style={{ 
              transform: `translateY(${parallaxY}px) scale(${heroScale})`,
              opacity: idx === currentImageIndex ? 1 : 0
            }}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
          />
        ))}

        {/* Dynamic dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 z-0 pointer-events-none"></div>

        {/* Animated Brand Overlay UI */}
        <div 
          style={{ transform: `translateY(${Math.max(-10, -scrollTop * 0.1)}px)` }}
          className="absolute top-6 left-6 z-10 flex flex-col items-start gap-3.5 pointer-events-none transition-transform duration-75 ease-out"
        >
          {/* Brand Logo Container */}
          <div 
            style={{ transform: `scale(${logoScale})` }}
            className="origin-top-left w-fit self-start flex items-center gap-2 bg-black/40 backdrop-blur-md py-1.5 px-3.5 rounded-full border border-white/10 shadow-sm pointer-events-auto transition-transform duration-75 ease-out"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#F4841C]/80 bg-white flex items-center justify-center shadow-inner">
              <img 
                src={logo} 
                alt="DEM Logo Icon" 
                className="w-full h-full object-contain p-0.5"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-black text-[#F4841C] text-sm tracking-widest leading-none">DEM</span>
              <span className="text-[8px] text-indigo-200 mt-0.5 font-bold leading-none tracking-tight">niou_dem</span>
            </div>
          </div>

          {/* Slogan & Welcome Greeting Label with dynamic opacity fade */}
          <div 
            style={{ opacity: welcomeTextOpacity }}
            className="flex flex-col mt-2.5 drop-shadow-md select-none text-left origin-left transition-opacity duration-75 ease-out w-72"
          >
            <div className="flex items-start justify-between w-full pr-4">
              <div>
                <span className="text-indigo-200 text-xs font-semibold tracking-wider uppercase block">
                  Bonjour, {clientFullName ? clientFullName.split(' ')[0] : 'Voyageur👋'}
                </span>
                <h2 className="text-white text-2xl font-black mt-1 leading-none tracking-tight">Où allez-vous ?</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Destination Caption Pill floating bottom-right */}
        <div 
          style={{ 
            transform: `translateY(${Math.max(-10, -scrollTop * 0.1)}px)`,
            opacity: welcomeTextOpacity 
          }}
          className="absolute bottom-6 right-6 z-10 pointer-events-auto transition-all duration-75 ease-out"
        >
          <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-lg flex flex-col items-end text-right min-w-[200px] max-w-[245px]">
            {/* Sur-titre orange vif */}
            <span className="text-[#F4841C] text-[8px] font-black uppercase tracking-widest leading-none mb-1 shadow-sm">
              DESTINATION
            </span>
            {/* Titre de la destination */}
            <span className="text-white text-sm font-black tracking-tight leading-tight">
              {DESTINATIONS[currentImageIndex]?.title}
            </span>
            {/* Sous-titre d'accompagnement */}
            <span className="text-indigo-200 text-[9px] mt-1.5 leading-snug w-full block truncate">
              {DESTINATIONS[currentImageIndex]?.subtitle}
            </span>

            {/* Pagination dots indicator with subtle transition animations */}
            <div className="flex items-center gap-1.5 mt-3.5">
              {DESTINATIONS.map((_, dotIdx) => {
                const isActive = dotIdx === currentImageIndex;
                return (
                  <div 
                    key={dotIdx}
                    className={`h-1 rounded-full transition-all duration-500 ease-in-out ${
                      isActive ? 'w-4.5 bg-[#F4841C]' : 'w-1 bg-white/30'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* spacer to push following content naturally down */}
      <div 
        style={{ height: `${maxHeroHeight}px` }}
        className="w-full shrink-0 pointer-events-none"
      />

      {/* RENDERED CARDS BLOCK — Flows naturally and overlaps slightly (-mt-5) */}
      <div 
        className="-mt-5 bg-white pb-24 px-4 rounded-t-3xl relative z-20 shadow-[0_-12px_30px_rgba(13,27,75,0.09)] flex-1 flex flex-col pt-3"
      >
        {/* Drag Handle Bar Accent */}
        <div className="w-9 h-1 bg-[#c8cfe8] rounded-full mx-auto mb-3.5" />
        
        {/* Section Title */}
        <div className="flex items-center justify-between mb-4 mt-1">
          <h3 className="text-[#0D1B4B] text-base font-bold tracking-tight">Trajets disponibles</h3>
          <span className="text-xs text-indigo-500 font-medium">Glisser pour voir</span>
        </div>

        {/* CAROUSEL - Horizontal Swiper Card with horizontal fluid scrolling */}
        <div className="flex gap-4.5 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth no-scrollbar select-none">
          {standardTrips.map((trip, idx) => (
            <div
              key={idx}
              onClick={() => onSelectStandardTrip(trip.from, trip.to, trip.price)}
              className="flex-shrink-0 w-[170px] bg-white rounded-2xl border border-indigo-100/80 p-4 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 cursor-pointer snap-start group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute -right-6 -top-6 w-16 h-16 bg-orange-50/50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 z-0"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[#F4841C] mb-3 group-hover:bg-[#F4841C] group-hover:text-white transition-all duration-300">
                    <Bus className="w-4.5 h-4.5" />
                  </div>
                  
                  <div className="font-bold text-slate-800 text-base leading-snug">{trip.from}</div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold my-1">
                    <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
                    <span>direction</span>
                  </div>
                  <div className="font-extrabold text-[#0D1B4B] text-lg leading-tight">{trip.to}</div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-semibold">ALLER SIMPLE</span>
                    <span className="font-bold text-[#0D1B4B] font-mono text-sm">
                      {trip.price.toLocaleString('fr-FR')} <span className="text-[10px] text-[#F4841C] font-semibold">FCFA</span>
                    </span>
                  </div>
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:translate-x-1 duration-300">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SPECIAL AIRPORT CATEGORY - AIBD CARD */}
        <div className="mt-6">
          <h4 className="text-[#0D1B4B] text-sm font-bold tracking-tight mb-3">Service Spécial Aéroport</h4>
          
          <div
            onClick={onSelectAibdTrip}
            className="bg-[#1B3080] rounded-2xl p-5 shadow-sm border border-indigo-900/40 relative overflow-hidden hover:opacity-95 transition-all duration-200 cursor-pointer scale-100 active:scale-98 group animate-fadeIn"
          >
            {/* Artistic element planes in background layer */}
            <div className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none stroke-current">
              <Plane className="w-32 h-32 rotate-[35deg]" />
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div className="flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#F4841C] flex items-center justify-center text-white shadow-md">
                  <Plane className="w-5.5 h-5.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-white font-extrabold text-base tracking-tight">AIBD · Aéroport</h5>
                    <span className="bg-[#F4841C] text-white font-bold text-[8px] tracking-widest px-1.5 py-0.5 rounded uppercase">
                      SPÉCIAL
                    </span>
                  </div>
                  <p className="text-indigo-200 text-xs mt-1.5 font-medium">
                    Shuttle direct · Climatisation & grands bagages inclus
                  </p>
                  
                  <div className="flex gap-4 mt-3 col-span-2">
                    <div className="flex items-center gap-1 bg-[#0D1B4B]/30 px-2.5 py-1 rounded-md text-[10px] text-indigo-100 border border-indigo-700/30">
                      <span>✓ Bagages inclus (23kg)</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#0D1B4B]/30 px-2.5 py-1 rounded-md text-[10px] text-indigo-100 border border-indigo-700/30">
                      <span>✓ Climatisation garantie</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="self-center w-8 h-8 rounded-full bg-indigo-900/60 text-[#F4841C] flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        </div>

        {/* MY RECENT TICKETS SECTION */}
        <div className="mt-7">
          <div
            onClick={onViewMyTickets}
            className="bg-white rounded-2xl border border-indigo-100/80 p-4.5 flex items-center justify-between shadow-sm cursor-pointer hover:border-indigo-300 transition-all active:scale-99 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">MES RÉSERVATIONS</span>
                <span className="text-[#0D1B4B] font-bold text-sm">
                  Consulter mes tickets ({savedBookingsCount})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {savedBookingsCount > 0 && (
                <span className="bg-red-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {savedBookingsCount}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-indigo-300" />
            </div>
          </div>
        </div>

        {/* LOGOUT BUTTON */}
        {onLogout && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onLogout}
              className="w-full bg-red-50/70 hover:bg-red-100/80 active:scale-[0.98] text-red-600 border border-red-200 font-bold py-3 px-4 rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Déconnexion</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
