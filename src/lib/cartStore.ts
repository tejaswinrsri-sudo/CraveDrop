import { create } from 'zustand';

interface ConflictModalData {
  isOpen: boolean;
  menuItemId: string | null;
  quantity: number;
  currentRestaurant?: string;
  newRestaurant?: string;
}

interface CartUIState {
  isCartDrawerOpen: boolean;
  conflictModal: ConflictModalData;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  openConflictModal: (data: Omit<ConflictModalData, 'isOpen'>) => void;
  closeConflictModal: () => void;
}

export const useCartStore = create<CartUIState>((set) => ({
  isCartDrawerOpen: false,
  conflictModal: {
    isOpen: false,
    menuItemId: null,
    quantity: 1,
  },

  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),

  openConflictModal: (data) =>
    set({
      conflictModal: {
        isOpen: true,
        ...data,
      },
    }),

  closeConflictModal: () =>
    set({
      conflictModal: {
        isOpen: false,
        menuItemId: null,
        quantity: 1,
      },
    }),
}));
