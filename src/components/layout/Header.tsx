import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  ShoppingBag,
  Search,
  Navigation,
  User,
  ShieldCheck,
  CalendarDays,
  ReceiptText,
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '../../lib/auth';
import { CHENNAI_AREAS, ChennaiArea } from '../../config/constants';
import { useLocationStore } from '../../lib/locationStore';
import { useCartStore } from '../../lib/cartStore';
import { useCart } from '../../hooks/useCart';
import toast from 'react-hot-toast';

export const Header: React.FC = () => {
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isManualOverrideOpen, setIsManualOverrideOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const { selectedArea, setSelectedArea, detectCurrentLocation, isLocating, locationMessage } = useLocationStore();
  const { openCartDrawer } = useCartStore();
  const { totalItemCount } = useCart();
  const { user } = useUser();
  const navigate = useNavigate();

  const isAdmin =
    (user?.publicMetadata as any)?.role === 'admin' ||
    user?.emailAddresses.some((e) => e.emailAddress.includes('admin'));

  const handleDetect = async () => {
    try {
      await detectCurrentLocation();
      toast.success('Area detected successfully.');
      setIsLocationDropdownOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not detect location');
    }
  };

  const handleSelectArea = (area: ChennaiArea) => {
    setSelectedArea(area);
    setIsLocationDropdownOpen(false);
    setIsManualOverrideOpen(false);
    setAreaSearch('');
    navigate('/restaurants');
  };

  const filteredAreas = CHENNAI_AREAS.filter((area) =>
    area.toLowerCase().includes(areaSearch.trim().toLowerCase())
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
                <span className="font-extrabold text-xl tracking-tight">CD</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  Crave<span className="text-primary">Drop</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5">
                  Crave it. We&apos;ll drop it.
                </span>
              </div>
            </Link>

            {/* Chennai Location Picker */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  setIsLocationDropdownOpen(!isLocationDropdownOpen);
                  setIsManualOverrideOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition"
              >
                <span className="max-w-[150px] truncate">📍 {selectedArea || 'Set your location'}</span>
              </button>

              {/* Dropdown Menu */}
              {isLocationDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsLocationDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 space-y-2">
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={handleDetect}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl transition shadow-xs disabled:opacity-50"
                      >
                        <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                        <span>{isLocating ? 'Detecting your area...' : 'Detect my area'}</span>
                      </button>
                      {locationMessage && (
                        <p className="text-[11px] leading-relaxed text-rose-600">{locationMessage}</p>
                      )}
                    </div>

                    {selectedArea && !isManualOverrideOpen && (
                      <button
                        type="button"
                        onClick={() => setIsManualOverrideOpen(true)}
                        className="px-3 pt-2 text-[11px] font-semibold text-primary hover:text-primary-dark"
                      >
                        Not right? Change area
                      </button>
                    )}

                    {(!selectedArea || isManualOverrideOpen) && <div className="px-3 pt-2 pb-1">
                      <input
                        type="search"
                        value={areaSearch}
                        onChange={(event) => setAreaSearch(event.target.value)}
                        placeholder="Search Chennai area"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-primary focus:outline-none"
                      />
                    </div>}

                    {(!selectedArea || isManualOverrideOpen) && <div className="max-h-52 overflow-y-auto px-1">
                      {filteredAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => handleSelectArea(area)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                            selectedArea === area
                              ? 'bg-orange-50 text-primary'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{area}</span>
                          {selectedArea === area && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      ))}
                      {filteredAreas.length === 0 && (
                        <p className="px-3 py-3 text-xs text-slate-500">No matching area.</p>
                      )}
                    </div>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center gap-3">
            {/* Quick Navigation Links for Authenticated Users */}
            <SignedIn>
              <nav className="hidden lg:flex items-center gap-1 mr-2 text-xs font-semibold text-slate-600">
                <Link
                  to="/orders"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-primary hover:bg-orange-50 transition"
                >
                  <ReceiptText className="w-4 h-4" />
                  <span>My Orders</span>
                </Link>

                <Link
                  to="/bookings"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-primary hover:bg-orange-50 transition"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>My Bookings</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition font-bold"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            </SignedIn>

            {/* Cart Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              <span className="text-xs font-bold hidden sm:inline">Cart</span>
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Clerk Authentication */}
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
                >
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center pl-1">
                <UserButton
                  userProfileMode="navigation"
                  userProfileUrl="/profile"
                  appearance={{
                    elements: {
                      avatarBox: 'w-9 h-9 ring-2 ring-orange-500/20',
                    },
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
};
