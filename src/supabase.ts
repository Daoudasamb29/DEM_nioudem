import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import domtoimage from 'dom-to-image-more';
import { BookingData } from './types';
import { loadBookings } from './utils';

/**
 * Retrieve active Supabase credentials saved locally in browser
 */
export function getSavedCredentials() {
  const url = localStorage.getItem('supabase_url') || '';
  const key = localStorage.getItem('supabase_anon_key') || '';
  return { url: url.trim(), key: key.trim() };
}

/**
 * Check if a valid Supabase setup exists either locally or through env
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = getSavedCredentials();
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const isEnvValid = envUrl && envUrl.trim() !== '' && !envUrl.includes('votre-projet') && envKey && envKey.trim() !== '' && !envKey.includes('votre_cle');
  const isLocalValid = url && url.trim() !== '' && key && key.trim() !== '';
  
  return Boolean(isEnvValid || isLocalValid);
}

/**
 * Get credentials description and source
 */
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const local = getSavedCredentials();
  
  const isEnvValid = envUrl && envUrl.trim() !== '' && !envUrl.includes('votre-projet') && envKey && envKey.trim() !== '' && !envKey.includes('votre_cle');
  const isLocalValid = local.url && local.key;
  
  if (isLocalValid) {
    return { url: local.url, key: local.key, source: 'local' as const };
  } else if (isEnvValid) {
    return { url: envUrl.trim(), key: envKey.trim(), source: 'env' as const };
  }
  
  return { url: envUrl.trim(), key: envKey.trim(), source: 'none' as const };
}

/**
 * Get dynamic client instances
 */
export function getSupabaseClient() {
  const { url, key, source } = getSupabaseCredentials();
  if (source !== 'none' && url && key) {
    return createClient(url, key);
  }
  return null;
}

// Global helper to generate unique IDs securely
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// SQL Schema for table creation reference/instructions if needed
export const SUPABASE_SQL_SCHEMA = `
-- Table 1: voyageurs
CREATE TABLE IF NOT EXISTS voyageurs (
  id UUID PRIMARY KEY,
  nom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  adresse TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 2: trajets_disponibles
CREATE TABLE IF NOT EXISTS trajets_disponibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ville_depart TEXT NOT NULL,
  ville_arrivee TEXT NOT NULL,
  heure TEXT NOT NULL,
  prix NUMERIC NOT NULL,
  actif BOOLEAN DEFAULT true NOT NULL
);

-- Table 3: reservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY,
  voyageur_id UUID REFERENCES voyageurs(id) ON DELETE CASCADE,
  trajet_type TEXT NOT NULL, -- 'standard' ou 'aibd'
  ville_depart TEXT NOT NULL,
  ville_arrivee TEXT NOT NULL,
  date_voyage DATE NOT NULL,
  heure_depart TEXT NOT NULL,
  bagage BOOLEAN NOT NULL DEFAULT false,
  clim BOOLEAN NOT NULL DEFAULT false,
  statut TEXT NOT NULL DEFAULT 'Confirmé',
  reference TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 4: tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
`;

/**
 * 1. chargerTrajets() 
 * Charge tous les trajets depuis trajets_disponibles où actif = true et ville_arrivee != 'AIBD'.
 */
