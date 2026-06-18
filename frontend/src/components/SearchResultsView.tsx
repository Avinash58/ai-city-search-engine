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
  SlidersHorizontal,
  ChevronDown,
  Star,
  Sparkles,
  Mic,
  Send,
  X,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
/// <reference path="../types/google-maps.d.ts" />

interface SearchResultsViewProps {
  initialQuery?: string;
  onNavigate: (view: 'landing' | 'results' | 'signin' | 'dashboard', query?: string) => void;
}

export default function SearchResultsView({ initialQuery = 'best restaurants in delhi', onNavigate }: SearchResultsViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('All');
  const [savedPlaces, setSavedPlaces] = useState<string[]>(['Karim\'s']);
  const [showFilters, setShowFilters] = useState(false);
  const [activeSort, setActiveSort] = useState('rating');
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I can help you find details about restaurants, hotels, or attractions in India. What are you looking for?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const [user, setUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch real notifications when user logs in
  useEffect(() => {
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

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.warn("Error fetching user session in SearchResultsView:", err);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
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

  // GPS & Map States
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [lastResolvedLocation, setLastResolvedLocation] = useState<string | null>(null);

  // Live Query Results State
  const [results, setResults] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');

  // Leaflet Map SDK States
  const [leafletMap, setLeafletMap] = useState<any>(null);
  const [leafletMarkers, setLeafletMarkers] = useState<any[]>([]);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Sync query if initialQuery changes from parent coordinate triggers
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Parse GPS coordinates from search bar string if query starts with 'gps:'
  useEffect(() => {
    if (query.startsWith('gps:')) {
      const parts = query.replace('gps:', '').split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setUserCoords({ lat, lng });
        }
      }
    } else if (lastResolvedLocation && query === lastResolvedLocation) {
      // Do nothing, keep userCoords since we resolved this location
    } else {
      setUserCoords(null);
    }
  }, [query, lastResolvedLocation]);

  // Haversine formula calculation for relative card distance badges
  const getDistanceString = (place: any) => {
    if (place.distance_km !== undefined && place.distance_km !== null) {
      return `${place.distance_km} km away`;
    }
    if (userCoords && place.lat && place.lng) {
      const R = 6371.0; // Earth radius in km
      const dLat = (place.lat - userCoords.lat) * Math.PI / 180;
      const dLng = (place.lng - userCoords.lng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userCoords.lat * Math.PI / 180) *
          Math.cos(place.lat * Math.PI / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      return `${dist.toFixed(1)} km away`;
    }
    return '';
  };

  // Fetch search results in real-time from FastAPI backend server
  const fetchBackendSearch = async (searchQuery: string, categoryFilter: string) => {
    setIsLoadingResults(true);
    try {
      let url = `/api/v1/search/places?q=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(categoryFilter)}`;
      if (userCoords) {
        url += `&lat=${userCoords.lat}&lng=${userCoords.lng}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setAiSummary(data.ai_summary || '');

        if (data.resolved_location && searchQuery.startsWith('gps:')) {
          setLastResolvedLocation(data.resolved_location);
          setQuery(data.resolved_location);
        }
        
        // Log search query in the database for the active user
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email && searchQuery.trim() && !searchQuery.startsWith('gps:')) {
            fetch('/api/v1/user/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, query: searchQuery.trim() })
            }).catch(e => console.warn("Failed to POST search log:", e));
          }
        } catch (err) {
          console.warn("Could not log user search query activity:", err);
        }
      } else {
        console.error("Backend search failed with status:", res.status);
      }
    } catch (err) {
      console.warn("Backend search failed:", err);
      setResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Auto-request actual present location on mount to provide high-fidelity localized results!
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn("Present location geolocator access declined:", error);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Trigger search whenever search query, category tab, OR user present location coordinates update
  useEffect(() => {
    fetchBackendSearch(query, activeCategory);
  }, [query, activeCategory, userCoords]);

  // Geolocation tracker
  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      setLocationError('GPS not supported');
      return;
    }
    setIsLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setQuery(`gps:${latitude.toFixed(6)},${longitude.toFixed(6)}`);
      },
      (error) => {
        setIsLocating(false);
        setLocationError('Unable to retrieve location');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBackendSearch(query, activeCategory);
  };

  // Leaflet Map script dynamic initializer
  useEffect(() => {
    // 1. Inject Leaflet CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // 2. Inject Leaflet JS
    const scriptId = 'leaflet-js';
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement;

    const setupMapInstance = () => {
      const mapCanvas = document.getElementById('google-map-canvas');
      if (!mapCanvas || !(window as any).L) return;

      const L = (window as any).L;
      const centerCoord = userCoords || { lat: 28.6139, lng: 77.2090 };
      
      try {
        const mapObj = L.map(mapCanvas, {
          zoomControl: false,
          attributionControl: false
        }).setView([centerCoord.lat, centerCoord.lng], 12);

        L.control.zoom({
          position: 'topright'
        }).addTo(mapObj);

        setLeafletMap(mapObj);
        setIsLeafletReady(true);
      } catch (err) {
        console.warn("Leaflet double-init prevented or map load failed:", err);
      }
    };

    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = scriptId;
      scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      scriptElement.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      scriptElement.crossOrigin = '';
      scriptElement.onload = () => {
        setupMapInstance();
      };
      document.head.appendChild(scriptElement);
    } else if ((window as any).L) {
      setupMapInstance();
    }

    return () => {
      // Clean up map instance if needed
    };
  }, []);

  // Update dynamic Leaflet Map Tiles depending on dark mode state
  useEffect(() => {
    if (!leafletMap || !isLeafletReady || !(window as any).L) return;
    const L = (window as any).L;

    // Remove existing tile layers
    leafletMap.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        layer.remove();
      }
    });

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(leafletMap);
  }, [leafletMap, isLeafletReady, isDarkMode]);

  // Update dynamic map markers whenever results list or userCoords GPS state updates
  useEffect(() => {
    if (!leafletMap || !isLeafletReady || !(window as any).L) return;
    const L = (window as any).L;

    // Remove old active markers
    leafletMarkers.forEach(marker => marker.remove());
    const newMarkers: any[] = [];
    const points: any[] = [];

    // Custom aesthetic marker creator helper
    const createHtmlIcon = (color: string, text?: string) => {
      return L.divIcon({
        html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; font-family: sans-serif;">
          ${text || ''}
        </div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
    };

    // 1. Loop results and create Map Markers
    results.forEach((place, idx) => {
      if (place.lat && place.lng) {
        const markerIcon = createHtmlIcon('#4f46e5', (idx + 1).toString());
        const marker = L.marker([place.lat, place.lng], { icon: markerIcon }).addTo(leafletMap);

        // Add custom visual popups
        marker.bindPopup(`
          <div style="padding: 4px; font-family: system-ui, sans-serif; max-width: 190px;">
            <img src="${place.image}" style="width: 100%; height: 85px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />
            <h4 style="margin: 0 0 3px 0; font-size: 12px; font-weight: 800; color: #0f172a;">${place.name}</h4>
            <p style="margin: 0 0 5px 0; font-size: 10px; color: #64748b;">${place.address}</p>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 9px; font-weight: bold; background: #fef3c7; color: #d97706; padding: 1.5px 5px; border-radius: 4px;">★ ${place.rating}</span>
              <span style="font-size: 9px; font-weight: bold; color: #475569;">${place.price}</span>
            </div>
          </div>
        `);

        newMarkers.push(marker);
        points.push([place.lat, place.lng]);
      }
    });

    // 2. Render Present Location radar pin on the map
    if (userCoords) {
      const userMarkerIcon = L.divIcon({
        html: `<div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #2563eb; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #2563eb; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3); z-index: 10;"></div>
        </div>`,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const userPosMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userMarkerIcon }).addTo(leafletMap);
      userPosMarker.bindPopup('<strong style="font-family: sans-serif; font-size: 11px;">Your Location</strong>');
      newMarkers.push(userPosMarker);
      points.push([userCoords.lat, userCoords.lng]);

      // Center viewport smoothly on user present location coordinate
      leafletMap.panTo([userCoords.lat, userCoords.lng]);
      leafletMap.setZoom(13);
    } else if (points.length > 0) {
      // Fit maps viewport to cover all results
      leafletMap.fitBounds(points, { padding: [30, 30] });
    }

    setLeafletMarkers(newMarkers);
  }, [results, leafletMap, isLeafletReady, userCoords]);

  const categories = ['All', 'Restaurants', 'Hotels', 'Attractions', 'Events', 'More'];

  // Load user's real saved places from database on mount
  useEffect(() => {
    const fetchSavedPlacesList = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const res = await fetch(`/api/v1/user/stats?email=${encodeURIComponent(user.email)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.saved_places) {
              setSavedPlaces(data.saved_places);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load initial saved places from backend database:", err);
      }
    };
    fetchSavedPlacesList();
  }, []);

  const handleSaveToggle = async (name: string, address: string = '') => {
    // Optimistic UI updates
    if (savedPlaces.includes(name)) {
      setSavedPlaces(savedPlaces.filter(p => p !== name));
    } else {
      setSavedPlaces([...savedPlaces, name]);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await fetch('/api/v1/user/favorite/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            place_name: name,
            place_address: address
          })
        });
      }
    } catch (err) {
      console.warn("Could not sync favorite toggle with backend database:", err);
    }
  };

  const handleBookTrigger = async (placeName: string) => {
    const bookingDate = prompt(`Reserve a spot at ${placeName}\nEnter booking date (YYYY-MM-DD):`, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (!bookingDate) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        alert("Please sign in to make a booking!");
        return;
      }

      const res = await fetch('/api/v1/user/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          place_name: placeName,
          booking_date: bookingDate
        })
      });

      if (res.ok) {
        alert(`🎉 Booking confirmed at ${placeName} for ${bookingDate}! Redirecting to Dashboard...`);
        onNavigate('dashboard');
      } else {
        alert("Failed to confirm booking. Please try again.");
      }
    } catch (err) {
      console.error("Booking error:", err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    
    // Show a loading/typing indicator if desired, or just wait.
    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          history: chatMessages
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, the AI concierge is currently unavailable.' }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, could not connect to AI service.' }]);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-slate-200/50 dark:border-slate-800/60 hidden lg:flex flex-col py-6 px-4 shrink-0 justify-between h-screen sticky top-0 backdrop-blur-md">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer px-2" onClick={() => onNavigate('landing')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
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
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-sm font-semibold transition-all cursor-pointer"
            >
              <HomeIcon className="w-4.5 h-4.5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => onNavigate('results')}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 text-sm font-bold transition-all cursor-pointer"
            >
              <Compass className="w-4.5 h-4.5" />
              <span>Explore</span>
            </button>
            <button
              onClick={() => {
                if (user) {
                  onNavigate('dashboard', 'saved');
                } else {
                  onNavigate('signin');
                }
              }}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-sm font-semibold transition-all cursor-pointer"
            >
              <Bookmark className="w-4.5 h-4.5" />
              <span>Saved</span>
            </button>
            <button
              onClick={() => {
                if (user) {
                  onNavigate('dashboard', 'bookings');
                } else {
                  onNavigate('signin');
                }
              }}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-sm font-semibold transition-all cursor-pointer"
            >
              <Heart className="w-4.5 h-4.5" />
              <span>Trips</span>
            </button>
            <button
              onClick={() => {
                if (user) {
                  onNavigate('dashboard', 'profile');
                } else {
                  onNavigate('signin');
                }
              }}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-sm font-semibold transition-all cursor-pointer"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              <span>Reviews</span>
            </button>
            <button
              onClick={() => {
                if (user) {
                  onNavigate('dashboard', 'profile');
                } else {
                  onNavigate('signin');
                }
              }}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-sm font-semibold transition-all cursor-pointer"
            >
              <User className="w-4.5 h-4.5" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => {
                if (user) {
                  onNavigate('dashboard', 'profile');
                } else {
                  onNavigate('signin');
                }
              }}
              className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-sm font-semibold transition-all cursor-pointer"
            >
              <Settings className="w-4.5 h-4.5" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Logout / Back to home */}
        <button
          onClick={() => {
            if (user) {
              supabase.auth.signOut();
            }
            onNavigate('landing');
          }}
          className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-semibold transition-all cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>{user ? 'Logout' : 'Back to Home'}</span>
        </button>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Search header navigation */}
        <header className="glass-panel border-b border-slate-200/50 dark:border-slate-800/60 py-4 px-6 sticky top-0 z-40 flex items-center justify-between gap-4 backdrop-blur-md">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800 focus-within:border-indigo-300 focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all rounded-xl p-1 flex items-center">
            <div className="flex items-center gap-2.5 pl-3.5 flex-1">
              <Search className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for restaurants, hotels, cities..."
                className="w-full text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-transparent py-2 focus:outline-none text-sm font-medium"
              />
              <button
                type="button"
                onClick={handleGPSLocate}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  userCoords
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 shadow-sm'
                    : 'hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600'
                } cursor-pointer`}
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
                ) : (
                  <Compass className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Header Widgets */}
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
              title="View Saved Places"
            >
              <Heart className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-500 relative transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>

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
                  className="w-9 h-9 rounded-full overflow-hidden border border-indigo-250 dark:border-indigo-900 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all flex items-center justify-center bg-indigo-50 dark:bg-indigo-950"
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
        </header>

        {/* Content list body */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-6 relative z-10">
          
          {/* Left Cards List Column */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Category tabs selection */}
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 pb-3 flex-wrap gap-3">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveCategory(cat);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150'
                        : 'glass-card border border-slate-200/50 text-slate-500 hover:text-slate-800 dark:text-slate-350 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-850/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 glass-card border font-bold text-xs px-4.5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer ${
                    showFilters
                      ? 'border-indigo-300 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                      : 'border-slate-200/50 hover:border-indigo-150 text-slate-650 dark:text-slate-300'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                  <span>Filters</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                {showFilters && (
                  <div className="absolute right-0 top-12 z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800 p-4 flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sort By</p>
                      <div className="flex flex-col gap-1">
                        {[['rating', '⭐ Top Rated'], ['distance', '📍 Nearest First'], ['price_low', '💰 Price: Low to High'], ['price_high', '💎 Price: High to Low']].map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setActiveSort(val)}
                            className={`text-left text-sm px-3 py-2 rounded-xl transition-all cursor-pointer ${
                              activeSort === val
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                      <button
                        onClick={() => setFilterOpenNow(!filterOpenNow)}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-all cursor-pointer w-full ${
                          filterOpenNow
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${filterOpenNow ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        Open Now Only
                      </button>
                    </div>
                    <button
                      onClick={() => { setActiveSort('rating'); setFilterOpenNow(false); setShowFilters(false); }}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer text-left"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Results Title Info */}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {userCoords ? (
                  <>
                    Nearby results near <span className="text-gradient">Present Location</span>
                  </>
                ) : (
                  <>
                    Results for &ldquo;<span className="text-gradient">{query}</span>&rdquo;
                  </>
                )}
              </h1>
              {userCoords && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span>Active GPS coordinates: {userCoords.lat.toFixed(4)}°N, {userCoords.lng.toFixed(4)}°E</span>
                </p>
              )}
            </div>

            {/* Loading results spinner */}
            {isLoadingResults ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-xs text-slate-400 font-semibold">Fetching matched locations from FastAPI...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-2 glass-card rounded-3xl border border-slate-200/50 dark:border-slate-800/60">
                <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-650" />
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm mt-2">No Matching Places Found</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs font-semibold">Try searching for other places or select a different category!</p>
              </div>
            ) : (
              /* Cards List */
              <div className="flex flex-col gap-4.5">
                {results.map((place, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl p-4.5 flex gap-5 hover:shadow-lg hover:border-indigo-150 transition-all group duration-300"
                  >
                    {/* Place Thumbnail */}
                    <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
                      <img
                        src={place.image}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-550"
                        loading="lazy"
                      />
                    </div>

                    {/* Place Info */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {place.name}
                            </h3>
                            <span className="flex items-center gap-0.5 text-xs font-extrabold text-white bg-green-500 rounded-lg px-1.5 py-0.5">
                              {place.rating}
                            </span>
                          </div>

                          <button
                            onClick={() => handleSaveToggle(place.name, place.address || '')}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                          >
                            <Heart
                              className={`w-4.5 h-4.5 ${
                                savedPlaces.includes(place.name)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-slate-400'
                              }`}
                            />
                          </button>
                        </div>

                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{place.address}</span>
                          {(getDistanceString(place) !== '') && (
                            <>
                              <span className="text-[10px] text-slate-350">•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                                {getDistanceString(place)}
                              </span>
                            </>
                          )}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-1">
                          {place.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100/50 dark:border-slate-850/50 pt-3 mt-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-450">{place.price}</span>
                          <span className="text-[10px] text-slate-350">•</span>
                          <span className="text-[11px] font-semibold text-emerald-500 dark:text-emerald-450">{place.status}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {place.tags && place.tags.slice(0, 2).map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className="text-[10px] font-bold text-slate-500 dark:text-slate-450 bg-slate-100/60 dark:bg-slate-800/60 rounded-md px-2 py-1"
                            >
                              {tag}
                            </span>
                          ))}
                          <button
                            onClick={() => handleBookTrigger(place.name)}
                            className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md px-2.5 py-1 transition-all ml-1.5 cursor-pointer shadow-xs shrink-0"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            <button className="w-full py-3.5 glass-card border border-slate-200/50 hover:border-indigo-150 font-bold text-xs text-indigo-600 dark:text-indigo-450 rounded-2xl shadow-xs transition-colors mt-2">
              Load More
            </button>
          </div>

          {/* Right Map & AI Column */}
          <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6">
            
            {/* Real Interactive Google Map Panel */}
            <div className="glass-panel border border-slate-200/50 dark:border-slate-800/60 rounded-2xl overflow-hidden h-72 relative flex flex-col shadow-sm">
              <div id="google-map-canvas" className="w-full h-full z-0 bg-slate-50 dark:bg-slate-950"></div>
              
              {/* Map Floating Control Overlay */}
              <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg shadow-md z-10 backdrop-blur-xs flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Live Google Map Active</span>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl p-5 flex flex-col gap-4 shadow-xs relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
              
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-450" />
                <h3 className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">AI Summary</h3>
              </div>

              <p className="text-xs text-indigo-850 dark:text-indigo-300 leading-relaxed">
                {aiSummary ? aiSummary : "Explore dynamic premium spots powered by custom vector-similarity AI indexing. Click any marker on the map to inspect place rating badges, image cards, and dynamic coordinates."}
              </p>

              <button
                onClick={() => setIsChatOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-150 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 fill-white/10" />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* AI Assistant Chat Sidebar Drawer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs">
          <div className="w-full max-w-md glass-panel h-full shadow-2xl flex flex-col animate-fade-in border-l border-slate-200/40 dark:border-slate-800/60 backdrop-blur-xl">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-250/20 dark:border-slate-800/60 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 fill-white/20" />
                <div>
                  <h3 className="font-bold text-sm">CityFinder AI Assistant</h3>
                  <p className="text-[10px] text-indigo-100">City Tour Guide • Always Active</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-xs shadow-sm shadow-indigo-100'
                        : 'bg-slate-100/70 dark:bg-slate-850/60 text-slate-850 dark:text-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 mx-1.5 uppercase font-semibold">
                    {msg.sender === 'user' ? 'You' : 'CityFinder AI'}
                  </span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-slate-250/30 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask details about places..."
                className="flex-1 bg-white/70 dark:bg-slate-950/70 border border-slate-200/50 dark:border-slate-800/60 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50/30 text-xs px-4 py-3 rounded-xl focus:outline-none transition-all"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-3 shadow-md shadow-indigo-150 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
