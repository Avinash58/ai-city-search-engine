import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  MessageSquare, 
  Search, 
  Radio, 
  Trash2, 
  ShieldAlert, 
  Check, 
  X, 
  ArrowLeft, 
  Send,
  Loader2,
  Compass
} from 'lucide-react';

interface AdminViewProps {
  onNavigate: (view: 'landing' | 'results' | 'signin' | 'dashboard' | 'admin', query?: string) => void;
  userEmail: string;
}

export default function AdminView({ onNavigate, userEmail }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'bookings' | 'reviews' | 'searches' | 'broadcast'>('overview');
  const [stats, setStats] = useState<any>({
    total_users: 0,
    total_searches: 0,
    total_bookings: 0,
    total_reviews: 0,
    average_rating: 0,
    top_queries: [],
    recent_activities: []
  });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [searchesList, setSearchesList] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch admin console statistics
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    }
  };

  // Fetch list depending on active tab
  const fetchTabData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'overview') {
        await fetchStats();
      } else if (activeTab === 'users') {
        const res = await fetch('/api/v1/admin/users');
        if (res.ok) setUsersList(await res.json());
      } else if (activeTab === 'bookings') {
        const res = await fetch('/api/v1/admin/bookings');
        if (res.ok) setBookingsList(await res.json());
      } else if (activeTab === 'reviews') {
        const res = await fetch('/api/v1/admin/reviews');
        if (res.ok) setReviewsList(await res.json());
      } else if (activeTab === 'searches') {
        const res = await fetch('/api/v1/admin/searches');
        if (res.ok) setSearchesList(await res.json());
      }
    } catch (err) {
      console.error(`Error loading data for tab ${activeTab}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  // Handle user deletion
  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user? All their searches, bookings, and reviews will be permanently removed.")) return;
    setActionLoading(`delete-user-${userId}`);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsersList(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle admin privilege toggle
  const handleToggleAdmin = async (userId: number) => {
    setActionLoading(`toggle-admin-${userId}`);
    try {
      const res = await fetch('/api/v1/admin/users/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_admin: data.is_admin } : u));
      }
    } catch (err) {
      console.error("Failed to toggle admin status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle review deletion
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    setActionLoading(`delete-review-${reviewId}`);
    try {
      const res = await fetch(`/api/v1/admin/reviews/${reviewId}`, { method: 'DELETE' });
      if (res.ok) {
        setReviewsList(prev => prev.filter(r => r.id !== reviewId));
      }
    } catch (err) {
      console.error("Failed to delete review:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle booking deletion
  const handleDeleteBooking = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel/delete this booking?")) return;
    setActionLoading(`delete-booking-${bookingId}`);
    try {
      const res = await fetch(`/api/v1/admin/bookings/${bookingId}`, { method: 'DELETE' });
      if (res.ok) {
        setBookingsList(prev => prev.filter(b => b.id !== bookingId));
      }
    } catch (err) {
      console.error("Failed to delete booking:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle system notification broadcast
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    
    setBroadcastStatus('sending');
    try {
      const res = await fetch('/api/v1/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage })
      });
      if (res.ok) {
        setBroadcastStatus('success');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setTimeout(() => setBroadcastStatus('idle'), 4000);
      } else {
        setBroadcastStatus('error');
      }
    } catch (err) {
      console.error("Failed to broadcast notification:", err);
      setBroadcastStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-68 shrink-0 glass-panel border-r border-slate-200/50 dark:border-slate-800/60 p-6 flex flex-col justify-between md:sticky md:top-0 md:h-screen z-10 backdrop-blur-md">
        <div>
          {/* Logo brand */}
          <div className="flex items-center gap-3.5 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/10">
              <ShieldAlert className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">AdminConsole</h1>
              <span className="text-xxs font-extrabold text-indigo-500 uppercase tracking-widest mt-1 block">CityFinder AI</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Manage Users', icon: Users },
              { id: 'bookings', label: 'Reservations', icon: Calendar },
              { id: 'reviews', label: 'Ratings & Reviews', icon: MessageSquare },
              { id: 'searches', label: 'User Search Logs', icon: Search },
              { id: 'broadcast', label: 'System Broadcast', icon: Radio },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/10'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Back to Home Button */}
        <button
          onClick={() => onNavigate('landing')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-all text-xs font-extrabold tracking-wide cursor-pointer mt-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Console</span>
        </button>
      </aside>

      {/* Main dashboard content workspace */}
      <main className="flex-1 flex flex-col min-w-0 p-6 md:p-8">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/40 pb-5 mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              {activeTab === 'overview' && 'System Analytics'}
              {activeTab === 'users' && 'Registered Users Directory'}
              {activeTab === 'bookings' && 'Reservations & Bookings'}
              {activeTab === 'reviews' && 'Reviews Moderation'}
              {activeTab === 'searches' && 'Live Query Search Logs'}
              {activeTab === 'broadcast' && 'System Notification Broadcast'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
              Logged in as super administrator: {userEmail}
            </p>
          </div>
          
          <button
            onClick={() => onNavigate('results')}
            className="px-4 py-2 text-xs font-extrabold bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            Go to Search View
          </button>
        </header>

        {/* Loading Spinner */}
        {isLoading && activeTab !== 'broadcast' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-400 font-semibold">Loading data from postgres...</p>
          </div>
        ) : (
          <div className="flex-1">
            {/* 📊 Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-8">
                {/* Stats grid Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4.5">
                  {[
                    { label: 'Total Users', value: stats.total_users, desc: 'Registered accounts', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' },
                    { label: 'Total Bookings', value: stats.total_bookings, desc: 'Active reservations', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
                    { label: 'Total Reviews', value: stats.total_reviews, desc: 'User ratings written', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
                    { label: 'Total Searches', value: stats.total_searches, desc: 'Searches logged', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' }
                  ].map((card, i) => (
                    <div key={i} className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <span className="text-xxs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{card.label}</span>
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-1.5">{card.value}</h3>
                      </div>
                      <span className="text-xxs text-slate-400 font-semibold mt-3.5 block">{card.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Search Queries */}
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                      <Search className="w-4 h-4 text-indigo-500" />
                      <span>Trending Search Queries</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {stats.top_queries.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 font-medium text-center">No search query logs available yet.</p>
                      ) : (
                        stats.top_queries.map((q: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/50">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-300">"{q.query}"</span>
                            <span className="text-xxs font-extrabold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md">
                              {q.count} searches
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* System Activity Stream */}
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      <span>Live Activity Stream</span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {stats.recent_activities.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 font-medium text-center">No recent activities logged.</p>
                      ) : (
                        stats.recent_activities.map((act: any, i: number) => (
                          <div key={i} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200/20">
                            <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">{act.desc}</p>
                              <span className="text-xxs font-extrabold uppercase text-indigo-500 tracking-wider mt-1.5 inline-block">{act.type}</span>
                            </div>
                            <span className="text-xxs text-slate-400 dark:text-slate-500 font-bold shrink-0 mt-0.5">
                              {act.time ? new Date(act.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 👥 Tab: Users */}
            {activeTab === 'users' && (
              <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-slate-600 dark:text-slate-300">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50">
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">User Email</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Name</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Role</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Joined Date</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-slate-400 font-medium">No registered users in database.</td>
                        </tr>
                      ) : (
                        usersList.map((usr, i) => (
                          <tr key={i} className="hover:bg-slate-100/10 dark:hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-900 dark:text-white">{usr.email}</td>
                            <td className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{usr.name || 'Anonymous'}</td>
                            <td className="p-4">
                              <span className={`text-xxs font-extrabold px-2.5 py-0.5 rounded-md ${
                                usr.is_admin 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900'
                                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900'
                              }`}>
                                {usr.is_admin ? 'Administrator' : 'User'}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                              {usr.created_at ? new Date(usr.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleToggleAdmin(usr.id)}
                                  disabled={actionLoading !== null}
                                  className="px-2.5 py-1 text-xxs font-extrabold text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-indigo-150 rounded-lg cursor-pointer"
                                >
                                  {usr.is_admin ? 'Revoke Admin' : 'Make Admin'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(usr.id)}
                                  disabled={actionLoading !== null || usr.email === userEmail}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 dark:hover:border-rose-900 transition-all disabled:opacity-40 cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 📅 Tab: Bookings */}
            {activeTab === 'bookings' && (
              <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-slate-600 dark:text-slate-300">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50">
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">User Email</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Place Name</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reservation Date</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                      {bookingsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-xs text-slate-400 font-medium">No active bookings/reservations.</td>
                        </tr>
                      ) : (
                        bookingsList.map((b, i) => (
                          <tr key={i} className="hover:bg-slate-100/10 dark:hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-900 dark:text-white">{b.user_email}</td>
                            <td className="p-4 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{b.place_name}</td>
                            <td className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{b.booking_date}</td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1.5 text-xxs font-extrabold text-rose-600 hover:bg-rose-50 border border-rose-150 rounded-lg cursor-pointer"
                              >
                                Cancel Booking
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 💬 Tab: Reviews */}
            {activeTab === 'reviews' && (
              <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-slate-600 dark:text-slate-300">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50">
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">User Email</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Place Name</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rating</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Comment</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                      {reviewsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-slate-400 font-medium">No reviews logged yet.</td>
                        </tr>
                      ) : (
                        reviewsList.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-100/10 dark:hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-900 dark:text-white">{r.user_email}</td>
                            <td className="p-4 text-xs font-extrabold text-slate-800 dark:text-slate-200">{r.place_name}</td>
                            <td className="p-4">
                              <span className="text-xxs font-extrabold text-amber-800 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md">
                                ★ {r.rating}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-xs truncate">
                              {r.comment || 'No comment provided.'}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteReview(r.id)}
                                disabled={actionLoading !== null}
                                className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                                title="Remove Inappropriate Review"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 🔍 Tab: Searches */}
            {activeTab === 'searches' && (
              <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-slate-600 dark:text-slate-300">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50">
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">User Email</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Search Query</th>
                        <th className="p-4 text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                      {searchesList.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-xs text-slate-400 font-medium">No search queries logged yet.</td>
                        </tr>
                      ) : (
                        searchesList.map((s, i) => (
                          <tr key={i} className="hover:bg-slate-100/10 dark:hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-950 dark:text-white">{s.user_email}</td>
                            <td className="p-4 text-xs font-mono font-bold text-indigo-650 dark:text-indigo-400">"{s.query}"</td>
                            <td className="p-4 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                              {s.created_at ? new Date(s.created_at).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 📢 Tab: Broadcast */}
            {activeTab === 'broadcast' && (
              <div className="max-w-xl mx-auto glass-card rounded-3xl p-6 md:p-8 mt-4 border border-slate-200/50 dark:border-slate-800/60 shadow-lg">
                <div className="flex flex-col items-center text-center gap-2 mb-8">
                  <Radio className="w-12 h-12 text-indigo-600 animate-pulse" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Broadcast Global Notification</h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 max-w-sm font-semibold">
                    Compose a title and message. This will push real-time notifications to the dashboard inbox of all registered database users.
                  </p>
                </div>

                <form onSubmit={handleBroadcast} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Notification Title</label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. System Maintenance Update"
                      className="w-full bg-slate-100/40 focus:bg-white dark:bg-slate-900/60 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 rounded-xl p-3.5 text-xs font-semibold focus:outline-none transition-all dark:text-white text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Message Body</label>
                    <textarea
                      required
                      rows={5}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Enter the notification content here..."
                      className="w-full bg-slate-100/40 focus:bg-white dark:bg-slate-900/60 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 rounded-xl p-3.5 text-xs font-semibold focus:outline-none transition-all resize-none dark:text-white text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={broadcastStatus === 'sending'}
                    className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-650/15 disabled:opacity-50 cursor-pointer"
                  >
                    {broadcastStatus === 'sending' ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        <span>Sending Broadcast...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Notification</span>
                      </>
                    )}
                  </button>

                  {broadcastStatus === 'success' && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-xl text-xxs font-extrabold flex items-center justify-center gap-2 animate-bounce">
                      <Check className="w-4.5 h-4.5" />
                      <span>Broadcast notification successfully pushed to all users!</span>
                    </div>
                  )}

                  {broadcastStatus === 'error' && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 rounded-xl text-xxs font-extrabold flex items-center justify-center gap-2">
                      <X className="w-4.5 h-4.5" />
                      <span>Failed to broadcast notification. Please try again.</span>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