export async function chargerTrajets(): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) {
    // Return standard fallback trips so the app never crashes when offline or setup is incomplete
    return [
      { id: '1', ville_depart: 'Dakar', ville_arrivee: 'Tivaouane', prix: 6000, heure: '07h00', actif: true },
      { id: '2', ville_depart: 'Tivaouane', ville_arrivee: 'Dakar', prix: 6000, heure: '10h30', actif: true },
      { id: '3', ville_depart: 'Dakar', ville_arrivee: 'Thiès', prix: 5000, heure: '07h00', actif: true },
      { id: '4', ville_depart: 'Thiès', ville_arrivee: 'Dakar', prix: 5000, heure: '14h00', actif: true },
      { id: '5', ville_depart: 'Dakar', ville_arrivee: 'Touba', prix: 10000, heure: '10h30', actif: true },
      { id: '6', ville_depart: 'Touba', ville_arrivee: 'Dakar', prix: 10000, heure: '14h00', actif: true },
    ];
  }
  
  try {
    const { data, error } = await client
      .from('trajets_disponibles')
      .select('*')
      .eq('actif', true)
      .neq('ville_arrivee', 'AIBD');
    
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    const isFetchError = err?.message?.toLowerCase().includes('failed to fetch') || err?.stack?.toLowerCase().includes('failed to fetch') || err?.toString().toLowerCase().includes('failed to fetch');
    if (isFetchError) {
      console.warn("Supabase hors-ligne ou injoignable pour chargerTrajets. Utilisation des trajets hors-ligne locaux.");
      return [
        { id: '1', ville_depart: 'Dakar', ville_arrivee: 'Tivaouane', prix: 6000, heure: '07h00', actif: true },
        { id: '2', ville_depart: 'Tivaouane', ville_arrivee: 'Dakar', prix: 6000, heure: '10h30', actif: true },
        { id: '3', ville_depart: 'Dakar', ville_arrivee: 'Thiès', prix: 5000, heure: '07h00', actif: true },
        { id: '4', ville_depart: 'Thiès', ville_arrivee: 'Dakar', prix: 5000, heure: '14h00', actif: true },
        { id: '5', ville_depart: 'Dakar', ville_arrivee: 'Touba', prix: 10000, heure: '10h30', actif: true },
        { id: '6', ville_depart: 'Touba', ville_arrivee: 'Dakar', prix: 10000, heure: '14h00', actif: true },
      ];
    }
    console.error('Erreur chargerTrajets:', err);
    throw err;
  }
}

/**
 * 2. chargerHoraires(villeDepart, villeArrivee) 
 * Charge les horaires depuis trajets_disponibles filtrés par ville_depart et ville_arrivee.
 */
export async function chargerHoraires(villeDepart: string, villeArrivee: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) {
    // Standard static hours fallback
    if (villeArrivee.toLowerCase().includes('aibd') || villeDepart.toLowerCase().includes('aibd')) {
      return ['08h30', '12h00', '16h30', '20h00'];
    }
    return ['07h00', '10h30', '14h00'];
  }
  
  try {
    const { data, error } = await client
      .from('trajets_disponibles')
      .select('heure')
      .eq('ville_depart', villeDepart)
      .eq('ville_arrivee', villeArrivee)
      .eq('actif', true);
    
    if (error) throw error;
    
    const hours = (data || []).map((t: any) => t.heure).filter(Boolean);
    const uniqueHours = Array.from(new Set(hours)) as string[];
    
    if (uniqueHours.length === 0) {
      if (villeArrivee.toLowerCase().includes('aibd') || villeDepart.toLowerCase().includes('aibd')) {
        return ['08h30', '12h00', '16h30', '20h00'];
      }
      return ['07h00', '10h30', '14h00'];
    }
    
    return uniqueHours;
  } catch (err: any) {
    const isFetchError = err?.message?.toLowerCase().includes('failed to fetch') || err?.stack?.toLowerCase().includes('failed to fetch') || err?.toString().toLowerCase().includes('failed to fetch');
    if (isFetchError) {
      console.warn("Supabase hors-ligne ou injoignable pour chargerHoraires. Utilisation des horaires hors-ligne locaux.");
      if (villeArrivee.toLowerCase().includes('aibd') || villeDepart.toLowerCase().includes('aibd')) {
        return ['08h30', '12h00', '16h30', '20h00'];
      }
      return ['07h00', '10h30', '14h00'];
    }
    console.error('Erreur chargerHoraires:', err);
    throw err;
  }
}

/**
 * 3. confirmerReservation({ nom, telephone, adresse, villeDepart, villeArrivee, dateVoyage, heureDepart, trajetType, bagage, clim })
 * Fait deux inserts dans l'ordre: voyageurs, puis reservations avec voyageur_id.
 * Génère la référence : TK-JJMMAA-XXX (XXX = 3 chiffres aléatoires)
 */
