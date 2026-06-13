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

  // Helper to upload base64 audio directly to Cloudinary using unsigned preset 'vocal_preset'
  const uploadAudioToCloudinary = async (base64Data: string): Promise<string | undefined> => {
    try {
      const formData = new FormData();
      formData.append("file", base64Data);
      formData.append("upload_preset", "vocal_preset");

      console.log("[Cloudinary Upload] Initiating audio upload to Cloudinary...");

      // Try uploading to 'video' resource type endpoint (standard for audio in Cloudinary)
      const response = await fetch("https://api.cloudinary.com/v1_1/dph5skwuz/video/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[Cloudinary Upload] Success via /video/upload:", data.secure_url || data.url);
        return data.secure_url || data.url;
      } else {
        const errorText = await response.text();
        console.warn("[Cloudinary Upload] /video/upload failed, trying /auto/upload fallback. Error:", errorText);

        // Fallback retry with 'auto' dynamic detection endpoint
        const retryResponse = await fetch("https://api.cloudinary.com/v1_1/dph5skwuz/auto/upload", {
          method: "POST",
          body: formData,
        });
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          console.log("[Cloudinary Upload] Success via /auto/upload:", data.secure_url || data.url);
          return data.secure_url || data.url;
        } else {
          const retryErrorText = await retryResponse.text();
          console.warn("[Cloudinary Upload] /auto/upload failed, trying /raw/upload fallback. Error:", retryErrorText);

          // Fallback retry with 'raw' format
          const rawResponse = await fetch("https://api.cloudinary.com/v1_1/dph5skwuz/raw/upload", {
            method: "POST",
            body: formData,
          });
          if (rawResponse.ok) {
            const data = await rawResponse.json();
            console.log("[Cloudinary Upload] Success via /raw/upload:", data.secure_url || data.url);
            return data.secure_url || data.url;
          } else {
            const rawErrorText = await rawResponse.text();
            console.error("[Cloudinary Upload] All Cloudinary upload routes failed. Final error:", rawErrorText);
          }
        }
      }
    } catch (error) {
      console.error("Cloudinary voice upload error:", error);
    }
    return undefined;
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
    audioBase64?: string | null;
  }) => {
    setLoadingOverlay(true);
    setOverlayMessage('Création de votre réservation en cours...');
    setEmailStatusMessage(null); // Clear previous status

    let voiceUrl: string | undefined = undefined;
    if (data.audioBase64) {
      setOverlayMessage('Envoi du message vocal...');
      voiceUrl = await uploadAudioToCloudinary(data.audioBase64);
    }

    setOverlayMessage('Création de votre réservation en cours...');
    const absoluteVoiceUrl = voiceUrl;

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
        voiceMessageUrl: absoluteVoiceUrl,
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
          jstelephone: clientPhone || data.phone || "Non renseigné",
          message_vocal: absoluteVoiceUrl
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
        voiceMessageUrl: absoluteVoiceUrl,
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
          jstelephone: clientPhone || data.phone || "Non renseigné",
          message_vocal: absoluteVoiceUrl
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
    audioBase64?: string | null;
  }) => {
    setLoadingOverlay(true);
    setOverlayMessage('Création de votre réservation spéciale Navette Aéroport...');
    setEmailStatusMessage(null); // Clear previous status

    let voiceUrl: string | undefined = undefined;
    if (data.audioBase64) {
      setOverlayMessage('Envoi du message vocal...');
      voiceUrl = await uploadAudioToCloudinary(data.audioBase64);
    }

    setOverlayMessage('Création de votre réservation spéciale Navette Aéroport...');
    const absoluteVoiceUrl = voiceUrl;

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
        voiceMessageUrl: absoluteVoiceUrl,
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
          jstelephone: clientPhone || data.phone || "Non renseigné",
          message_vocal: absoluteVoiceUrl
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
        voiceMessageUrl: absoluteVoiceUrl,
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
          jstelephone: clientPhone || data.phone || "Non renseigné",
          message_vocal: absoluteVoiceUrl
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

      {/* FLOATING WHATSAPP BUTTON */}
      <motion.a
        id="whatsapp-floating-btn"
        href="https://wa.me/221772783150?text=Bonjour%2C%20je%20souhaite%20obtenir%20des%20informations%20concernant%20les%20trajets%20de%20navette."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-xl z-[1000] cursor-pointer opacity-85 hover:opacity-100 hover:bg-[#20ba5a] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300 select-none"
        whileHover={{ scale: 1.15, rotate: 6 }}
        whileTap={{ scale: 0.9 }}
        title="Contactez-nous sur WhatsApp"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20, delay: 0.5 } }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 448 512" 
          className="w-7 h-7 fill-white"
          aria-label="WhatsApp"
        >
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
        </svg>
      </motion.a>
    </div>
  );
}
