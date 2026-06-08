import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, User, Phone, MapPin, Briefcase, Snowflake, Check, HelpCircle } from 'lucide-react';

interface AibdFormViewProps {
  onBack: () => void;
  onSubmit: (data: {
    from: string;
    to: string;
    price: number;
    date: string;
    time: string;
    fullName: string;
    phone: string;
    departureAddress: string;
    options: {
      baggage: boolean;
      ac: boolean;
    };
  }) => void;
  defaultPhone?: string;
  defaultFullName?: string;
  onValueChange?: (fields: { phone?: string; fullName?: string }) => void;
}

export default function AibdFormView({
  onBack,
  onSubmit,
  defaultPhone = '',
  defaultFullName = '',
  onValueChange
}: AibdFormViewProps) {
  
  // State variables for Airport Form
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [fullName, setFullName] = useState(defaultFullName);
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (defaultPhone) {
      return defaultPhone.replace(/^\+221\s*/, '');
    }
    return '';
  });
  const [departureAddress, setDepartureAddress] = useState('');
  
  // Options states (Baggage checked, AC unchecked by default)
  const [baggage, setBaggage] = useState(true);
  const [ac, setAc] = useState(false);
  
  // Validation tracking
  const [errors, setErrors] = useState<{
    date?: string;
    time?: string;
    fullName?: string;
    phone?: string;
    departureAddress?: string;
  }>({});

  const fixedPrice = 20000; // Special AIBD shuttle flat rate in FCFA

  const handleConfirmAibd = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // Validate date
    if (!date) {
      newErrors.date = 'La date du voyage est requise.';
    }

    // Validate departure time
    if (date && !time) {
      newErrors.time = 'L\'heure de départ souhaitée est requise.';
    }

    // Validate passenger name
    if (!fullName.trim()) {
      newErrors.fullName = 'Le nom complet du voyageur est requis.';
    }

    // Validate phone number
    const numericPhone = phoneNumber.replace(/\s+/g, '');
    if (!numericPhone) {
      newErrors.phone = 'Le numéro de portable est requis.';
    } else if (numericPhone.length < 7) {
      newErrors.phone = 'Saisir au moins 7 chiffres.';
    }

    // Validate departure/pickup address
    if (!departureAddress.trim()) {
      newErrors.departureAddress = 'L\'adresse de prise en charge est requise.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error element
      const firstErrorKey = Object.keys(newErrors)[0];
      const elem = document.getElementById(`field-${firstErrorKey}`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    onSubmit({
      from: 'Dakar',
      to: 'AIBD Aéroport',
      price: fixedPrice,
      date,
      time,
      fullName: fullName.trim(),
      phone: `+221 ${phoneNumber.trim()}`,
      departureAddress: departureAddress.trim(),
      options: {
        baggage,
        ac
      }
    });
  };

  // Get current date string for min constraint to avoid GMT/UTC mismatch on mobile (travel cannot be in past)
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString(0);
  const tomorrow = getLocalDateString(1);
  const dayAfter = getLocalDateString(2);

  return (
    <div id="aibd-form-view" className="flex flex-col min-h-screen bg-[#EEF2FF]">
      {/* HEADER SPECIALE AIRPORT - Dark Blue #1B3080 */}
      <header className="bg-[#1B3080] text-white py-4 px-4 shadow-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            aria-label="Retour"
            className="p-1.5 hover:bg-slate-800/40 rounded-lg text-indigo-200 hover:text-white transition-transform active:scale-90"
          >
            <ArrowLeft className="w-5.5 h-5.5" />
          </button>
          <div>
            <h2 className="font-bold text-base leading-snug">AIBD · Aéroport</h2>
            <p className="text-[10px] text-indigo-250 font-medium">Navette Aéroport Spéciale · 20 000 FCFA</p>
          </div>
        </div>
        
        <span className="bg-[#F4841C] text-white font-extrabold text-[8.5px] tracking-wider px-2.5 py-1 rounded">
          SPÉCIAL
        </span>
      </header>

      {/* FORM FILLING WORKFLOW CONTAINER */}
      <form onSubmit={handleConfirmAibd} className="flex-1 p-5 pb-24 flex flex-col gap-5 max-w-xl mx-auto w-full">
        
        {/* FIELD 1: DATE OF TRAVEL (MANDATORY & BLOCKING) */}
        <div id="field-date" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>1. Date du voyage <span className="text-xs text-red-500 font-bold">*</span></span>
            <span className="text-[9px] text-[#F4841C] font-bold font-mono">ÉTAPE BLOCKANTE</span>
          </label>

          {/* Quick Shortcuts */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setDate(today);
                if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
              }}
              className={`flex-1 py-1.5 px-2 text-center text-[11px] font-bold rounded-xl transition-all border ${
                date === today
                  ? 'bg-orange-50 border-[#F4841C] text-[#F4841C]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => {
                setDate(tomorrow);
                if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
              }}
              className={`flex-1 py-1.5 px-2 text-center text-[11px] font-bold rounded-xl transition-all border ${
                date === tomorrow
                  ? 'bg-orange-50 border-[#F4841C] text-[#F4841C]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Demain
            </button>
            <button
              type="button"
              onClick={() => {
                setDate(dayAfter);
                if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
              }}
              className={`flex-1 py-1.5 px-2 text-center text-[11px] font-bold rounded-xl transition-all border ${
                date === dayAfter
                  ? 'bg-orange-50 border-[#F4841C] text-[#F4841C]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Après-demain
            </button>
          </div>
          
          <div 
            className={`flex items-center gap-3 bg-white rounded-xl px-3.5 py-3 transition-colors relative overflow-hidden cursor-pointer ${
              errors.date ? 'border-2 border-red-500' : 'border-1.5 border-[#F4841C]'
            }`}
          >
            <Calendar className="w-5 h-5 text-[#F4841C] flex-shrink-0 z-0" />
            <span className="text-slate-800 text-sm font-semibold z-0">
              {date ? date.split('-').reverse().join('/') : "Sélectionner une date..."}
            </span>
            
            {/* Transparent overlay input covering the entire container so it's fully tappable on all iOS/Android screens */}
            <input 
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
          
          {/* Elegant format display confirmation */}
          {date && (
            <div className="mt-2.5 bg-indigo-50/50 rounded-xl px-3 py-1.5 border border-indigo-100/50 flex items-center justify-between text-xs animate-fadeIn">
              <span className="font-semibold text-indigo-800">Date sélectionnée :</span>
              <span className="font-bold text-[#F4841C] tracking-wide bg-white px-2.5 py-1 rounded-lg border border-indigo-100 font-mono">
                {date.split('-').reverse().join('/')}
              </span>
            </div>
          )}
          
          <p className="text-[10px] text-[#F4841C] font-semibold mt-2.5 leading-snug flex items-center gap-1">
            <HelpCircle className="w-3 h-3 flex-shrink-0" />
            <span>Sélectionnez la date de votre vol ou voyage vers l'aéroport.</span>
          </p>
          
          {errors.date && (
            <p className="text-xs text-red-500 font-bold mt-1.5">{errors.date}</p>
          )}
        </div>

        {/* FIELD 2: CUSTOM DEPARTURE TIME INPUT */}
        {date ? (
          <div id="field-time" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm animate-fadeIn">
            <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2 flex justify-between items-center">
              <span>2. Heure de départ souhaitée <span className="text-red-500 font-bold">*</span></span>
              <span className="text-[9px] text-[#F4841C] font-bold font-mono bg-orange-50 px-2 py-0.5 rounded border border-orange-200 uppercase">
                HORAIRE LIBRE
              </span>
            </label>
            
            <div 
              className={`flex items-center gap-3 bg-slate-50 border rounded-xl px-3.5 py-3 transition-colors relative overflow-hidden cursor-pointer ${
                errors.time ? 'border-red-500 bg-red-50/10' : 'border-slate-200 focus-within:border-[#F4841C] focus-within:bg-white'
              }`}
            >
              <Clock className="w-5 h-5 text-[#F4841C] flex-shrink-0 z-0" />
              <span className="text-slate-800 text-sm font-semibold z-0">
                {time ? time : "Définir l'Heure (ex: 14:30)..."}
              </span>
              
              {/* Invisible native input over the container box to respond to native mobile tap instantly */}
              <input 
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  if (errors.time) setErrors(prev => ({ ...prev, time: undefined }));
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
            
            <p className="text-[10px] text-slate-500 font-semibold mt-2.5 leading-snug flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Vous êtes libre de choisir votre horaire. Le chauffeur viendra à l'heure renseignée.</span>
            </p>
            
            {errors.time && (
              <p className="text-xs text-red-500 font-bold mt-1.5">{errors.time}</p>
            )}
          </div>
        ) : (
          /* Orange Alert box for missing date */
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center text-orange-700 text-xs py-6 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#F4841C] mb-2 font-black select-none text-base">
              !
            </div>
            <span className="font-extrabold text-[#F4841C] mb-1">Information requise</span>
            <span className="font-bold text-amber-800">Sélectionnez une date d'abord pour définir votre heure de prise en charge.</span>
          </div>
        )}

        {/* FIELD 3: PASSENGER FULL NAME */}
        <div id="field-fullName" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm font-sans">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
            3. Nom complet <span className="text-red-500 font-bold">*</span>
          </label>
          <div className={`flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-colors ${errors.fullName ? 'border-red-500 bg-red-50/10' : 'focus-within:border-indigo-400 focus-within:bg-white'}`}>
            <User className="w-4.5 h-4.5 text-slate-450" />
            <input 
              type="text"
              placeholder="Ex: Fatou Ndiaye"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
                if (onValueChange) onValueChange({ fullName: e.target.value });
              }}
              className="w-full bg-transparent focus:outline-none text-slate-800 text-sm font-semibold"
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-red-500 font-bold mt-1.5">{errors.fullName}</p>
          )}
        </div>

        {/* FIELD 4: TELEPHONE PORTABLE WITH +221 FIXED PRE-STYLING */}
        <div id="field-phone" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
            4. Numéro de téléphone <span className="text-red-500 font-bold">*</span>
          </label>
          <div className={`flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-colors ${errors.phone ? 'border-red-500 bg-red-50/10' : 'focus-within:border-indigo-400 focus-within:bg-white'}`}>
            <Phone className="w-4.5 h-4.5 text-slate-450 mr-1" />
            <span className="text-slate-550 text-sm font-extrabold select-none border-r border-slate-350 pr-2 mr-1">
              +221
            </span>
            <input 
              type="tel"
              pattern="[0-9 ]*"
              placeholder="70 987 65 43"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9 ]/g, '');
                setPhoneNumber(val);
                if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                if (onValueChange) onValueChange({ phone: val ? `+221 ${val.trim()}` : '' });
              }}
              className="w-full bg-transparent focus:outline-none text-slate-800 text-sm font-mono font-bold tracking-wide"
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-red-500 font-bold mt-1.5">{errors.phone}</p>
          )}
        </div>

        {/* FIELD 5: ADRESSE DE DEPART (SAISIE LIBRE) */}
        <div id="field-departureAddress" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
            5. Adresse de prise en charge <span className="text-red-500 font-bold">*</span>
          </label>
          <div className={`flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-colors ${errors.departureAddress ? 'border-red-500 bg-red-50/10' : 'focus-within:border-indigo-400 focus-within:bg-white'}`}>
            <MapPin className="w-4.5 h-4.5 text-[#F4841C] mt-0.5" />
            <input 
              type="text"
              placeholder="Ex: Almadies, en face de la banque, Dakar"
              value={departureAddress}
              onChange={(e) => {
                setDepartureAddress(e.target.value);
                if (errors.departureAddress) setErrors(prev => ({ ...prev, departureAddress: undefined }));
              }}
              className="w-full bg-transparent focus:outline-none text-slate-800 text-sm font-semibold"
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-1 font-medium italic">Saisissez l'adresse exacte pour la prise en charge par notre chauffeur.</p>
          {errors.departureAddress && (
            <p className="text-xs text-red-500 font-bold mt-1.5">{errors.departureAddress}</p>
          )}
        </div>

        {/* SECTION: OPTIONS SUPPLEMENTAIRES (CHECKBOXES CLIM & BAGAGES) */}
        <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <span className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-3">
            Options supplémentaires
          </span>
          
          <div className="flex flex-col gap-3">
            {/* Bagages inclus options */}
            <div 
              onClick={() => setBaggage(!baggage)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all cursor-pointer border ${
                baggage 
                  ? 'border-[#F4841C] bg-white text-slate-800 shadow-sm' 
                  : 'border-slate-200 bg-slate-50/50 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${baggage ? 'bg-orange-50 text-[#F4841C]' : 'bg-slate-150 text-slate-400'}`}>
                  <Briefcase className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">Bagages inclus</span>
                  <span className="block text-[10px] text-slate-400">Jusqu'à 23 kg de bagages en soute</span>
                </div>
              </div>
              
              <div className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center transition-all border ${
                baggage ? 'bg-[#F4841C] border-[#F4841C]' : 'border-slate-350 bg-white'
              }`}>
                {baggage && <Check className="w-4 h-4 text-white stroke-[3px]" />}
              </div>
            </div>

            {/* Climatisation option */}
            <div 
              onClick={() => setAc(!ac)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all cursor-pointer border ${
                ac 
                  ? 'border-[#F4841C] bg-white text-slate-800 shadow-sm' 
                  : 'border-slate-200 bg-slate-50/50 text-slate-550'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ac ? 'bg-orange-50 text-[#F4841C]' : 'bg-slate-150 text-slate-400'}`}>
                  <Snowflake className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">Climatisation</span>
                  <span className="block text-[10px] text-slate-400">Véhicule climatisé haut de gamme</span>
                </div>
              </div>
              
              <div className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center transition-all border ${
                ac ? 'bg-[#F4841C] border-[#F4841C]' : 'border-slate-300 bg-white'
              }`}>
                {ac && <Check className="w-4 h-4 text-white stroke-[3px]" />}
              </div>
            </div>
          </div>
        </div>

        {/* CTA SUBMISSION BUTTON */}
        <div className="mt-4 pt-2">
          <button
            type="submit"
            className="w-full bg-[#F4841C] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#eb770f] active:scale-98 transition-all duration-150 shadow-md text-sm capitalize"
          >
            Confirmer · AIBD
          </button>
        </div>

      </form>
    </div>
  );
}
