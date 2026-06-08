import { BookingData } from './types';

/**
 * Generate a unique ticket reference matching #TK-DDMMYY-XXX where DDMMYY is derived from the travel date
 * and XXX is a random combination of alphanumeric characters
 */
export function generateTicketReference(travelDateStr: string): string {
  let datePart = '000000';
  try {
    if (travelDateStr) {
      // Input might be YYYY-MM-DD
      const parts = travelDateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0].slice(-2);
        const month = parts[1];
        const day = parts[2];
        datePart = `${day}${month}${year}`;
      }
    }
  } catch (e) {
    console.error('Error parsing date for reference code', e);
  }

  // Generate 3 random upper case letters/numbers
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randPart = '';
  for (let i = 0; i < 3; i++) {
    randPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `#TK-${datePart}-${randPart}`;
}

/**
 * Format date nicely in French language (e.g. "22 mai 2026")
 */
export function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${months[monthIndex]} ${year}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Save booking list directly to localStorage
 */
export function saveBookings(bookings: BookingData[]): void {
  try {
    localStorage.setItem('niou_dem_bookings', JSON.stringify(bookings));
  } catch (e) {
    console.error('Failed to save bookings to localStorage', e);
  }
}

/**
 * Load booking list directly from localStorage
 */
export function loadBookings(): BookingData[] {
  try {
    const data = localStorage.getItem('niou_dem_bookings');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load bookings from localStorage', e);
    return [];
  }
}

/**
 * Get display initials or abbreviation for a city name
 */
export function getCityAbbreviation(cityName: string): string {
  const normalized = cityName.toUpperCase().trim();
  if (normalized.includes('DAKAR')) return 'DKR';
  if (normalized.includes('TOUBA')) return 'TBA';
  if (normalized.includes('TIVAOUANE')) return 'TIV';
  if (normalized.includes('THIÈS') || normalized.includes('THIES')) return 'THS';
  if (normalized.includes('AIBD') || normalized.includes('AÉROPORT') || normalized.includes('AEROPORT')) return 'AIB';
  return normalized.slice(0, 3);
}
