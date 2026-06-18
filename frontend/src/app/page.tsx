'use client';

import React, { useState, useEffect } from 'react';
import LandingView from '@/components/LandingView';
import SearchResultsView from '@/components/SearchResultsView';
import SignInView from '@/components/SignInView';
import DashboardView from '@/components/DashboardView';
import AdminView from '@/components/AdminView';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

type ViewType = 'landing' | 'results' | 'signin' | 'dashboard' | 'admin';

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [searchQuery, setSearchQuery] = useState('best restaurants in delhi');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // 0. Sync theme on load to prevent visual flashing
    if (typeof window !== 'undefined') {
      const isDark = localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // 1. Sync view with URL search parameters (e.g. ?view=dashboard)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') as ViewType;
      if (viewParam && ['landing', 'results', 'signin', 'dashboard', 'admin'].includes(viewParam)) {
        setCurrentView(viewParam);
      }
      const qParam = params.get('q');
      if (qParam) {
        setSearchQuery(qParam);
      }
    }

    // 2. Fetch existing session on load
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCurrentView(currentView === 'landing' ? 'dashboard' : currentView);
          setUserEmail(session.user?.email || '');
        }
      } catch (err) {
        console.error("Session fetch failed:", err);
      }
    };
    checkActiveSession();

    // 3. Setup real-time authentication event listener (crucial for Google OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log("Supabase Auth Event:", event);
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        // Only override landing to dashboard, if they navigated to another view keep it
        setCurrentView(prev => prev === 'landing' ? 'dashboard' : prev);
        setUserEmail(session.user?.email || '');
      } else if (event === 'SIGNED_OUT') {
        setCurrentView('landing');
        setUserEmail('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleNavigation = (view: ViewType, query?: string) => {
    if (query && view !== 'dashboard' && view !== 'admin') {
      setSearchQuery(query);
    }
    setCurrentView(view);

    // Sync state query params with active browser URL address-bar string dynamically!
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      
      if (view === 'dashboard' && query && ['saved', 'history', 'bookings', 'profile'].includes(query)) {
        url.searchParams.set('subtab', query);
      } else {
        url.searchParams.delete('subtab');
      }

      if (view === 'results' && query) {
        url.searchParams.set('q', query);
      } else {
        url.searchParams.delete('q');
      }

      window.history.pushState({}, '', url.pathname + url.search);
    }

    // Smooth scroll to top on navigate
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="w-full min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Ultra-Premium Glassmorphism Backdrop Blur Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top Left Glow */}
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/0 blur-[100px] dark:from-indigo-600/15"></div>
        {/* Center Right Glow */}
        <div className="absolute top-[25%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-br from-purple-500/15 to-pink-500/0 blur-[120px] dark:from-purple-600/10"></div>
        {/* Bottom Left Glow */}
        <div className="absolute -bottom-[10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr from-emerald-400/10 to-sky-400/0 blur-[100px] dark:from-emerald-600/8"></div>
        {/* Bottom Right Glow */}
        <div className="absolute bottom-[10%] right-[15%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-bl from-pink-400/10 to-rose-450/0 blur-[90px] dark:from-pink-600/8"></div>
      </div>

      <div className="w-full h-full flex flex-col relative z-10">
        {currentView === 'landing' && (
          <LandingView onNavigate={handleNavigation} />
        )}
        {currentView === 'results' && (
          <SearchResultsView 
            initialQuery={searchQuery} 
            onNavigate={handleNavigation} 
          />
        )}
        {currentView === 'signin' && (
          <SignInView onNavigate={handleNavigation} />
        )}
        {currentView === 'dashboard' && (
          <DashboardView onNavigate={handleNavigation} />
        )}
        {currentView === 'admin' && (
          <AdminView userEmail={userEmail} onNavigate={handleNavigation} />
        )}
      </div>
    </main>
  );
}

