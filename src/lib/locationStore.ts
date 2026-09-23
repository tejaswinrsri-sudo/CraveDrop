import { create } from 'zustand';
import { ChennaiArea } from '../config/constants';
import { resolveArea } from './resolveArea.js';

type LocationResolution = {
  success: boolean;
  area: ChennaiArea | 'outside our delivery zone';
  distanceKm: number;
};

interface LocationState {
  selectedArea: ChennaiArea | null;
  isLocating: boolean;
  locationMessage: string | null;
  detectedResolution: LocationResolution | null;
  setSelectedArea: (area: ChennaiArea) => void;
  detectCurrentLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  selectedArea: (localStorage.getItem('cravedrop_selected_area') as ChennaiArea) || null,
  isLocating: false,
  locationMessage: null,
  detectedResolution: null,

  setSelectedArea: (area) => {
    localStorage.setItem('cravedrop_selected_area', area);
    set({ selectedArea: area, locationMessage: null });
  },

  detectCurrentLocation: async () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const message = 'Location detection requires HTTPS or localhost.';
      set({ locationMessage: message });
      throw new Error(message);
    }

    if (!navigator.geolocation) {
      const message = 'Location detection is not supported by your browser.';
      set({ locationMessage: message });
      throw new Error(message);
    }

    set({ isLocating: true, locationMessage: null });

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const result = resolveArea({ lat: latitude, lng: longitude });

          set({
            isLocating: false,
            detectedResolution: result,
            locationMessage: result.success ? null : 'You are outside our delivery zone.',
          });

          if (result.success) {
            localStorage.setItem('cravedrop_selected_area', result.area);
            set({ selectedArea: result.area });
          } else {
            localStorage.removeItem('cravedrop_selected_area');
            set({ selectedArea: null });
          }
          resolve();
        },
        (error) => {
          const messages: Record<number, string> = {
            1: 'Location permission was denied. Allow access and try again.',
            2: 'Your location is currently unavailable. Try again in a moment.',
            3: 'Location detection timed out. Try again.',
          };
          const message = messages[error.code] || 'Unable to retrieve your location.';
          set({ isLocating: false, locationMessage: message });
          reject(new Error(message));
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  },
}));
