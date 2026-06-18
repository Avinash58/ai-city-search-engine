'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Home as HomeIcon,
  Compass,
  Heart,
  Bookmark,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
  Calendar,
  Star,
  ChevronRight,
  Sparkles,
  Mic,
  Clock,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface DashboardViewProps {
  onNavigate: (view: 'landing' | 'results' | 'signin' | 'dashboard' | 'admin', query?: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userEmail, setUserEmail] = useState('aviraj2207005@gmail.com');
  const [userName, setUserName] = useState('Avinash Raj');
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'saved' | 'history' | 'bookings' | 'reviews' | 'profile' | 'settings'>('dashboard');
  const [reloadCounter, setReloadCounter] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (userEmail) {
      fetch(`/api/v1/user/is_admin?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
          setIsAdmin(data.is_admin || false);
        })
        .catch(err => console.error("Failed to check admin status:", err));

      fetch(`/api/v1/user/notifications?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.notifications) {
            setNotifications(data.notifications);
          }
        })
        .catch(err => console.error("Failed to load notifications:", err));

      fetch(`/api/v1/search/recommendations?email=${encodeURIComponent(userEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.recommendations) {
            setRecommendations(data.recommendations);
          }
        })
        .catch(err => console.error("Failed to load recommendations:", err));
    }
  }, [userEmail, reloadCounter]);

  const markNotificationRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (userEmail) {
      try {
        await fetch('/api/v1/user/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, notification_id: id })
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

  const [statsData, setStatsData] = useState({
    saved_places_count: 0,
    searches_count: 0,
    reviews_count: 0,
    bookings_count: 0,
    recent_searches: [] as string[],
    saved_places_detailed: [] as Array<{ id: number, place_name: string, place_address: string }>,
    bookings: [] as Array<{ id: number, place_name: string, booking_date: string }>,
    reviews: [] as Array<{ id: number, place_name: string, rating: number, comment: string }>,
    searches_detailed: [] as Array<{ id: number, query: string, created_at: string }>
  });

  useEffect(() => {
    const fetchActiveUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || '');
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User Explorer');
        }
      } catch (err) {
        console.error("Failed to load active user profile:", err);
      }
    };
    fetchActiveUser();

    // Check for deep-linked subtab URL parameters on mount!
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const subtabParam = params.get('subtab');
      if (subtabParam && ['dashboard', 'saved', 'history', 'bookings', 'profile'].includes(subtabParam)) {
        setActiveSubTab(subtabParam as any);
      }
    }
  }, []);

  // Fetch real statistics dynamically from backend
  useEffect(() => {
    if (!userEmail) return;
    
    const fetchUserStats = async () => {
      try {
        const res = await fetch(`/api/v1/user/stats?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setStatsData({
            saved_places_count: data.saved_places_count,
            searches_count: data.searches_count,
            reviews_count: data.reviews_count,
            bookings_count: data.bookings_count,
            recent_searches: data.recent_searches || [],
            saved_places_detailed: data.saved_places_detailed || [],
            bookings: data.bookings || [],
            reviews: data.reviews || [],
            searches_detailed: data.searches_detailed || []
          });
        }
      } catch (err) {
        console.error("Failed to fetch backend user stats:", err);
      }
    };
    fetchUserStats();
  }, [userEmail, reloadCounter]);

  const handleSaveToggle = async (placeName: string, placeAddress: string = '') => {
    if (!userEmail) return;
    try {
      await fetch('/api/v1/user/favorite/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          place_name: placeName,
          place_address: placeAddress
        })
      });
      setReloadCounter(prev => prev + 1);
    } catch (err) {
      console.warn("Could not sync favorite toggle with backend database:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    onNavigate('landing');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('results', searchQuery);
    } else {
      onNavigate('results');
    }
  };


  const stats = [
    { label: 'Saved Places', count: statsData.saved_places_count.toString().padStart(2, '0'), icon: Bookmark, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { label: 'Searches', count: statsData.searches_count.toString().padStart(2, '0'), icon: Search, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400' },
    { label: 'Reviews', count: statsData.reviews_count.toString().padStart(2, '0'), icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' },
    { label: 'Bookings', count: statsData.bookings_count.toString().padStart(2, '0'), icon: Calendar, color: 'text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 dark:text-fuchsia-400' },
  ];

  const recentSearches = [
    'best restaurants in delhi',
    'hotels in goa',
    'places to visit in mumbai',
    'cafe in bangalore',
    'events in delhi',
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 flex text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-slate-200/50 dark:border-slate-800/60 hidden lg:flex flex-col py-6 px-4 shrink-0 justify-between h-screen sticky top-0 backdrop-blur-md">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer px-2" onClick={() => onNavigate('landing')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <MapPin className="w-4.5 h-4.5 fill-white/20" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              CityFinder <span className="text-indigo-600">AI</span>
            </span>
          </div>

          {/* Menu */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 text-sm font-semibold transition-all"
            >
              <HomeIcon className="w-4.5 h-4.5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => onNavigate('results')}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 text-sm font-semibold transition-all"
            >
              <Compass className="w-4.5 h-4.5" />
              <span>Explore</span>
            </button>
            <button
              onClick={() => setActiveSubTab('dashboard')}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeSubTab === 'dashboard'
                  ? 'text-indigo-600 bg-indigo-50/60 font-bold'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 font-semibold'
              }`}
            >
              <Bookmark className="w-4.5 h-4.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveSubTab('saved')}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeSubTab === 'saved'
                  ? 'text-indigo-600 bg-indigo-50/60 font-bold'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 font-semibold'
              }`}
            >
              <Heart className="w-4.5 h-4.5" />
              <span>Saved Places</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeSubTab === 'history'
                  ? 'text-indigo-600 bg-indigo-50/60 font-bold'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 font-semibold'
              }`}
            >
              <Compass className="w-4.5 h-4.5" />
              <span>Search History</span>
            </button>
            <button
              onClick={() => setActiveSubTab('bookings')}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeSubTab === 'bookings'
                  ? 'text-indigo-600 bg-indigo-50/60 font-bold'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 font-semibold'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Bookings</span>
            </button>
            <button
              onClick={() => setActiveSubTab('profile')}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeSubTab === 'profile'
                  ? 'text-indigo-600 bg-indigo-50/60 font-bold'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 font-semibold'
              }`}
            >
              <User className="w-4.5 h-4.5" />
              <span>Profile Page</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-rose-600 hover:bg-rose-50/50 text-sm font-extrabold transition-all cursor-pointer border border-rose-100/30 bg-rose-50/10"
              >
                <Settings className="w-4.5 h-4.5" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-red-500 hover:bg-red-50 text-sm font-semibold transition-all cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Search Header */}
        <header className="glass-panel border-b border-slate-200/50 dark:border-slate-800/60 py-4 px-6 sticky top-0 z-40 flex items-center justify-between gap-4 backdrop-blur-md">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800 focus-within:border-indigo-300 focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all rounded-xl p-1 flex items-center">
            <div className="flex items-center gap-2.5 pl-3.5 flex-1">
              <Search className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for places, restaurants, hotels..."
                className="w-full text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-transparent py-2 focus:outline-none text-sm font-medium"
              />
              <Mic className="w-4 h-4 text-slate-400 mr-2" />
            </div>
          </form>

          {/* Header Controls */}
          <div className="flex items-center gap-4.5">
            <button 
              onClick={toggleDarkMode}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <button 
              onClick={() => setActiveSubTab('saved')}
              className={`w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer ${activeSubTab === 'saved' ? 'bg-indigo-50 text-indigo-650' : ''}`}
              title="Saved Places"
            >
              <Heart className={`w-5 h-5 ${activeSubTab === 'saved' ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <div className="relative">
              <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-500 relative transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.is_read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-50 dark:border-slate-900"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/60 p-4 z-50 text-left">
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
             <div 
               onClick={() => setActiveSubTab('profile')}
               className="w-9 h-9 rounded-full overflow-hidden border border-indigo-200 dark:border-indigo-900 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
             >
               <img
                 src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                 alt="Profile"
                 className="w-full h-full object-cover"
               />
             </div>
          </div>
        </header>

        {/* Content Details */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-8">
          {activeSubTab === 'dashboard' && (
            <>
              {/* Welcome Banner */}
              <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden shadow-xs">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl"></div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Hello, {userName} <span className="animate-bounce">👋</span>
                  </h1>
                  <p className="text-sm text-slate-400 mt-1 font-medium">
                    Explore new places and create unforgettable memories.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('results')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-indigo-150 cursor-pointer shrink-0"
                >
                  Start Exploring
                </button>
              </div>

              {/* Stats Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (stat.label === 'Saved Places') setActiveSubTab('saved');
                        if (stat.label === 'Searches') setActiveSubTab('history');
                        if (stat.label === 'Bookings') setActiveSubTab('bookings');
                        if (stat.label === 'Reviews') setActiveSubTab('profile');
                      }}
                      className="glass-card rounded-2xl p-5 flex items-center justify-between hover:shadow-md hover:border-indigo-150 transition-all cursor-pointer"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">{stat.count}</span>
                      </div>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Main Grid: Left Recommends & Right User Details */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recommended For You Column (Left 2 cols) */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Recommended for You</h2>
                    </div>
                    <button 
                      onClick={() => onNavigate('results')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      View all
                    </button>
                  </div>

                  {/* Grid of Recommended places */}
                  <div className="flex flex-col gap-3">
                    {recommendations.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800" onClick={() => onNavigate('results', item.name)}>
                        <img src={item.image_url || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=300&q=80'} alt={item.name} className="w-20 h-20 rounded-xl object-cover shadow-sm group-hover:shadow transition-all" />
                        <div className="flex-1 py-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.name}</h4>
                              <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                <Star className="w-3 h-3 fill-amber-500" />
                                <span>{item.rating || '4.5'}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">{item.address || item.location}</p>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full self-start">
                              {item.category || 'Recommendation'}
                            </span>
                          </div>
                          <div className="flex justify-end mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const bookingDate = prompt(`Reserve table/room at ${item.name}\nEnter booking date (YYYY-MM-DD):`, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                if (!bookingDate) return;
                                fetch('/api/v1/user/booking', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ email: userEmail, place_name: item.name, booking_date: bookingDate })
                                }).then(res => {
                                  if (res.ok) {
                                    alert(`🎉 Booking confirmed at ${item.name} for ${bookingDate}!`);
                                    setReloadCounter(prev => prev + 1);
                                    setActiveSubTab('bookings');
                                  }
                                }).catch(err => console.warn(err));
                              }}
                              className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3.5 py-1.5 cursor-pointer transition-all shadow-xs"
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile & Recent Searches Column (Right 1 col) */}
                <div className="flex flex-col gap-6">
                  {/* User Profile Card */}
                  <div className="glass-card rounded-3xl p-6 flex flex-col items-center text-center shadow-xs">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-250 dark:border-indigo-900/60">
                      <img
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
                        alt="Profile big"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-4">{userName}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">{userEmail}</p>

                    <button 
                      onClick={() => setActiveSubTab('profile')}
                      className="mt-5 w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  </div>

                  {/* Recent Searches */}
                  <div className="glass-card rounded-3xl p-6 flex flex-col gap-4 shadow-xs">
                    <h3 className="font-bold text-slate-900 text-sm">Recent Searches</h3>
                    
                    <div className="flex flex-col gap-1">
                      {(statsData.recent_searches.length > 0 ? statsData.recent_searches : recentSearches).map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => onNavigate('results', search)}
                          className="flex items-center justify-between text-left py-2.5 px-3 rounded-xl hover:bg-indigo-50/50 group transition-all"
                        >
                          <div className="flex items-center gap-2.5 truncate max-w-[85%]">
                            <Search className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="text-xs font-semibold text-slate-650 group-hover:text-indigo-650 transition-colors truncate">
                              {search}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-350 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSubTab === 'saved' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Your Saved Places</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">Places you bookmarked for future travel plans.</p>
                </div>
                <button
                  onClick={() => onNavigate('results')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Explore More
                </button>
              </div>

              {statsData.saved_places_detailed.length === 0 ? (
                <div className="glass-card rounded-3xl py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
                  <Heart className="w-12 h-12 text-slate-200 fill-slate-50 dark:fill-slate-900" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">No Saved Places Yet</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs font-medium">Start exploring cities and click the heart icon on any venue to save them here!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {statsData.saved_places_detailed.map((place) => (
                    <div
                      key={place.id}
                      className="glass-card rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate max-w-[85%]">{place.place_name}</h3>
                          <button
                            onClick={() => handleSaveToggle(place.place_name)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
                            title="Remove bookmark"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-350" />
                          <span className="truncate">{place.place_address || 'Local Place, India'}</span>
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => onNavigate('results', place.place_name)}
                          className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer"
                        >
                          Find on Map
                        </button>
                        <button
                          onClick={() => {
                            const bookingDate = prompt(`Reserve spot at ${place.place_name}\nEnter booking date (YYYY-MM-DD):`, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                            if (!bookingDate) return;
                            fetch('/api/v1/user/booking', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: userEmail, place_name: place.place_name, booking_date: bookingDate })
                            }).then(res => {
                              if (res.ok) {
                                alert(`🎉 Booking confirmed at ${place.place_name} for ${bookingDate}!`);
                                setReloadCounter(prev => prev + 1);
                                setActiveSubTab('bookings');
                              }
                            });
                          }}
                          className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Your Search History</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">Timeline of your geocoded search keywords and discover queries.</p>
                </div>
                {statsData.searches_detailed.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm("Are you sure you want to clear your entire search history?")) return;
                      await fetch('/api/v1/user/search/clear_all', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail })
                      });
                      setReloadCounter(prev => prev + 1);
                    }}
                    className="text-xs font-bold text-red-500 hover:bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {statsData.searches_detailed.length === 0 ? (
                <div className="glass-card rounded-3xl py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
                  <Compass className="w-12 h-12 text-slate-200" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">No Search History Found</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs font-medium">Your searches will be logged here in real-time as you query places!</p>
                </div>
              ) : (
                <div className="glass-card rounded-3xl overflow-hidden shadow-xs">
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                    {statsData.searches_detailed.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-all group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-slate-800 truncate">{item.query}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              Searched on {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onNavigate('results', item.query)}
                            className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                          >
                            Search Again
                          </button>
                          <button
                            onClick={async () => {
                              await fetch('/api/v1/user/search/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: userEmail, search_id: item.id })
                              });
                              setReloadCounter(prev => prev + 1);
                            }}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete query log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'bookings' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Bookings & Trips</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">Your confirmed hotel stays, restaurant dining slots, and attraction admissions.</p>
                </div>
                <button
                  onClick={() => {
                    const place = prompt("Book a spot at any place:\nEnter restaurant/hotel/attraction name:");
                    if (!place) return;
                    const bookingDate = prompt(`Enter reservation date for ${place} (YYYY-MM-DD):`, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                    if (!bookingDate) return;
                    fetch('/api/v1/user/booking', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: userEmail, place_name: place, booking_date: bookingDate })
                    }).then(res => {
                      if (res.ok) {
                        alert(`🎉 Successfully confirmed booking at ${place} for ${bookingDate}!`);
                        setReloadCounter(prev => prev + 1);
                      }
                    });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Create Booking
                </button>
              </div>

              {statsData.bookings.length === 0 ? (
                <div className="glass-card rounded-3xl py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
                  <Calendar className="w-12 h-12 text-slate-200" />
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">No Trip Bookings Yet</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs font-medium">Use the "Book Now" buttons on places inside the search results or recommendations to schedule active bookings!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {statsData.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="glass-card rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between gap-5 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded uppercase tracking-wider">
                            ID: #{booking.id.toString().padStart(4, '0')}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded px-2 py-0.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Confirmed
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-base mt-3.5 truncate group-hover:text-indigo-600 transition-colors">
                          {booking.place_name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-350 shrink-0" />
                          <span>Reserved for: <strong className="text-slate-850 font-bold">{booking.booking_date}</strong></span>
                        </p>
                      </div>
                      <div className="flex justify-end pt-3.5 border-t border-slate-50 dark:border-slate-800 mt-1.5">
                        <button
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to cancel your booking at ${booking.place_name}?`)) return;
                            const res = await fetch('/api/v1/user/booking/delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: userEmail, booking_id: booking.id })
                            });
                            if (res.ok) {
                              alert(`Booking at ${booking.place_name} cancelled successfully.`);
                              setReloadCounter(prev => prev + 1);
                            }
                          }}
                          className="text-[10px] font-bold text-red-500 hover:bg-red-50 border border-red-200 rounded-lg px-3.5 py-2 transition-all cursor-pointer"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'profile' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Profile & Preferences</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">Manage your personal credentials, view dynamic activity charts, and coordinate accounts.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Profile details editor */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Identity Edit panel */}
                  <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col gap-5 shadow-xs">
                    <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                      <Sparkles className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                      Edit Public Identity
                    </h3>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const res = await fetch('/api/v1/user/profile/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail, name: userName })
                      });
                      if (res.ok) {
                        alert("🎉 Profile updated successfully in database!");
                        setReloadCounter(prev => prev + 1);
                      }
                    }} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Your Full Name</label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                          placeholder="Arjun Verma"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Email Address (Locked)</label>
                        <input
                          type="email"
                          value={userEmail}
                          disabled
                          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-indigo-150 cursor-pointer text-center mt-2"
                      >
                        Save Settings
                      </button>
                    </form>
                  </div>

                  {/* Account Overview Stats */}
                  <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col gap-5 shadow-xs">
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">Real-time Stats Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-100/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bookmarks</span>
                        <strong className="text-xl font-black text-emerald-500 dark:text-emerald-450">{statsData.saved_places_count} Saved</strong>
                      </div>
                      <div className="p-4 bg-slate-100/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Search Logs</span>
                        <strong className="text-xl font-black text-indigo-500 dark:text-indigo-400">{statsData.searches_count} Queries</strong>
                      </div>
                      <div className="p-4 bg-slate-100/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Written Reviews</span>
                        <strong className="text-xl font-black text-amber-500 dark:text-amber-400">{statsData.reviews_count} Reviews</strong>
                      </div>
                      <div className="p-4 bg-slate-100/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Trip Bookings</span>
                        <strong className="text-xl font-black text-fuchsia-500 dark:text-fuchsia-400">{statsData.bookings_count} Trips</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right profile widgets */}
                <div className="flex flex-col gap-6">
                  {/* Large Badge Card */}
                  <div className="bg-indigo-950/70 border border-indigo-900/40 dark:bg-indigo-950/50 text-white rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden shadow-md shrink-0 backdrop-blur-md">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                    <div className="w-20 h-20 bg-indigo-900 dark:bg-indigo-900/50 border border-indigo-750 text-indigo-200 rounded-full flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
                      {userName ? userName.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <h3 className="font-extrabold text-white text-base mt-4">{userName || "Avinash Raj"}</h3>
                    <p className="text-[10px] text-indigo-300 font-bold bg-indigo-800/80 dark:bg-indigo-900/80 rounded-full px-3 py-1 mt-2.5 uppercase tracking-widest shrink-0">
                      Verified Explorer ✔
                    </p>
                    <p className="text-[11px] text-indigo-200 max-w-xs font-semibold mt-4 leading-relaxed">
                      Thank you for using CityFinder AI. Every search and bookmark helps our AI models construct better travel coordinates for your next trip!
                    </p>
                  </div>

                  {/* Quick Profile Navigation */}
                  <div className="glass-card rounded-3xl p-6 flex flex-col gap-4 shadow-xs">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Quick Actions</h3>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setActiveSubTab('saved')} className="w-full text-left py-2.5 px-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-650 dark:text-slate-350 flex items-center justify-between cursor-pointer">
                        <span>View Saved Places</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                      <button onClick={() => setActiveSubTab('bookings')} className="w-full text-left py-2.5 px-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-650 dark:text-slate-350 flex items-center justify-between cursor-pointer">
                        <span>Manage Active Bookings</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                      <button onClick={() => setActiveSubTab('history')} className="w-full text-left py-2.5 px-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-650 dark:text-slate-350 flex items-center justify-between cursor-pointer">
                        <span>Check Search History</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
