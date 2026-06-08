import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Ticket, 
  Calendar, 
  Trash2, 
  ChevronRight, 
  Bus, 
  Plane,
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  ExternalLink
} from 'lucide-react';
import { BookingData } from '../types';
import { formatFrenchDate } from '../utils';
import { 
  getSupabaseCredentials, 
  isSupabaseConfigured, 
  testSupabaseWithCredentials, 
  fetchSupabaseBookings, 
  insertSupabaseBooking, 
  SUPABASE_SQL_SCHEMA,
  mesTickets
} from '../supabase';

interface MyTicketsViewProps {
  bookings: BookingData[];
  onBack: () => void;
  onSelectBooking: (booking: BookingData) => void;
  onDeleteBooking: (id: string) => void;
  onUpdateBookings: (updated: BookingData[]) => void;
  onSearchPhone?: (phone: string) => void;
}

export default function MyTicketsView({
  bookings,
  onBack,
  onSelectBooking,
  onDeleteBooking,
  onUpdateBookings,
  onSearchPhone
}: MyTicketsViewProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  // Connection inputs
  const [urlInput, setUrlInput] = useState(() => getSupabaseCredentials().url);
  const [keyInput, setKeyInput] = useState(() => getSupabaseCredentials().key);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Telephone Search variables
  const [phoneSearch, setPhoneSearch] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchedTickets, setSearchedTickets] = useState<BookingData[] | null>(null);
  const [searchError, setSearchError] = useState('');

  const activeCredentials = getSupabaseCredentials();
  const configured = isSupabaseConfigured();

  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) {
      setSearchError("Veuillez saisir un numéro de téléphone.");
      return;
    }
    setSearchError('');
    setLoadingSearch(true);
    try {
      const results = await mesTickets(phoneSearch);
      setSearchedTickets(results);
      if (results.length > 0 && onSearchPhone) {
        let clean = phoneSearch.trim();
        if (!clean.startsWith('+')) {
          clean = `+221 ${clean}`;
        }
        onSearchPhone(clean);
      }
      if (results.length === 0) {
        setSearchError("Aucune réservation trouvée pour ce numéro sur Supabase.");
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(`Erreur: ${err.message || err}`);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleCopySql = () => {
    try {
      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy fail', err);
    }
  };

  const handleSaveAndSync = async () => {
    const cleanUrl = urlInput.trim();
    const cleanKey = keyInput.trim();

    if (!cleanUrl || !cleanKey) {
      setTestStatus('error');
      setTestMessage("Veuillez saisir votre URL Supabase et votre clé anonyme.");
      return;
    }

    setTestStatus('testing');
    setSyncing(true);

    try {
      const result = await testSupabaseWithCredentials(cleanUrl, cleanKey);
      if (!result) {
        setTestStatus('error');
        setTestMessage("Échec de la connexion à Supabase. Veuillez vérifier votre URL et votre clé d'API.");
        setSyncing(false);
        return;
      }

      // Save valid credentials to localStorage
      localStorage.setItem('supabase_url', cleanUrl);
      localStorage.setItem('supabase_anon_key', cleanKey);

      setTestStatus('success');
      setTestMessage("Connexion réussie ! Vos réservations locales sont en cours de synchronisation...");

      // Dynamic migration / sync logic:
      // 1. Fetch tickets already in Supabase
      const dbBookings = await fetchSupabaseBookings();
      const dbIds = new Set(dbBookings.map(b => b.id));

      // 2. Upload any local bookings that don't exist in Supabase yet
      let uploadedCount = 0;
      for (const localBooking of bookings) {
        if (!dbIds.has(localBooking.id)) {
          const ok = await insertSupabaseBooking(localBooking);
          if (ok) uploadedCount++;
        }
      }

      // 3. Fetch final combined list from Supabase
      const finalBookings = await fetchSupabaseBookings();
      onUpdateBookings(finalBookings && finalBookings.length > 0 ? finalBookings : bookings);

      setTestStatus('success');
      if (uploadedCount > 0) {
        setTestMessage(`Synchronisation réussie ! Connexion validée et ${uploadedCount} tickets locaux ont été ajoutés à votre Supabase.`);
      } else {
        setTestMessage("Synchronisation réussie ! Les données sont connectées et à jour avec Supabase.");
      }
      setIsEditingConfig(false);
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(e?.message || "Échec de connexion ou d'insertion.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCurrent = async () => {
    setTestStatus('testing');
    setSyncing(true);
    try {
      // Pull and compare
      const dbBookings = await fetchSupabaseBookings();
      const dbIds = new Set(dbBookings.map(b => b.id));

      let uploadedCount = 0;
      for (const localBooking of bookings) {
        if (!dbIds.has(localBooking.id)) {
          const ok = await insertSupabaseBooking(localBooking);
          if (ok) uploadedCount++;
        }
      }

      const finalBookings = await fetchSupabaseBookings();
      onUpdateBookings(finalBookings && finalBookings.length > 0 ? finalBookings : bookings);

      setTestStatus('success');
      if (uploadedCount > 0) {
        setTestMessage(`Données synchronisées ! ${uploadedCount} réservations locales ont été téléchargées.`);
      } else {
        setTestMessage("Vos données sont parfaitement synchronisées avec Supabase !");
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(e?.message || "Une erreur est survenue lors de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    
    // Clear inputs
    setUrlInput('');
    setKeyInput('');
    setTestStatus('idle');
    setTestMessage('');
    setIsEditingConfig(false);

    // Reload raw local storage values to visual state
    try {
      const offlineStored = localStorage.getItem('niou_dem_bookings');
      const parsed = offlineStored ? JSON.parse(offlineStored) : [];
      onUpdateBookings(parsed);
    } catch (e) {
      console.error(e);
    }
  };
  
  return (
    <div id="my-tickets-view" className="flex flex-col min-h-screen bg-[#EEF2FF]">
      
      {/* HEADER BAR - Night Blue */}
      <header className="bg-[#0D1B4B] text-white py-4 px-4 shadow-md flex items-center gap-3 sticky top-0 z-50">
        <button 
          onClick={onBack}
          aria-label="Retour"
          className="p-1.5 hover:bg-slate-800/40 rounded-lg text-indigo-200 hover:text-white transition-all transform active:scale-90"
        >
          <ArrowLeft className="w-5.5 h-5.5" />
        </button>
        <div>
          <h2 className="font-bold text-base leading-snug font-sans">Mes Tickets DEM</h2>
          <p className="text-[10px] text-indigo-300 font-medium font-sans">Historique de vos réservations au Sénégal</p>
        </div>
      </header>
 
      {/* HISTORIC LAYOUT SECTION */}
      <div className="flex-1 p-5 pb-24 max-w-xl mx-auto w-full flex flex-col gap-4">

        {/* RECHERCHE DE TICKETS DEPUIS LE CLOUD */}
        {configured && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4.5 flex flex-col gap-3 animate-fadeIn">
            <h4 className="text-xs font-bold text-[#0D1B4B] uppercase tracking-wider font-sans">Récupérer mes tickets cloud par téléphone</h4>
            <p className="text-[10px] text-slate-500 leading-normal font-sans">
              Recherchez vos réservations réelles sur votre base de données Supabase en saisissant votre numéro.
            </p>
            <form onSubmit={handlePhoneSearch} className="flex gap-2">
              <div className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-slate-500 font-bold text-xs select-none border-r border-slate-200 pr-1.5 font-sans">+221</span>
                <input
                  type="tel"
                  placeholder="77 123 45 67"
                  value={phoneSearch}
                  onChange={(e) => {
                    setPhoneSearch(e.target.value);
                    if (searchError) setSearchError('');
                  }}
                  className="w-full bg-transparent focus:outline-none text-slate-800 text-xs font-mono font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={loadingSearch}
                className="bg-[#F4841C] hover:bg-orange-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 font-sans"
              >
                {loadingSearch ? 'Recherche...' : 'Rechercher'}
              </button>
            </form>
            
            {searchError && (
              <p className="text-[10px] text-red-500 font-bold leading-normal font-sans">{searchError}</p>
            )}
            
            {searchedTickets !== null && !loadingSearch && (
              <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-[#0D1B4B] font-bold font-sans">
                  {searchedTickets.length} ticket(s) cloud trouvé(s) !
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchedTickets(null);
                    setPhoneSearch('');
                    setSearchError('');
                  }}
                  className="text-[10px] text-indigo-500 font-bold hover:underline font-sans"
                >
                  Effacer le filtre
                </button>
              </div>
            )}
          </div>
        )}

        {(searchedTickets !== null ? searchedTickets : bookings).length === 0 ? (
          /* EMPTY STATE PLACEHOLDER */
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-4 self-center max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-300/80 mb-4 shadow-sm animate-pulse">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="text-[#0D1B4B] font-extrabold text-base tracking-tight font-sans">Aucun ticket disponible</h3>
            <p className="text-xs text-slate-450 mt-1.5 leading-relaxed font-sans">
              Aucune réservation trouvée. Revenez à l'accueil pour réserver votre premier trajet !
            </p>
            
            {searchedTickets !== null && (
              <button
                type="button"
                onClick={() => {
                  setSearchedTickets(null);
                  setPhoneSearch('');
                  setSearchError('');
                }}
                className="mt-4 text-indigo-600 font-bold hover:underline text-xs"
              >
                Afficher mes tickets locaux
              </button>
            )}
            
            <button
              onClick={onBack}
              className="mt-6 bg-[#F4841C] text-white font-bold py-2.5 px-6 rounded-xl text-xs hover:bg-[#eb770f] active:scale-95 transition-all cursor-pointer font-sans"
            >
              Réserver mon premier trajet
            </button>
          </div>
        ) : (
          /* VERTICAL LIST OF HISTORICAL BOOKINGS */
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between text-xs text-slate-450 px-1 font-semibold">
              <span>RÉSERVATIONS ({(searchedTickets !== null ? searchedTickets : bookings).length})</span>
              <span>Cliquez pour afficher</span>
            </div>

            {(searchedTickets !== null ? searchedTickets : bookings).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-indigo-100/70 shadow-sm relative overflow-hidden group select-none hover:border-indigo-300 hover:shadow-md transition-all duration-250 cursor-pointer"
              >
                {/* Horizontal divider line representation on click card area */}
                <div 
                  onClick={() => onSelectBooking(item)}
                  className="p-4 flex items-center justify-between gap-3 pr-11"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.tripType === 'aibd' ? 'bg-[#1B3080]/10 text-[#1B3080]' : 'bg-[#F4841C]/10 text-[#F4841C]'
                    }`}>
                      {item.tripType === 'aibd' ? (
                        <Plane className="w-4.5 h-4.5" />
                      ) : (
                        <Bus className="w-4.5 h-4.5" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-[#0D1B4B] font-sans">
                          {item.from} → {item.to}
                        </span>
                        {item.tripType === 'aibd' && (
                          <span className="bg-[#1B3080] text-white text-[7px] font-bold px-1 py-0.2 rounded uppercase">
                            AIBD
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{formatFrenchDate(item.date)} à {item.time}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5 uppercase tracking-wide">
                        REF: {item.id} · PASSAGER: {item.fullName.split(' ')[0]}
                      </div>
                    </div>
                  </div>

                  {/* Absolute visual chevron alignment */}
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-350">
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* DELETE TICKET CORNER ACTION */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Voulez-vous vraiment supprimer ce ticket ?')) {
                      onDeleteBooking(item.id);
                    }
                  }}
                  aria-label="Supprimer la réservation"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors z-20 cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
