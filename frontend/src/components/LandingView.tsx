'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, Sliders, Info, Heart, Mic, Navigation, Sun, Moon, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface LandingViewProps {
  onNavigate: (view: 'landing' | 'results' | 'signin' | 'dashboard', query?: string) => void;
}

export default function LandingView({ onNavigate }: LandingViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [user, setUser] = useState<any>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [trendingCities, setTrendingCities] = useState<any[]>([]);

  // Fetch trending cities and notifications
  useEffect(() => {
    fetch('/api/v1/search/trending')
      .then(res => res.json())
      .then(data => {
        if (data.cities) {
          setTrendingCities(data.cities);
        }
      })
      .catch(err => console.error("Failed to load trending cities:", err));
      
    if (user?.email) {
      fetch(`/api/v1/user/notifications?email=${encodeURIComponent(user.email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.notifications) {
            setNotifications(data.notifications);
          }
        })
        .catch(err => console.error("Failed to load notifications:", err));
    }
  }, [user]);

  const markNotificationRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (user?.email) {
      try {
        await fetch('/api/v1/user/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, notification_id: id })
        });
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }
  };

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.warn("Error fetching user session in LandingView:", err);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        // Search with GPS query
        onNavigate('results', `gps:${latitude.toFixed(6)},${longitude.toFixed(6)}`);
      },
      (error) => {
        setIsLocating(false);
        setLocationError('Unable to retrieve your location');
        // Fallback to nearby search
        onNavigate('results', 'restaurants near me');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('results', searchQuery);
    } else {
      onNavigate('results', 'best restaurants in delhi');
    }
  };

  const popularSearches = [
    { label: 'Restaurants in Delhi', query: 'restaurants in delhi' },
    { label: 'Hotels in Mumbai', query: 'hotels in mumbai' },
    { label: 'Best Cafes in Bangalore', query: 'cafes in bangalore' },
    { label: 'Places in Goa', query: 'places in goa' },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      {/* Navbar */}
      <header className="glass-panel w-full sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-100/50 shadow-xs">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <MapPin className="w-5 h-5 fill-white/20" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            CityFinder <span className="text-indigo-600 font-semibold">AI</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-350">
          <a href="#" className="text-indigo-600 font-semibold">Home</a>
          <a href="#" className="hover:text-indigo-600 transition-colors" onClick={() => onNavigate('results')}>Explore</a>
          <a href="#" className="hover:text-indigo-600 transition-colors" onClick={() => onNavigate('results', 'hotels')}>Hotels</a>
          <a href="#" className="hover:text-indigo-600 transition-colors" onClick={() => onNavigate('results', 'restaurants')}>Restaurants</a>
          <a href="#" className="hover:text-indigo-600 transition-colors" onClick={() => onNavigate('results', 'events')}>Events</a>
          {user && (
            <a href="#" className="hover:text-indigo-600 transition-colors font-bold text-indigo-650 dark:text-indigo-400" onClick={() => onNavigate('dashboard')}>
              My Dashboard
            </a>
          )}
          <a href="#" className="hover:text-indigo-600 transition-colors">About</a>
        </nav>

        <div className="flex items-center gap-3.5">
          {/* Header Controls */}
          <div className="flex items-center gap-4.5">
            <button 
              onClick={toggleDarkMode}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-500 transition-colors cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <button 
              onClick={() => {
                if (user) {
                  onNavigate('dashboard', 'saved');
                } else {
                  onNavigate('signin');
                }
              }}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-500 transition-colors cursor-pointer"
              title="Saved Places"
            >
              <Heart className="w-5 h-5" />
            </button>
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
                <Bell className="w-5 h-5 text-slate-500" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-50"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/60 p-4 z-50">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-lg">Notifications</h3>
                  <div className="flex flex-col gap-3">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 ${!notif.is_read ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/30' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                        onClick={() => markNotificationRead(notif.id)}
                      >
                        <p className={`text-sm ${!notif.is_read ? 'font-medium text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {notif.title}: {notif.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(notif.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No notifications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onNavigate('dashboard')} 
                  className="text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 border border-indigo-100 dark:border-indigo-900 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Dashboard
                </button>
                <div 
                  onClick={() => onNavigate('dashboard', 'profile')}
                  className="w-9 h-9 rounded-full overflow-hidden border border-indigo-200 dark:border-indigo-900 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all flex items-center justify-center bg-indigo-50 dark:bg-indigo-950"
                  title="View Profile"
                >
                  <img
                    src={user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onNavigate('signin')} 
                  className="text-sm font-semibold text-slate-700 dark:text-slate-350 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Sign in
                </button>
                <button 
                  onClick={() => onNavigate('signin')} 
                  className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-150 px-4.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section — Chrome Wallpaper + Full Animated Background System */}
      <section className="hero-chrome-bg relative w-full pt-20 pb-24 px-6 flex flex-col items-center justify-center text-center">

        {/* ── Layer 1: Conic Shimmer Rings ── */}
        <div className="conic-ring conic-ring-1" />
        <div className="conic-ring conic-ring-2" />

        {/* ── Layer 2: Animated Mesh Dot Grid ── */}
        <div className="mesh-grid" />

        {/* ── Layer 3: Floating Glow Orbs ── */}
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-orb bg-orb-4" />

        {/* ── Layer 4: Sparkle Particles ── */}
        <div className="sparkle sparkle-1" />
        <div className="sparkle sparkle-2" />
        <div className="sparkle sparkle-3" />
        <div className="sparkle sparkle-4" />
        <div className="sparkle sparkle-5" />
        <div className="sparkle sparkle-6" />

        {/* ── Hero Content (z-index: 3 via .hero-chrome-bg > *) ── */}
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Badge pill */}
          <div className="mb-6 flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-indigo-900/40 rounded-full px-4 py-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 tracking-wide uppercase">AI-Powered City Search</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight drop-shadow-sm">
            Discover Cities <br />
            like <span className="text-gradient">Never Before</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-medium px-4 py-2 rounded-2xl bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
            AI-Powered search engine to explore places, restaurants, hotels, events and everything in your city.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="mt-10 w-full max-w-2xl glass-panel shadow-2xl shadow-indigo-200/30 dark:shadow-indigo-900/30 rounded-2xl p-2 flex items-center border border-white/40 dark:border-white/10 hover:border-indigo-300/50 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all">
            <div className="flex items-center gap-3 pl-3 flex-1">
              <Search className="w-5 h-5 text-indigo-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locationError ? `Error: ${locationError}` : "Search for city, places, restaurants, hotels..."}
                className={`w-full text-slate-800 placeholder-slate-400 dark:text-white dark:placeholder-slate-500 bg-transparent py-3 focus:outline-none text-base ${locationError ? 'text-red-500 placeholder-red-300' : ''}`}
              />
              <button
                type="button"
                onClick={handleGPSLocate}
                className={`p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ${
                  isLocating ? 'animate-pulse text-indigo-650' : 'text-slate-400 hover:text-indigo-600'
                }`}
                title="Use Current Location (GPS)"
              >
                <Navigation className={`w-5 h-5 ${isLocating ? 'fill-indigo-500/10' : ''}`} />
              </button>
              <Mic className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-200 cursor-pointer shrink-0"
            >
              Search
            </button>
          </form>

          {/* Popular Searches */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1.5">Popular:</span>
            {popularSearches.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate('results', item.query)}
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-200 rounded-full px-4 py-1.5 shadow-sm transition-all cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Cities Section */}
      <section className="max-w-7xl mx-auto w-full px-6 py-12 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Trending Cities</h2>
            <p className="text-sm text-slate-400 mt-1">Explore popular destinations</p>
          </div>
          <button 
            onClick={() => onNavigate('results')} 
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View all
          </button>
        </div>

        {/* City Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {trendingCities.map((city, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate('results', `restaurants in ${city.name.toLowerCase()}`)}
              className="group cursor-pointer rounded-2xl overflow-hidden glass-card hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative h-32 w-full overflow-hidden bg-slate-100/50">
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors text-sm">{city.name}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{city.location}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 fill-indigo-600/10" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">AI-Powered Search</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                Get smart, semantic results parsed and ranked by artificial intelligence.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-amber-600/10" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Personalized Recommendations</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                Discover local secrets and trending hotspots tailored just for your taste.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 fill-sky-600/10" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Real-time Information</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                Get up-to-date timings, contact details, pricing details, and review metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 text-center mt-12">
        <p>© 2026 CityFinder AI. Built with premium styling and Next.js.</p>
      </footer>
    </div>
  );
}
