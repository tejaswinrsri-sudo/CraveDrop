import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Heart, Shield, Clock } from 'lucide-react';
import { CHENNAI_AREAS } from '../../config/constants';
import { useLocationStore } from '../../lib/locationStore';

export const Footer: React.FC = () => {
  const { setSelectedArea } = useLocationStore();
  const navigate = useNavigate();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-sm">
                CD
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                Crave<span className="text-primary">Drop</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Crave it. We&apos;ll drop it. Chennai&apos;s hyper-local food ordering &amp; table booking
              platform built for fast drops and delightful dine-ins.
            </p>
            <div className="pt-2 text-slate-500 flex items-center gap-1.5">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>exclusively for Chennai</span>
            </div>
          </div>

          {/* Col 2: Service Areas in Chennai */}
          <div className="md:col-span-2">
            <h4 className="text-white font-bold mb-3 flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Chennai Delivery &amp; Booking Zones</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHENNAI_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => {
                    setSelectedArea(area);
                    navigate('/restaurants');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left text-xs hover:text-white transition py-1 truncate"
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Col 3: Promises */}
          <div>
            <h4 className="text-white font-bold mb-3 text-sm">Our Chennai Promise</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>20–45 min swift local drops</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>100% verified authentic kitchens</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary font-bold">₹</span>
                <span>Free delivery on orders over ₹500</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} CraveDrop Technologies Chennai. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-slate-300">
              Home
            </Link>
            <Link to="/restaurants" className="hover:text-slate-300">
              Restaurants
            </Link>
            <Link to="/orders" className="hover:text-slate-300">
              My Orders
            </Link>
            <Link to="/bookings" className="hover:text-slate-300">
              My Bookings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