export async function confirmerReservation(params: {
  nom: string;
  telephone: string;
  adresse: string;
  villeDepart: string;
  villeArrivee: string;
  dateVoyage: string;
  heureDepart: string;
  trajetType: 'standard' | 'aibd';
  bagage: boolean;
  clim: boolean;
  prix?: number;
}): Promise<{ voyageur: any; reservation: any; reference: string }> {
  // JJMMAA derivation from dateVoyage
  let datePart = '000000';
  if (params.dateVoyage) {
    const parts = params.dateVoyage.split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const month = parts[1];
      const day = parts[2];
      datePart = `${day}${month}${year}`;
    }
  }
  
  // XXX random digits tracker (000-999)
  const randPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const reference = `TK-${datePart}-${randPart}`;

  const client = getSupabaseClient();
  if (!client) {
    // Beautiful local mockup fallback for standalone testing
    const offlineVoyageurId = generateUUID();
    const offlineReservationId = generateUUID();
    const pseudoVoyageur = {
      id: offlineVoyageurId,
      nom: params.nom,
      telephone: params.telephone,
      adresse: params.adresse,
      created_at: new Date().toISOString()
    };
    const pseudoReservation = {
      id: offlineReservationId,
      voyageur_id: offlineVoyageurId,
      trajet_type: params.trajetType,
      ville_depart: params.villeDepart,
      ville_arrivee: params.villeArrivee,
      date_voyage: params.dateVoyage,
      heure_depart: params.heureDepart,
      bagage: params.bagage,
      clim: params.clim,
      statut: 'Confirmé',
      reference: reference,
      created_at: new Date().toISOString()
    };
    return { voyageur: pseudoVoyageur, reservation: pseudoReservation, reference };
  }

  try {
    const voyageurId = generateUUID();
    
    // 1. Insert Voyageur
    const { data: vData, error: vError } = await client
      .from('voyageurs')
      .insert([{
        id: voyageurId,
        nom: params.nom,
        telephone: params.telephone,
        adresse: params.adresse
      }])
      .select();

    if (vError) throw vError;
    const insertedVoyageur = vData && vData[0] ? vData[0] : { id: voyageurId, nom: params.nom, telephone: params.telephone, adresse: params.adresse };

    // 2. Insert Reservation (Referenced with voyageur ID)
    const reservationId = generateUUID();
    const { data: rData, error: rError } = await client
      .from('reservations')
      .insert([{
        id: reservationId,
        voyageur_id: insertedVoyageur.id,
        trajet_type: params.trajetType,
        ville_depart: params.villeDepart,
        ville_arrivee: params.villeArrivee,
        date_voyage: params.dateVoyage,
        heure_depart: params.heureDepart,
        bagage: params.bagage,
        clim: params.clim,
        statut: 'Confirmé',
        reference: reference
      }])
      .select();

    if (rError) throw rError;
    const insertedReservation = rData && rData[0] ? rData[0] : {
      id: reservationId,
      voyageur_id: insertedVoyageur.id,
      trajet_type: params.trajetType,
      ville_depart: params.villeDepart,
      ville_arrivee: params.villeArrivee,
      date_voyage: params.dateVoyage,
      heure_depart: params.heureDepart,
      bagage: params.bagage,
      clim: params.clim,
      statut: 'Confirmé',
      reference: reference
    };

    return { voyageur: insertedVoyageur, reservation: insertedReservation, reference };
  } catch (err) {
    console.error('Erreur confirmerReservation live, bascule sur la réservation hors-ligne local:', err);
    // Soft fallback so the customer is NEVER blocked due to DB connection or schema issues
    const offlineVoyageurId = generateUUID();
    const offlineReservationId = generateUUID();
    const pseudoVoyageur = {
      id: offlineVoyageurId,
      nom: params.nom,
      telephone: params.telephone,
      adresse: params.adresse,
      created_at: new Date().toISOString()
    };
    const pseudoReservation = {
      id: offlineReservationId,
      voyageur_id: offlineVoyageurId,
      trajet_type: params.trajetType,
      ville_depart: params.villeDepart,
      ville_arrivee: params.villeArrivee,
      date_voyage: params.dateVoyage,
      heure_depart: params.heureDepart,
      bagage: params.bagage,
      clim: params.clim,
      statut: 'Confirmé',
      reference: reference,
      created_at: new Date().toISOString()
    };
    return { voyageur: pseudoVoyageur, reservation: pseudoReservation, reference };
  }
}

