/**
 * Types definition for DEM - niou_dem App
 */

export type CityCode = 'DKR' | 'TBA' | 'TIV' | 'THS' | 'AIBD';

export interface City {
  code: CityCode;
  name: string;
}

export interface StandardTrip {
  id: string;
  from: City;
  to: City;
  price: number;
  duration: string;
}

export interface BookingData {
  id: string; // Ticket Ref format: #TK-DDMMYY-XXX
  db_id?: string; // Supabase database UUID for reservations
  tripType: 'standard' | 'aibd';
  from: string;
  to: string;
  price: number;
  date: string;
  time: string;
  fullName: string;
  phone: string;
  departureAddress: string;
  options?: {
    baggage: boolean;
    ac: boolean;
  };
  createdAt: string;
}

export type ScreenState = 'home' | 'standard-form' | 'aibd-form' | 'ticket' | 'my-tickets';

