import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Calendar,
  Utensils,
  Search,
  Leaf,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { useAuth, SignInButton } from '../lib/auth';
import { useRestaurantDetail } from '../hooks/useRestaurants';
import { formatINR, BOOKING_TIME_SLOTS } from '../config/constants';
import { RatingBadge } from '../components/common/RatingBadge';
import { MenuCard } from '../components/restaurant/MenuCard';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'menu' | 'booking'>('menu');
  const [menuSearch, setMenuSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Table booking state
  const todayStr = new Date().toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState(todayStr);
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>('19:00');
  const [bookingGuests, setBookingGuests] = useState<number>(2);
  const [bookingNote, setBookingNote] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  const { data, isLoading, isError, error } = useRestaurantDetail(id);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
        <p className="text-sm font-semibold text-slate-500">Loading restaurant &amp; menu...</p>
      </div>
    );
  }

  if (isError || !data?.restaurant) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Restaurant not found</h2>
        <p className="text-sm text-slate-500">{(error as any)?.message || 'Invalid restaurant'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all restaurants</span>
        </Link>
      </div>
    );
  }

  const { restaurant, categories } = data;

  const handleBookTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      toast.error('Please sign in to book a table');
      return;
    }

    try {
      setIsSubmittingBooking(true);
      const res = await api.post('/bookings', {
        restaurantId: restaurant._id,
        date: bookingDate,
        timeSlot: bookingTimeSlot,
        guests: bookingGuests,
        note: bookingNote,
      });

      setBookingSuccessData(res.data.data);
      toast.success('Table reserved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reserve table');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Filter menu items by search and veg
  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        const matchesSearch =
          menuSearch.trim() === '' ||
          item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
          item.description.toLowerCase().includes(menuSearch.toLowerCase());
        const matchesVeg = !vegOnly || item.isVeg;
        return matchesSearch && matchesVeg;
      }),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Restaurant Hero Card */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chennai Kitchens</span>
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Cover Image */}
            <div className="w-full md:w-80 h-52 sm:h-64 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative shadow-md">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                loading="eager"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {!restaurant.isOpen && (
                <div className="absolute inset-0 bg-slate-900/75 flex items-center justify-center">
                  <span className="text-white text-sm font-bold bg-rose-600 px-3 py-1 rounded-lg">
                    Currently Closed
                  </span>
                </div>
              )}
            </div>

            {/* Restaurant Meta */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {restaurant.name}
                </h1>
                <RatingBadge rating={restaurant.rating} count={restaurant.ratingCount} size="md" />
              </div>

              <p className="text-xs sm:text-sm text-slate-500 font-semibold">
                {restaurant.cuisines.join(' • ')}
              </p>

              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {restaurant.description}
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {restaurant.address.line1}, {restaurant.area}, Chennai -{' '}
                  <span className="font-semibold">{restaurant.address.pincode}</span>
                </span>
              </div>

              {/* Highlights Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{restaurant.deliveryTime} mins delivery</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
                  <span>{formatINR(restaurant.costForTwo)} for two</span>
                </div>

                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{restaurant.tableCapacity} dine-in seats</span>
                </div>

                {restaurant.isVegOnly && (
                  <div className="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-xl font-bold">
                    Pure Veg Kitchen
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-4 mt-8 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-2 pb-3 text-sm font-bold transition border-b-2 ${
                activeTab === 'menu'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Order Online</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('booking')}
              className={`flex items-center gap-2 pb-3 text-sm font-bold transition border-b-2 ${
                activeTab === 'booking'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Book a Table</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Tab Views */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'menu' ? (
          <div className="space-y-6">
            {/* Filter and Search Bar for Menu */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search in this menu..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setVegOnly(!vegOnly)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    vegOnly
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Leaf className={`w-3.5 h-3.5 ${vegOnly ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
                  <span>Veg Only</span>
                </button>
              </div>
            </div>

            {/* Menu Items Grouped By Category */}
            {filteredCategories.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 p-8 space-y-2">
                <Utensils className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No dishes matched your search</p>
                <p className="text-xs text-slate-500">Try searching for another dish or clearing filters.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredCategories.map((catGroup) => (
                  <div key={catGroup.category} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-extrabold text-slate-900">{catGroup.category}</h3>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                        {catGroup.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catGroup.items.map((item) => (
                        <MenuCard key={item._id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Table Booking Tab */
          <div className="max-w-2xl mx-auto">
            {bookingSuccessData ? (
              <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Table Reserved!</h3>
                <p className="text-sm text-slate-600">
                  Your table at <strong className="text-slate-900">{restaurant.name}</strong> for{' '}
                  <strong className="text-slate-900">{bookingSuccessData.guests} guests</strong> on{' '}
                  <strong className="text-slate-900">
                    {new Date(bookingSuccessData.date).toLocaleDateString('en-IN', {
                      dateStyle: 'medium',
                    })}
                  </strong>{' '}
                  at <strong className="text-primary">{bookingSuccessData.timeSlot}</strong> is confirmed.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingSuccessData(null)}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Book Another Table
                  </button>
                  <Link
                    to="/bookings"
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
                  >
                    View My Bookings
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Reserve a Table</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Book guaranteed seating at {restaurant.name} ({restaurant.area}). No reservation fees.
                  </p>
                </div>

                <form onSubmit={handleBookTable} className="space-y-5">
                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Select Date
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Time Slots (12:00, 13:00, 14:00, 19:00, 20:00, 21:00) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Select Time Slot
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {BOOKING_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setBookingTimeSlot(slot)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                            bookingTimeSlot === slot
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Number of Guests (1-20) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Number of Guests (Max 20)
                    </label>
                    <div className="flex items-center gap-3">
                      {[1, 2, 4, 6, 8].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setBookingGuests(num)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                            bookingGuests === num
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={bookingGuests}
                        onChange={(e) => setBookingGuests(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Special Requests / Seating Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Birthday celebration, window seat requested..."
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Submit Button */}
                  {!isSignedIn ? (
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        className="w-full py-3 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-xs transition"
                      >
                        Sign In to Confirm Reservation
                      </button>
                    </SignInButton>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmittingBooking}
                      className="w-full py-3.5 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {isSubmittingBooking ? 'Confirming Reservation...' : 'Confirm Table Reservation'}
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