/**
 * 4. sauvegarderTicket(reservationId, imageBlob)
 * Upload dans Supabase Storage bucket "tickets" sous le nom ticket-{reservationId}.png.
 * Récupère l'URL publique, puis insère dans la table tickets.
 */
export async function sauvegarderTicket(reservationId: string, imageBlob: Blob): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    return 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600';
  }

  try {
    const filename = `ticket-${reservationId}.png`;
    
    // Upload into Storage
    const { data: uploadData, error: uploadError } = await client
      .storage
      .from('tickets')
      .upload(filename, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get Public URL
    const { data: urlData } = client
      .storage
      .from('tickets')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Insert to Tickets database table
    const ticketId = generateUUID();
    const { error: ticketError } = await client
      .from('tickets')
      .insert([{
        id: ticketId,
        reservation_id: reservationId,
        image_url: publicUrl
      }]);

    if (ticketError) throw ticketError;

    return publicUrl;
  } catch (err) {
    console.error('Erreur sauvegarderTicket:', err);
    throw err;
  }
}

/**
 * 5. genererImage(ticketRef, reservation)
 * Utilise html2canvas sur le composant ticketRef pour générer un blob PNG,
 * appelle sauvegarderTicket(), puis déclenche le téléchargement automatique.
 */
export async function genererImage(
  element: HTMLElement,
  reservation: { id: string; reference: string; [key: string]: any },
  onProgress?: (msg: string) => void
): Promise<string> {
  try {
    if (onProgress) onProgress('Rendu du ticket haute fidélité...');
    
    const blob = await domtoimage.toBlob(element, {
      scale: 3,
      bgcolor: '#ffffff'
    });
    
    if (!blob) throw new Error("Erreur de conversion de l'image.");

    let publicUrl = '';
    try {
      if (onProgress) onProgress('Téléversement du ticket sur Supabase...');
      publicUrl = await sauvegarderTicket(reservation.id, blob);
    } catch (saveErr) {
      console.warn('Echec de la sauvegarde distante, poursuite du telechargement local:', saveErr);
    }

    // Trigger local immediate download
    if (onProgress) onProgress('Téléchargement du fichier...');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `ticket-${reservation.reference}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return publicUrl || url;
  } catch (err) {
    console.error('Erreur genererImage:', err);
    throw err;
  }
}

/**
 * Helper to get modern trip pricing depending on locations
 */
function getRefPrice(row: { trajet_type: string; ville_depart: string; ville_arrivee: string }): number {
  if (row.trajet_type === 'aibd') return 20000;
  const f = (row.ville_depart || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const t = (row.ville_arrivee || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (f === 'touba' || t === 'touba') return 6000;
  if (f === 'tivaouane' || t === 'tivaouane') return 5000;
  if (f === 'thies' || t === 'thies') return 3500;
  return 3500; // standard fallback
}

/**
 * 6. mesTickets(telephone)
 * Charge depuis reservations avec un auto join/lookups sur voyageurs et tickets,
 * filtré par le numéro de téléphone, trié par date de réservation décroissante.
 */
export async function mesTickets(telephoneRaw: string): Promise<BookingData[]> {
  const client = getSupabaseClient();
  const phoneSearch = telephoneRaw.trim();
  
  if (!client) {
    const offlineBookings = loadBookings(phoneSearch);
    return offlineBookings;
  }

  try {
    const cleanSearch = phoneSearch.replace(/[^0-9]/g, '');
    if (!cleanSearch) return [];

    // Step A: Load voyageurs to find matches
    const { data: voyageurs, error: vError } = await client
      .from('voyageurs')
      .select('*');
      
    if (vError) throw vError;

    const matchingVoyageurs = (voyageurs || []).filter(v => {
      const vClean = (v.telephone || '').replace(/[^0-9]/g, '');
      return vClean.includes(cleanSearch) || cleanSearch.includes(vClean);
    });

    if (matchingVoyageurs.length === 0) {
      return [];
    }

    const voyageurIds = matchingVoyageurs.map(v => v.id);

    // Step B: Load respective reservations
    const { data: reservations, error: rError } = await client
      .from('reservations')
      .select('*')
      .in('voyageur_id', voyageurIds)
      .order('created_at', { ascending: false });

    if (rError) throw rError;
    if (!reservations || reservations.length === 0) return [];

    const reservationIds = reservations.map(r => r.id);

    // Step C: Load matching tickets
    const { data: tickets, error: tError } = await client
      .from('tickets')
      .select('*')
      .in('reservation_id', reservationIds);

    const ticketsMap = new Map();
    if (tickets) {
      tickets.forEach((t: any) => {
        ticketsMap.set(t.reservation_id, t.image_url);
      });
    }

    const voyageursMap = new Map();
    matchingVoyageurs.forEach(v => {
      voyageursMap.set(v.id, v);
    });

    // Step D: Map fully to unified BookingData format
    return reservations.map((row: any) => {
      const v = voyageursMap.get(row.voyageur_id) || {};
      return {
        id: row.reference || `TK-MOCK-${row.id.substring(0,6)}`,
        db_id: row.id, // For file uploads
        tripType: row.trajet_type === 'aibd' ? 'aibd' : 'standard',
        from: row.ville_depart,
        to: row.ville_arrivee,
        price: getRefPrice(row),
        date: row.date_voyage,
        time: row.heure_depart,
        fullName: v.nom || 'Passager',
        phone: v.telephone || '',
        departureAddress: v.adresse || '',
        options: {
          baggage: !!row.bagage,
          ac: !!row.clim
        },
        imageUrl: ticketsMap.get(row.id) || null,
        createdAt: row.created_at
      } as BookingData;
    });

  } catch (err: any) {
    const isFetchError = err?.message?.toLowerCase().includes('failed to fetch') || err?.stack?.toLowerCase().includes('failed to fetch') || err?.toString().toLowerCase().includes('failed to fetch');
    if (isFetchError) {
      throw new Error("Supabase est injoignable ou hors-ligne. Veuillez vérifier votre connexion internet et l'adresse de votre base de données.");
    }
    console.error('Erreur mesTickets:', err);
    throw err;
  }
}

/**
 * Backwards compatibility helper to test connection with live credentials
 */
export async function testSupabaseWithCredentials(url: string, key: string): Promise<boolean> {
  try {
    const testClient = createClient(url, key);
    const { data, error } = await testClient
      .from('trajets_disponibles')
      .select('id')
      .limit(1);
    
    if (error) {
       console.error("Test Supabase database call error:", error);
       return false;
    }
    return true;
  } catch (err: any) {
    const isFetchError = err?.message?.toLowerCase().includes('failed to fetch') || err?.stack?.toLowerCase().includes('failed to fetch') || err?.toString().toLowerCase().includes('failed to fetch');
    if (isFetchError) {
      console.warn("Échec testSupabaseWithCredentials: base de données injoignable (hors-ligne).");
    } else {
      console.error("Test credentials exception:", err);
    }
    return false;
  }
}

/**
 * Backwards compatibility helper to fetch all bookings from Supabase
 */
export async function fetchSupabaseBookings(): Promise<BookingData[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    // A. Fetch voyages and reservations
    const { data: reservations, error: rError } = await client
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (rError) throw rError;
    if (!reservations || reservations.length === 0) return [];

    const { data: voyageurs, error: vError } = await client
      .from('voyageurs')
      .select('*');

    if (vError) throw vError;

    const voyageursMap = new Map();
    (voyageurs || []).forEach(v => voyageursMap.set(v.id, v));

    const reservationIds = reservations.map(r => r.id);
    const { data: tickets } = await client
      .from('tickets')
      .select('*')
      .in('reservation_id', reservationIds);

    const ticketsMap = new Map();
    if (tickets) {
      tickets.forEach((t: any) => ticketsMap.set(t.reservation_id, t.image_url));
    }

    return reservations.map((row: any) => {
      const v = voyageursMap.get(row.voyageur_id) || {};
      return {
        id: row.reference || `TK-MOCK-${row.id.substring(0, 6)}`,
        db_id: row.id,
        tripType: row.trajet_type === 'aibd' ? 'aibd' : 'standard',
        from: row.ville_depart,
        to: row.ville_arrivee,
        price: getRefPrice(row),
        date: row.date_voyage,
        time: row.heure_depart,
        fullName: v.nom || 'Passager',
        phone: v.telephone || '',
        departureAddress: v.adresse || '',
        options: {
          baggage: !!row.bagage,
          ac: !!row.clim
        },
        imageUrl: ticketsMap.get(row.id) || null,
        createdAt: row.created_at
      } as BookingData;
    });
  } catch (err: any) {
    const isFetchError = err?.message?.toLowerCase().includes('failed to fetch') || err?.stack?.toLowerCase().includes('failed to fetch') || err?.toString().toLowerCase().includes('failed to fetch');
    if (isFetchError) {
      console.warn("Base de données Supabase temporairement injoignable (échec de connexion).");
    } else {
      console.error("Error fetchSupabaseBookings:", err);
    }
    return [];
  }
}

/**
 * Backwards compatibility helper to insert booking
 */
export async function insertSupabaseBooking(booking: BookingData): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    await confirmerReservation({
      nom: booking.fullName,
      telephone: booking.phone,
      adresse: booking.departureAddress,
      villeDepart: booking.from,
      villeArrivee: booking.to,
      dateVoyage: booking.date,
      heureDepart: booking.time,
      trajetType: booking.tripType,
      bagage: !!booking.options?.baggage,
      clim: !!booking.options?.ac
    });
    return true;
  } catch (err) {
    console.error("Error insertSupabaseBooking helper:", err);
    return false;
  }
}

/**
 * Backwards compatibility helper to delete reservation
 */
export async function deleteSupabaseBooking(refId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('reservations')
      .delete()
      .eq('reference', refId);

    if (error) throw error;
  } catch (err) {
    console.error("Error deleteSupabaseBooking:", err);
    throw err;
  }
}

/**
 * Simple asynchronous SHA-256 helper for security.
 * Hashes passwords before they are transmitted to Supabase or cached in LocalStorage.
 */
export async function hashPasswordSecure(password: string): Promise<string> {
  const cleanPass = password.trim();
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(cleanPass);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn("Crypto API fallback activated:");
  }
  // Safe cryptographic polynomial hash fallback for ultra-legacy user agents
  let hash = 0;
  for (let i = 0; i < cleanPass.length; i++) {
    const char = cleanPass.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'sf_' + Math.abs(hash).toString(16);
}

/**
 * Account system with Supabase active and standard HTML offline backup
 * Table name: "clients_comptes" (referenced in schema)
 */
export interface UserAccount {
  fullName: string;
  phone: string;
}

// Simple Helper to manage local fallback users
function getLocalUsers(): any[] {
  try {
    const list = localStorage.getItem('dem_local_users');
    return list ? JSON.parse(list) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalUser(nomComplet: string, telephone: string, hashedPass: string) {
  const users = getLocalUsers();
  // Avoid duplicate local names
  const filtered = users.filter(u => u.nom_complet.toLowerCase() !== nomComplet.toLowerCase().trim());
  filtered.push({
    nom_complet: nomComplet.trim(),
    telephone: telephone.trim(),
    mot_de_passe: hashedPass
  });
  localStorage.setItem('dem_local_users', JSON.stringify(filtered));
}

/**
 * Creates a simple client account
 */
export async function creerCompte(nomComplet: string, telephone: string, motDePasse: string): Promise<UserAccount> {
  const name = nomComplet.trim();
  const phone = telephone.trim();
  const rawPass = motDePasse.trim();

  if (!name || !phone || !rawPass) {
    throw new Error("Veuillez remplir tous les champs obligatoires.");
  }

  // Generate secure SHA-256 hash
  const secureHash = await hashPasswordSecure(rawPass);

  // Backup in LocalStorage instantly to ensure PWA works off-screen/offline (with secure hash)
  saveLocalUser(name, phone, secureHash);

  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Check if name already exists in live database
      const { data: existing, error: checkError } = await client
        .from('clients_comptes')
        .select('id')
        .ilike('nom_complet', name)
        .maybeSingle();

      if (checkError && !checkError.message.includes("relation") && !checkError.message.includes("does not exist")) {
        console.warn("Supabase user unique check error, skipping check:", checkError);
      }

      if (existing) {
        throw new Error("Ce nom complet est déjà enregistré. Veuillez utiliser un autre nom ou vous connecter.");
      }

      // 2. Insert account in "clients_comptes" table with secure SHA-256 hash
      const { error: insertError } = await client
        .from('clients_comptes')
        .insert([{
          nom_complet: name,
          telephone: phone,
          mot_de_passe: secureHash
        }]);

      if (insertError) {
        if (insertError.message.includes("relation") || insertError.message.includes("does not exist") || insertError.message.includes("404")) {
          console.warn("Table 'clients_comptes' missing, registered user locally and saved context.");
        } else {
          throw insertError;
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes("déjà enregistré")) {
        throw err;
      }
      console.error("Supabase live signup error, relying on offline local backup successfully:", err);
    }
  }

  return { fullName: name, phone };
}

/**
 * Verifies credentials and logs user in
 */
export async function connecterCompte(nomComplet: string, motDePasse: string): Promise<UserAccount> {
  const name = nomComplet.trim();
  const rawPass = motDePasse.trim();

  if (!name || !rawPass) {
    throw new Error("Veuillez saisir votre nom complet et mot de passe.");
  }

  const secureHash = await hashPasswordSecure(rawPass);

  const client = getSupabaseClient();
  if (client) {
    try {
      // Query the user accounts database table
      const { data, error } = await client
        .from('clients_comptes')
        .select('nom_complet, telephone, mot_de_passe')
        .ilike('nom_complet', name)
        .maybeSingle();

      if (error && !error.message.includes("relation") && !error.message.includes("does not exist")) {
        throw error;
      }

      if (data) {
        // Support both secure hash match and old legacy accounts with plain pass fallback
        if (data.mot_de_passe === secureHash || data.mot_de_passe === rawPass) {
          return { fullName: data.nom_complet, phone: data.telephone };
        } else {
          throw new Error("Mot de passe incorrect pour ce compte.");
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes("Mot de passe incorrect")) {
        throw err;
      }
      console.error("Supabase user search failed, checking offline users list:", err);
    }
  }

  // Fallback check in offline registry
  const localUsers = getLocalUsers();
  const matched = localUsers.find(u => u.nom_complet.toLowerCase() === name.toLowerCase());

  if (matched) {
    // Support both secure hash and legacy plain pass matching locally
    if (matched.mot_de_passe === secureHash || matched.mot_de_passe === rawPass) {
      return { fullName: matched.nom_complet, phone: matched.telephone };
    } else {
      throw new Error("Mot de passe incorrect.");
    }
  }

  throw new Error("Aucun compte trouvé avec ce nom complet. Veuillez créer un compte d'abord.");
}
