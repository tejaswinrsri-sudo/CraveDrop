import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, UtensilsCrossed, Calendar } from 'lucide-react';
import { Restaurant } from '../../types';
import { formatINR } from '../../config/constants';
import { RatingBadge } from '../common/RatingBadge';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  return (
    <Link
      to={`/restaurant/${restaurant._id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Restaurant Image */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient shadow for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {restaurant.isVegOnly && (
            <span className="px-2 py-0.5 text-[11px] font-bold text-emerald-800 bg-white/95 backdrop-blur-xs rounded-md shadow-xs">
              Pure Veg
            </span>
          )}

          {!restaurant.isOpen && (
            <span className="ml-auto px-2 py-0.5 text-[11px] font-bold text-white bg-slate-900/90 backdrop-blur-xs rounded-md shadow-xs">
              Closed
            </span>
          )}
        </div>

        {/* Bottom Image Overlay Badges */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
          <RatingBadge rating={restaurant.rating} count={restaurant.ratingCount} size="sm" />

          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{restaurant.deliveryTime} mins</span>
          </div>
        </div>
      </div>

      {/* Details Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-base group-hover:text-primary transition line-clamp-1">
            {restaurant.name}
          </h3>
        </div>

        <p className="text-xs text-slate-500 line-clamp-1 font-medium">
          {restaurant.cuisines.join(' • ')}
        </p>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1 text-slate-500 truncate">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{restaurant.area}</span>
          </div>

          <span className="font-semibold text-slate-800 shrink-0">
            {formatINR(restaurant.costForTwo)} for two
          </span>
        </div>

        {/* Dine-in Booking tag */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50/70 px-2 py-1 rounded-lg">
          <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Table reservation available</span>
        </div>
      </div>
    </Link>
  );
};
