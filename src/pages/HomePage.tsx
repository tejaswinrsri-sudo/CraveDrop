import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ArrowRight,
  X,
  MapPin,
  Clock,
  ShieldCheck,
  ChefHat,
  ChevronDown,
} from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { RestaurantCard } from '../components/restaurant/RestaurantCard';

// ─── "How It Works" steps ─────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: '01',
    icon: MapPin,
    title: 'Pick Your Area',
    desc: 'Set your Chennai neighbourhood in the top bar — we only show kitchens that actually deliver to you.',
    color: 'text-primary bg-orange-50',
  },
  {
    step: '02',
    icon: ChefHat,
    title: 'Choose Your Crave',
    desc: 'Browse signature Chettinad feasts, hot biryanis, coastal seafood, and much more from local favourites.',
    color: 'text-emerald-700 bg-emerald-50',
  },
  {
    step: '03',
    icon: Clock,
    title: 'Drop in 20–45 mins',
    desc: 'Your order rockets straight from the kitchen to your door — or book a table for a dine-in experience.',
    color: 'text-blue-700 bg-blue-50',
  },
];

// Curated Chennai food image (biryani / dosa / filter coffee spread) from Unsplash
const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [heroSearch, setHeroSearch] = useState('');

  // Top-rated restaurants — only 6 cards, no full grid
  const { data: topRatedData, isLoading: isTopRatedLoading } = useRestaurants({
    sort: 'rating',
    order: 'desc',
    limit: 6,
  });
  const topRated = topRatedData?.items || [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/restaurants?search=${encodeURIComponent(q)}` : '/restaurants');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearchSubmit(e as any);
  };

  const scrollToContent = () => {
    const el = document.getElementById('home-content');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen min-w-0 w-full bg-[#FFFBF5]">

      {/* ══════════════════════════════════════════════════════════════════
          HERO — fills exactly the viewport height below the 64px navbar
      ═══════════════════════════════════════════════════════════════════ */}
      {/*
        Hero — flex-col layout:
          Row 1 (flex-1):   two-column content (text | image), vertically centred
          Row 2 (shrink-0): scroll indicator strip, always at the bottom, never overlapping
      */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-[#FFEDD5] via-[#FFF7ED] to-[#FFFBF5]
                   flex flex-col"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        {/* ── Decorative ambient blobs ─────────────────────────────────── */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-amber-200/20 blur-3xl"
        />

        {/* ── ROW 1: two-column content — fills available space ─────── */}
        <div className="relative z-10 flex-1 flex items-center min-h-0">
          <div
            className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
                        grid grid-cols-1 lg:grid-cols-2 gap-0"
          >
            {/* ── LEFT COLUMN: text content ────────────────────────── */}
            <div className="flex flex-col justify-center py-10 lg:py-8 lg:pr-12 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-orange-100 text-primary text-xs font-bold tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Chennai&apos;s Hyper-Local Food &amp; Dine-In Platform</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Crave it.{' '}
                <br className="hidden sm:block" />
                <span className="text-primary">We&apos;ll drop it.</span>
              </h1>

              {/* Subtext */}
              <p className="text-slate-600 text-base leading-relaxed max-w-md">
                Order signature Chettinad feasts, hot filter coffee, wood-fired biryanis,
                and coastal catches across 11 Chennai neighbourhoods — or reserve your
                table in seconds.
              </p>

              {/* Trust pills */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white/70 px-3 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Verified kitchens
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white/70 px-3 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  20–45 min drops
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white/70 px-3 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
                  <span className="text-primary font-bold text-sm leading-none">₹</span>
                  Free delivery above ₹500
                </span>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit}>
                <div className="relative flex items-center max-w-lg shadow-xl shadow-orange-500/10 rounded-2xl bg-white border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
                  <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search biryani, dosas, parottas, filter coffee..."
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full px-3 py-4 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                  />
                  {heroSearch && (
                    <button
                      type="button"
                      onClick={() => setHeroSearch('')}
                      className="p-1 mr-1 text-slate-400 hover:text-slate-600 rounded-full transition"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="m-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition shrink-0"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Primary CTA */}
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/restaurants')}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl shadow-xl shadow-slate-900/25 transition group"
                >
                  <span>Explore Restaurants</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN: food image (desktop only) ──────────── */}
            {/*
              max-h-[60vh] caps image so: content row + scroll strip
              always fits inside calc(100vh-64px) on short laptops (800px).
              min-h-0 on the flex-1 parent lets it shrink safely.
            */}
            <div className="hidden lg:flex items-center justify-end py-8">
              <div
                className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-orange-900/10"
                style={{ height: 'min(calc(100vh - 240px), 640px)', maxHeight: '60vh' }}
              >
                {/* Left-edge gradient fade */}
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to right, #FFF7ED 0%, transparent 100%)' }}
                />
                {/* Top-edge fade */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, #FFEDD5 0%, transparent 100%)' }}
                />
                <img
                  src={HERO_IMAGE_URL}
                  alt="Delicious Chennai food spread — biryani, dosa and more"
                  loading="eager"
                  className="w-full h-full object-cover"
                />
                {/* Floating stat chip — positioned inside the image card */}
                <div className="absolute bottom-5 left-5 z-20 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg shadow-orange-900/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ChefHat className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Kitchens</p>
                    <p className="text-lg font-black text-slate-900 leading-tight">55+ Verified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile image strip (below text, above scroll strip) ── */}
        <div className="lg:hidden relative z-10 w-full px-4 pb-4">
          <div className="relative rounded-2xl overflow-hidden h-48 shadow-lg shadow-orange-900/10">
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-12 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #FFF7ED 0%, transparent 100%)' }}
            />
            <img
              src={HERO_IMAGE_URL}
              alt="Chennai food spread"
              loading="eager"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>

        {/* ── ROW 2: scroll indicator ─────────────────────────────────
              Absolutely anchored to bottom-8 (32px) of the hero section.
              The section is `relative`, so this is exactly 32px above
              the hero's bottom edge on every viewport height.
        ─────────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center">
          <button
            type="button"
            onClick={scrollToContent}
            aria-label="Scroll to explore"
            className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-primary transition group"
          >
            <span className="text-[11px] font-semibold tracking-widest uppercase select-none">
              Scroll to explore
            </span>
            <ChevronDown
              className="w-5 h-5"
              style={{ animation: 'hero-bounce 1.6s ease-in-out infinite' }}
            />
          </button>
        </div>
      </section>

      {/* Bounce keyframe */}
      <style>{`
        @keyframes hero-bounce {
          0%, 100% { transform: translateY(0);   opacity: 0.55; }
          50%       { transform: translateY(7px); opacity: 1;    }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          Below the fold — anchor for smooth-scroll
      ═══════════════════════════════════════════════════════════════════ */}
      <div id="home-content" />

      {/* ── Top Rated in Chennai ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Top Rated in Chennai</h2>
            <p className="text-xs text-slate-500 mt-0.5">Highest-rated kitchens picked just for you</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/restaurants?sort=rating&order=desc')}
            className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 transition whitespace-nowrap"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isTopRatedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs animate-pulse space-y-3"
              >
                <div className="aspect-16/10 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topRated.slice(0, 6).map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">How CraveDrop Works</h2>
            <p className="text-xs text-slate-500 mt-1">From craving to doorstep in three easy steps</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="flex flex-col items-center text-center space-y-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} mb-1`}>
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                  Step {step}
                </span>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom CTA strip */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% verified authentic Chennai kitchens</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Free delivery on orders above ₹500</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <button
              type="button"
              onClick={() => navigate('/restaurants')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition"
            >
              Start ordering <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
