import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, Phone, MapPin, Flag, HelpCircle } from 'lucide-react';
import { chargerHoraires } from '../supabase';

interface StandardFormViewProps {
  from: string;
  to: string;
  price: number;
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
  }) => void;
  defaultPhone?: string;
  defaultFullName?: string;
  onValueChange?: (fields: { phone?: string; fullName?: string }) => void;
}

export default function StandardFormView({
  from,
  to,
  price,
  onBack,
  onSubmit,
  defaultPhone = '',
  defaultFullName = '',
  onValueChange
}: StandardFormViewProps) {
  
  // State declaration
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
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  
  // Error state for validation tracking
  const [errors, setErrors] = useState<{
    date?: string;
    time?: string;
    fullName?: string;
    phone?: string;
    departureAddress?: string;
  }>({});

  useEffect(() => {
    if (!date) {
      setAvailableHours([]);
      return;
    }
    setLoadingHours(true);
    chargerHoraires(from, to)
      .then((hours) => {
        setAvailableHours(hours);
        if (hours && hours.length > 0) {
          setTime(hours[0]);
        }
      })
      .catch((err) => {
        console.error("Erreur de chargement des horaires:", err);
        setAvailableHours(['07h00', '10h30', '14h00']);
        setTime('07h00');
      })
      .finally(() => {
        setLoadingHours(false);
      });
  }, [date, from, to]);

  // Custom Form validation & submit logic
  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // Validate date (strictly required and blocking)
    if (!date) {
      newErrors.date = 'La date du voyage est requise.';
    }

    // Validate time (strictly required after date is picked)
    if (date && !time) {
      newErrors.time = 'Veuillez sélectionner l\'un des horaires de départ.';
    }

    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = 'Le nom complet du voyageur est requis.';
    }

    // Validate phone number
    const numericPhone = phoneNumber.replace(/\s+/g, '');
    if (!numericPhone) {
      newErrors.phone = 'Le numéro de portable est requis.';
    } else if (numericPhone.length < 7) {
      newErrors.phone = 'Format de téléphone invalide (Saisir au moins 7 chiffres).';
    }

    // Validate address
    if (!departureAddress.trim()) {
      newErrors.departureAddress = 'Votre adresse de départ exacte est requise.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Auto scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const elem = document.getElementById(`field-${firstErrorKey}`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Clear validation errors and trigger parent submission
    setErrors({});
    onSubmit({
      from,
      to,
      price,
      date,
      time,
      fullName: fullName.trim(),
      phone: `+221 ${phoneNumber.trim()}`,
      departureAddress: departureAddress.trim()
    });
  };

  // Get current date string for min constraint (travel cannot be in past)
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
    <div id="standard-form-view" className="flex flex-col min-h-screen bg-[#EEF2FF]">
      {/* HEADER BAR - Night Blue with Back Navigation */}
      <header className="bg-[#0D1B4B] text-white py-4 px-4 shadow-md flex items-center gap-3 sticky top-0 z-50">
        <button 
          onClick={onBack}
          aria-label="Retour"
          className="p-1.5 hover:bg-indigo-950/60 rounded-lg text-indigo-200 hover:text-white transition-all transform active:scale-90"
        >
          <ArrowLeft className="w-5.5 h-5.5" />
        </button>
        <div>
          <h2 className="font-bold text-base leading-snug">{from} → {to}</h2>
          <p className="text-[10px] text-indigo-300 font-medium">Trajet aller · Standard · {price.toLocaleString('fr-FR')} FCFA</p>
        </div>
      </header>

      {/* FORM FILLING WORKFLOW CONTAINER */}
      <form onSubmit={handleConfirmReservation} className="flex-1 p-5 pb-24 flex flex-col gap-5 max-w-xl mx-auto w-full">
        
        {/* FIELD 1: DATE OF TRAVEL (MANDATORY & BLOCKING) */}
        <div id="field-date" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>1. Date du voyage <span className="text-xs text-red-500 font-bold">*</span></span>
            <span className="text-[10px] text-orange-400 font-bold font-mono">ÉTAPE BLOCKANTE</span>
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
            className={`flex items-center gap-3 bg-white rounded-xl px-3.5 py-3 transition-all relative overflow-hidden cursor-pointer ${
              errors.date ? 'border-2 border-red-500' : 'border-1.5 border-[#F4841C]'
            }`}
          >
            <Calendar className="w-5 h-5 text-[#F4841C] flex-shrink-0 z-0" />
            <span className="text-slate-800 text-sm font-semibold z-0">
              {date ? date.split('-').reverse().join('/') : "Sélectionner une date..."}
            </span>
            
            {/* The actual native input overlaying the whole card with zero opacity to intercept native mobile touches/taps instantly */}
            <input 
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                // Clear errors on change
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
          
          {/* Helper descriptive text matching orange required spec */}
          <p className="text-[10px] text-[#F4841C] font-semibold mt-2.5 leading-snug flex items-center gap-1">
            <HelpCircle className="w-3 h-3 flex-shrink-0" />
            <span>Sélectionnez une date pour voir les trajets disponibles.</span>
          </p>
          
          {errors.date && (
            <p className="text-xs text-red-500 font-bold mt-1.5">{errors.date}</p>
          )}
        </div>

        {/* FIELD 2: SCHEDULE TIMES (STRICTLY REVEALED AFTER DATE SENSING) */}
        {date ? (
          <div id="field-time" className="bg-[#0D1B4B] rounded-2xl p-4.5 shadow-md border border-indigo-950/65 animate-fadeIn">
            <label className="block text-indigo-200 font-bold text-xs uppercase tracking-wider mb-3 flex justify-between items-center">
              <span>2. Horaires disponibles · {date.split('-').reverse().join('/')} <span className="text-red-400 font-bold">*</span></span>
              {loadingHours && (
                <span className="text-[10px] text-orange-400 animate-pulse font-normal">Chargement...</span>
              )}
            </label>
            
            <div className="flex gap-2.5 flex-wrap">
              {availableHours.map((hour) => {
                const isSelected = time === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => {
                      setTime(hour);
                      if (errors.time) setErrors(prev => ({ ...prev, time: undefined }));
                    }}
                    className={`flex-1 min-w-[80px] text-center font-bold text-sm py-2 px-3.5 rounded-xl transition-all ${
                      isSelected 
                        ? 'bg-[#F4841C] text-white ring-2 ring-orange-300' 
                        : 'bg-[#1B3080] text-indigo-200 border border-indigo-700/30 hover:bg-indigo-850'
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
            
            {errors.time && (
              <p className="text-xs text-red-400 font-bold mt-2">{errors.time}</p>
            )}
          </div>
        ) : (
          /* Orange Alert box for missing date */
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center text-orange-700 text-xs py-6 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#F4841C] mb-2 font-black select-none text-base">
              !
            </div>
            <span className="font-extrabold text-[#F4841C] mb-1">Information requise</span>
            <span className="font-bold text-amber-800">Sélectionnez une date pour voir les trajets disponibles.</span>
          </div>
        )}

        {/* FIELD 3: FULL NAME */}
        <div id="field-fullName" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
            3. Nom complet <span className="text-red-500 font-bold">*</span>
          </label>
          <div className={`flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-colors ${errors.fullName ? 'border-red-500 bg-red-50/10' : 'focus-within:border-indigo-400 focus-within:bg-white'}`}>
            <User className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
            <input 
              type="text"
              placeholder="Ex: Assane Thiam"
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

        {/* FIELD 4: TELEPHONE NUMBER WITH STICKY COUNTRY CODE */}
        <div id="field-phone" className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
            4. Numéro de téléphone <span className="text-red-500 font-bold">*</span>
          </label>
          <div className={`flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-colors ${errors.phone ? 'border-red-500 bg-red-50/10' : 'focus-within:border-indigo-400 focus-within:bg-white'}`}>
            <Phone className="w-4.5 h-4.5 text-slate-450 mr-1 flex-shrink-0" />
            <span className="text-slate-500 text-sm font-extrabold select-none border-r border-slate-300 pr-2 mr-1">
              +221
            </span>
            <input 
              type="tel"
              pattern="[0-9 ]*"
              placeholder="77 123 45 67"
              value={phoneNumber}
              onChange={(e) => {
                // Keep only numbers and spaces
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
            5. Adresse de départ <span className="text-red-500 font-bold">*</span>
          </label>
          <div className={`flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 transition-colors ${errors.departureAddress ? 'border-red-500 bg-red-50/10' : 'focus-within:border-indigo-400 focus-within:bg-white'}`}>
            <MapPin className="w-4.5 h-4.5 text-[#F4841C] mt-0.5 flex-shrink-0" />
            <input 
              type="text"
              placeholder="Ex: Médina, Rue 10 angle 15, Dakar"
              value={departureAddress}
              onChange={(e) => {
                setDepartureAddress(e.target.value);
                if (errors.departureAddress) setErrors(prev => ({ ...prev, departureAddress: undefined }));
              }}
              className="w-full bg-transparent focus:outline-none text-slate-800 text-sm font-semibold"
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-1 font-medium italic">Saisissez l'adresse où le chauffeur doit vous prendre en charge.</p>
          {errors.departureAddress && (
            <p className="text-xs text-red-500 font-bold mt-1.5">{errors.departureAddress}</p>
          )}
        </div>

        {/* FIELD 6: DESTINATION (NON MODIFIABLE AVEC BADGE) */}
        <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
          <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
            6. Destination
          </label>
          <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 rounded-xl px-3.5 py-3">
            <div className="flex items-center gap-3">
              <Flag className="w-4.5 h-4.5 text-[#0D1B4B]" />
              <span className="text-[#0D1B4B] text-sm font-extrabold">{to}</span>
            </div>
            <span className="bg-[#0D1B4B] text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Pré-sélectionné
            </span>
          </div>
          <p className="text-[9px] text-indigo-400 mt-1.5 font-medium">Cette destination a été choisie à l'accueil et reste verrouillée.</p>
        </div>

        {/* SUBMIT BOOKING BUTTON */}
        <div className="mt-4 pt-2">
          <button
            type="submit"
            className="w-full bg-[#F4841C] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-[#eb770f] active:scale-98 transition-all duration-150 shadow-md text-sm capitalize"
          >
            Confirmer la réservation
          </button>
        </div>

      </form>
    </div>
  );
}
