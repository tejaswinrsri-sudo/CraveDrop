import React from 'react';
import { AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../lib/cartStore';
import { useCart } from '../../hooks/useCart';

export const ConflictModal: React.FC = () => {
  const { conflictModal, closeConflictModal } = useCartStore();
  const { addItem, isAddingItem } = useCart();

  if (!conflictModal.isOpen || !conflictModal.menuItemId) return null;

  const handleConfirmReplace = () => {
    addItem({
      menuItemId: conflictModal.menuItemId!,
      quantity: conflictModal.quantity,
      replaceCart: true,
    });
    closeConflictModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all p-6">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Replace items in cart?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Your cart currently contains items from{' '}
              <span className="font-semibold text-slate-800">
                {conflictModal.currentRestaurant || 'another restaurant'}
              </span>
              . Would you like to clear your cart and start a fresh order from{' '}
              <span className="font-semibold text-primary">
                {conflictModal.newRestaurant || 'this restaurant'}
              </span>
              ?
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeConflictModal}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Keep Existing Cart
          </button>
          <button
            type="button"
            disabled={isAddingItem}
            onClick={handleConfirmReplace}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear & Add Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};
