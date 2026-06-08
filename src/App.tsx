/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ScreenState, BookingData } from './types';
import { loadBookings, saveBookings, generateTicketReference } from './utils';
import { 
  isSupabaseConfigured, 
  fetchSupabaseBookings, 
  insertSupabaseBooking, 
  deleteSupabaseBooking, 
  chargerTrajets, 
  confirmerReservation,
  mesTickets
} from './supabase';

// Component Views
import HomeView from './components/HomeView';
import StandardFormView from './components/StandardFormView';
import AibdFormView from './components/AibdFormView';
import TicketView from './components/TicketView';
import MyTicketsView from './components/MyTicketsView';
import LoginView from './components/LoginView';

import { sendReservationEmail } from './utils/emailService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('dem_is_logged_in') === 'true';
  });

  const [screen, setScreen] = useState<ScreenState>(() => {
    const logged = localStorage.getItem('dem_is_logged_in') === 'true';
    return logged ? 'home' : 'login';
  });

  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [activeBooking, setActiveBooking] = useState<BookingData | null>(null);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  
  const [clientPhone, setClientPhone] = useState<string>(() => localStorage.getItem('dem_client_phone') || '');
  const [clientFullName, setClientFullName] = useState<string>(() => localStorage.getItem('dem_client_fullname') || '');

  const handleLoginSuccess = (name: string, phone: string) => {
    setClientFullName(name);
    setClientPhone(phone);
    localStorage.setItem('dem_client_fullname', name);
    localStorage.setItem('dem_client_phone', phone);
    localStorage.setItem('dem_is_logged_in', 'true');
    setIsLoggedIn(true);
    setScreen('home');

    // Instantly load locally backed up bookings for this user
    const local = loadBookings(phone);
    setBookings(local);

    // Sync bookings for the newly logged user immediately
    if (isSupabaseConfigured()) {
      setLoadingOverlay(true);
      setOverlayMessage('Synchronisation de vos réservations...');
      import('./supabase').then((moduleObj) => {
        moduleObj.mesTickets(phone).then((res) => {
          if (res) {
            setBookings(res);
            saveBookings(res, phone);
          }
        }).catch((err) => {
          console.error("Retrieval error for login success bookings:", err);
        }).finally(() => {
          setLoadingOverlay(false);
        });
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dem_is_logged_in');
    localStorage.removeItem('dem_client_fullname');
    localStorage.removeItem('dem_client_phone');
    setClientFullName('');
    setClientPhone('');
    setIsLoggedIn(false);
    setBookings([]);
    setScreen('login');
  };

  const handleFormValueChange = (fields: { phone?: string; fullName?: string }) => {
    if (fields.phone !== undefined) {
      setClientPhone(fields.phone);
      localStorage.setItem('dem_client_phone', fields.phone);
    }
    if (fields.fullName !== undefined) {
      setClientFullName(fields.fullName);
      localStorage.setItem('dem_client_fullname', fields.fullName);
    }
  };
  
  // Custom standard available routes list
  const defaultTrips = [
    { from: 'Dakar', to: 'Tivaouane', price: 6000 },
    { from: 'Tivaouane', to: 'Dakar', price: 6000 },
    { from: 'Dakar', to: 'Thiès', price: 5000 },
    { from: 'Thiès', to: 'Dakar', price: 5000 },
    { from: 'Dakar', to: 'Touba', price: 10000 },
    { from: 'Touba', to: 'Dakar', price: 10000 },
  ];

  // Dynamic trips from Supabase, initialized to the exact 6 requested routes
  const [availableTrips, setAvailableTrips] = useState<Array<{ from: string; to: string; price: number }>>(defaultTrips);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Full screen loading indicator states
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('Chargement...');

  // Selected trip state for standard form
  const [selectedTrip, setSelectedTrip] = useState<{
    from: string;
    to: string;
    price: number;
  } | null>(null);

  // Load bookings from localStorage & Supabase on mount
  useEffect(() => {
    const userPhoneOnMount = localStorage.getItem('dem_client_phone') || undefined;

    // 1. Instantly load locally backed-up bookings for this specific user
    const local = loadBookings(userPhoneOnMount);
    setBookings(local);

    // Helper to normalize strings for accent/case insensitive comparison
    const isSameLocation = (locA: string, locB: string) => {
      const norm = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      return norm(locA) === norm(locB);
    };

    // 2. Load active trips from Supabase if configured
    setLoadingTrips(true);
    chargerTrajets()
      .then((trips) => {
        // Map and merge Supabase custom values ONLY into the allowed 6 routes
        const mapped = defaultTrips.map((def) => {
          const dbTrip = trips.find((t: any) => 
            isSameLocation(t.ville_depart, def.from) && 
            isSameLocation(t.ville_arrivee, def.to)
          );
          if (dbTrip) {
            return {
              from: dbTrip.ville_depart,
              to: dbTrip.ville_arrivee,
              price: def.price, // Use corrected client-defined default price for consistent pricing
              id: dbTrip.id
            };
          }
          return def;
        });
        setAvailableTrips(mapped);
      })
      .catch((err) => {
        console.error("Failed to load trajets from Supabase on mount:", err);
        setAvailableTrips(defaultTrips);
      })
      .finally(() => {
        setLoadingTrips(false);
      });

    // 3. Fetch from Supabase database if configured for the logged-in user
    if (isSupabaseConfigured() && userPhoneOnMount) {
      mesTickets(userPhoneOnMount).then((sbBookings) => {
        if (sbBookings) {
          setBookings(sbBookings);
          saveBookings(sbBookings, userPhoneOnMount); // Sync local backup
        }
      }).catch(err => {
        console.error("Supabase load error:", err);
      });
    }
  }, []);

  // Sync a new booking with states, offline backups, and live Supabase storage
  const handleAddNewBooking = async (newBooking: BookingData) => {
    const updated = [newBooking, ...bookings];
    setBookings(updated);
    saveBookings(updated, clientPhone || undefined);

    if (isSupabaseConfigured() && !newBooking.db_id) {
      try {
        await insertSupabaseBooking(newBooking);
      } catch (err) {
        console.error("Supabase insert error:", err);
      }
    }
  };

  // Navigating to standard ticket form
  const handleSelectStandardTrip = (from: string, to: string, price: number) => {
    setSelectedTrip({ from, to, price });
    setScreen('standard-form');
  };

  // Navigating to airport ticket form
  const handleSelectAibdTrip = () => {
    setScreen('aibd-form');
  };

  // Submitting standard reservation ticket
  const handleStandardSubmit = async (data: {
    from: string;
    to: string;
    price: number;
    date: string;
    time: string;
    fullName: string;
    phone: string;
    departureAddress: string;
  }) => {
    setLoadingOverlay(true);
    setOverlayMessage('Création de votre réservation en cours...');
    setEmailStatusMessage(null); // Clear previous status
    try {
      const { voyageur, reservation, reference } = await confirmerReservation({
        nom: data.fullName,
        telephone: data.phone,
        adresse: data.departureAddress,
        villeDepart: data.from,
        villeArrivee: data.to,
        dateVoyage: data.date,
        heureDepart: data.time,
        trajetType: 'standard',
        bagage: false,
        clim: false
      });

      const newBooking: BookingData = {
        ...data,
        id: reference,
        db_id: reservation.id,
        tripType: 'standard',
        options: { baggage: false, ac: false },
        createdAt: reservation.created_at || new Date().toISOString()
      };

      // Push to stack
      const updated = [newBooking, ...bookings];
      setBookings(updated);
      saveBookings(updated, clientPhone || undefined);

      setActiveBooking(newBooking);
      setScreen('ticket');

      // Attempt to send confirmation email via EmailJS (non-blocking for screen transition)
      try {
        await sendReservationEmail({
          reservation_code: reference,
          trajet: `${data.from} → ${data.to}`,
          date: data.date,
          heure: data.time,
          pickup: data.departureAddress,
          passagers: 1,
          prix_total: `${(data.price * 1).toLocaleString()} FCFA`,
          client_nom: data.fullName,
          client_telephone: data.phone,
          jstelephone: clientPhone || data.phone || "Non renseigné"
        });
        setEmailStatusMessage("✅ Réservation confirmée ! Un e-mail de confirmation a été envoyé.");
      } catch (emailErr: any) {
        console.error("EmailJS standard booking notification skipped/failed:", emailErr);
        setEmailStatusMessage("✅ Réservation confirmée avec succès ! (Échec de l'envoi de l'e-mail)");
      }
    } catch (err: any) {
      console.error("Erreur de réservation standard avec base distante, bascule locale:", err);
      
      const datePart = data.date && data.date.includes('-') 
        ? data.date.split('-').reverse().join('') 
        : (data.date || '000000').replace(/[^0-9]/g, '');
      const fallbackRef = `TK-${datePart || '000000'}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const fallbackBooking: BookingData = {
        ...data,
        id: fallbackRef,
        tripType: 'standard',
        options: { baggage: false, ac: false },
        createdAt: new Date().toISOString()
      };
      const updated = [fallbackBooking, ...bookings];
      setBookings(updated);
      saveBookings(updated, clientPhone || undefined);
      setActiveBooking(fallbackBooking);
      setScreen('ticket');

      // Attempt to send confirmation email anyway for offline mode
      try {
        await sendReservationEmail({
          reservation_code: fallbackRef,
          trajet: `${data.from} → ${data.to}`,
          date: data.date,
          heure: data.time,
          pickup: data.departureAddress,
          passagers: 1,
          prix_total: `${(data.price * 1).toLocaleString()} FCFA`,
          client_nom: data.fullName,
          client_telephone: data.phone,
          jstelephone: clientPhone || data.phone || "Non renseigné"
        });
        setEmailStatusMessage("✅ Réservation enregistrée ! Un e-mail de confirmation a été envoyé.");
      } catch (emailErr: any) {
        console.error("EmailJS offline booking notification failed:", emailErr);
        setEmailStatusMessage("✅ Réservation enregistrée avec succès !");
      }
    } finally {
      setLoadingOverlay(false);
    }
  };

  // Submitting special AIBD reservation ticket
  const handleAibdSubmit = async (data: {
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
  }) => {
    setLoadingOverlay(true);
    setOverlayMessage('Création de votre réservation spéciale Navette Aéroport...');
    setEmailStatusMessage(null); // Clear previous status
    try {
      const { voyageur, reservation, reference } = await confirmerReservation({
        nom: data.fullName,
        telephone: data.phone,
        adresse: data.departureAddress,
        villeDepart: data.from,
        villeArrivee: data.to,
        dateVoyage: data.date,
        heureDepart: data.time,
        trajetType: 'aibd',
        bagage: data.options.baggage,
        clim: data.options.ac
      });

      const newBooking: BookingData = {
        ...data,
        id: reference,
        db_id: reservation.id,
        tripType: 'aibd',
        createdAt: reservation.created_at || new Date().toISOString()
      };

      // Push to stack
      const updated = [newBooking, ...bookings];
      setBookings(updated);
      saveBookings(updated, clientPhone || undefined);

      setActiveBooking(newBooking);
      setScreen('ticket');

      // Attempt to send confirmation email via EmailJS (non-blocking for screen transition)
      try {
        await sendReservationEmail({
          reservation_code: reference,
          trajet: `${data.from} → ${data.to}`,
          date: data.date,
          heure: data.time,
          pickup: data.departureAddress,
          passagers: 1,
          prix_total: `${(data.price * 1).toLocaleString()} FCFA`,
          client_nom: data.fullName,
          client_telephone: data.phone,
          jstelephone: clientPhone || data.phone || "Non renseigné"
        });
        setEmailStatusMessage("✅ Réservation Navette confirmée ! Un e-mail de confirmation a été envoyé.");
      } catch (emailErr: any) {
        console.error("EmailJS AIBD booking notification skipped/failed:", emailErr);
        setEmailStatusMessage("✅ Réservation confirmée avec succès ! (Échec de l'envoi de l'e-mail)");
      }
    } catch (err: any) {
      console.error("Erreur de réservation Navette avec base distante, bascule locale:", err);
      
      const datePart = data.date && data.date.includes('-') 
        ? data.date.split('-').reverse().join('') 
        : (data.date || '000000').replace(/[^0-9]/g, '');
      const fallbackRef = `TK-${datePart || '000000'}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const fallbackBooking: BookingData = {
        ...data,
        id: fallbackRef,
        tripType: 'aibd',
        createdAt: new Date().toISOString()
      };
      const updated = [fallbackBooking, ...bookings];
      setBookings(updated);
      saveBookings(updated, clientPhone || undefined);
      setActiveBooking(fallbackBooking);
      setScreen('ticket');

      // Attempt to send confirmation email anyway for offline mode
      try {
        await sendReservationEmail({
          reservation_code: fallbackRef,
          trajet: `${data.from} → ${data.to}`,
          date: data.date,
          heure: data.time,
          pickup: data.departureAddress,
          passagers: 1,
          prix_total: `${(data.price * 1).toLocaleString()} FCFA`,
          client_nom: data.fullName,
          client_telephone: data.phone,
          jstelephone: clientPhone || data.phone || "Non renseigné"
        });
        setEmailStatusMessage("✅ Réservation Navette enregistrée ! Un e-mail de confirmation a été envoyé.");
      } catch (emailErr: any) {
        console.error("EmailJS offline navette booking notification failed:", emailErr);
        setEmailStatusMessage("✅ Réservation Navette confirmée avec succès !");
      }
    } finally {
      setLoadingOverlay(false);
    }
  };

  // Select historical booking item from list
  const handleSelectBooking = (booking: BookingData) => {
    setEmailStatusMessage(null); // Clear previous email status
    setActiveBooking(booking);
    setScreen('ticket');
  };

  // Delete booking from list
  const handleDeleteBooking = async (id: string) => {
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    saveBookings(updated, clientPhone || undefined);

    if (isSupabaseConfigured()) {
      try {
        await deleteSupabaseBooking(id);
      } catch (err) {
        console.error("Supabase delete error:", err);
      }
    }
  };

  // Base motion transition specs for high fluid premium interaction
  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } }
  };

  return (
    <div className="min-h-screen bg-[#EEF2FF] flex justify-center items-stretch w-full overflow-x-hidden">
      
      {/* CENTRAL MAX-WIDTH RESPONSIVE MOBILE-FIRST APPNET SHELL */}
      <div className="w-full max-w-md bg-[#EEF2FF] flex flex-col shadow-xl min-h-screen relative border-x border-indigo-150/40">
        
        <AnimatePresence mode="wait">
          
          {screen === 'login' && (
            <motion.div
              key="login"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="flex-1 flex flex-col h-full"
            >
              <LoginView
                onLoginSuccess={handleLoginSuccess}
              />
            </motion.div>
          )}

          {screen === 'home' && (
            <motion.div
              key="home"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="flex-1 flex flex-col h-full"
            >
              <HomeView
                onSelectStandardTrip={handleSelectStandardTrip}
                onSelectAibdTrip={handleSelectAibdTrip}
                onViewMyTickets={() => setScreen('my-tickets')}
                savedBookingsCount={bookings.length}
                availableTrips={availableTrips}
                onLogout={handleLogout}
                clientFullName={clientFullName}
              />
            </motion.div>
          )}

          {screen === 'standard-form' && selectedTrip && (
            <motion.div
              key="standard-form"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="flex-1 h-full"
            >
              <StandardFormView
                from={selectedTrip.from}
                to={selectedTrip.to}
                price={selectedTrip.price}
                onBack={() => setScreen('home')}
                onSubmit={handleStandardSubmit}
                defaultPhone={clientPhone}
                defaultFullName={clientFullName}
                onValueChange={handleFormValueChange}
              />
            </motion.div>
          )}

          {screen === 'aibd-form' && (
            <motion.div
              key="aibd-form"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="flex-1 h-full"
            >
              <AibdFormView
                onBack={() => setScreen('home')}
                onSubmit={handleAibdSubmit}
                defaultPhone={clientPhone}
                defaultFullName={clientFullName}
                onValueChange={handleFormValueChange}
              />
            </motion.div>
          )}

          {screen === 'ticket' && activeBooking && (
            <motion.div
              key="ticket"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="flex-1 h-full"
            >
              <TicketView
                booking={activeBooking}
                onHome={() => setScreen('home')}
                emailStatusMessage={emailStatusMessage}
              />
            </motion.div>
          )}

          {screen === 'my-tickets' && (
            <motion.div
              key="my-tickets"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="flex-1 h-full"
            >
              <MyTicketsView
                bookings={bookings}
                onBack={() => setScreen('home')}
                onSelectBooking={handleSelectBooking}
                onDeleteBooking={handleDeleteBooking}
                onUpdateBookings={(updated) => {
                  setBookings(updated);
                  saveBookings(updated, clientPhone || undefined);
                }}
                onSearchPhone={(phone) => handleFormValueChange({ phone })}
                clientPhone={clientPhone}
              />
            </motion.div>
          )}

        </AnimatePresence>

        {loadingOverlay && (
          <div className="fixed inset-0 bg-[#0D1B4B]/75 backdrop-blur-sm flex flex-col justify-center items-center z-[9999] text-white font-sans select-none animate-fadeIn">
            <div className="w-12 h-12 border-4 border-[#F4841C] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-sm tracking-wide text-center px-4">{overlayMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
