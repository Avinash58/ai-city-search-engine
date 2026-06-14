'use client';

import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles, AlertCircle, CheckCircle2, Mail, Key } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface SignInViewProps {
  onNavigate: (view: 'landing' | 'results' | 'signin' | 'dashboard', query?: string) => void;
}

export default function SignInView({ onNavigate }: SignInViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic-link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth operation states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        // Sign Up Mode
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}?view=dashboard` : undefined
          }
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          if (!isSupabaseConfigured) {
            setSuccessMsg("Sandbox Account Created Successfully! Redirecting you...");
            setTimeout(() => {
              onNavigate('dashboard');
            }, 1500);
          } else {
            setSuccessMsg("Success! Please check your Gmail inbox to verify your account.");
          }
        }
      } else {
        // Sign In Mode
        if (loginMethod === 'magic-link') {
          // Magic Link (Gmail OTP)
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}?view=dashboard` : undefined
            }
          });

          if (error) {
            setErrorMsg(error.message);
          } else {
            setSuccessMsg("A secure login confirmation link has been sent to your Gmail inbox! Please open the email and click the link to log in directly.");
          }
        } else {
          // Standard Password Sign In
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            setErrorMsg(error.message);
          } else {
            setSuccessMsg("Welcome back! Loading your profile dashboard...");
            setTimeout(() => {
              onNavigate('dashboard');
            }, 1200);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!isSupabaseConfigured) {
        setSuccessMsg("Sandbox Mode Google Sign-In Successful! Redirecting you...");
        setTimeout(() => {
          onNavigate('dashboard');
        }, 1500);
        return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}?view=dashboard` : undefined
        }
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Google Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col md:flex-row text-slate-800 font-sans">
      {/* Left Column: Visual Splash */}
      <div className="w-full md:w-1/2 bg-slate-950 relative flex flex-col justify-end p-8 md:p-16 text-white min-h-[320px] md:min-h-screen">
        {/* Background Image of Historical Arch */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80"
            alt="Historical Arch Sunset"
            className="w-full h-full object-cover opacity-50"
          />
          {/* Linear gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-900/10"></div>
        </div>

        {/* Back to Home Button floating */}
        <button
          onClick={() => onNavigate('landing')}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs px-3.5 py-2 rounded-xl backdrop-blur-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Text Overlay */}
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Explore the world <br />
            with <span className="text-indigo-400">AI-Powered Search</span>
          </h2>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed font-medium">
            Find the best places, restaurants, hotels, events and more in your city.
          </p>
        </div>
      </div>

      {/* Right Column: Login/Signup Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 bg-slate-50/50">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 md:p-10 shadow-lg shadow-slate-100/50">
          {/* Header */}
          <div className="text-center md:text-left mb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isSignUp ? "Create your Account" : "Welcome Back!"}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 font-medium">
              {isSignUp ? "Join CityFinder AI to save plans and explore" : "Login to continue your journey"}
            </p>
          </div>

          {/* Sandbox Fallback Mode Indicator Alert */}
          {!isSupabaseConfigured && (
            <div className="mb-6 bg-amber-50/80 border border-amber-250/50 rounded-2xl p-4 flex gap-3 text-amber-850">
              <Sparkles className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-extrabold block mb-0.5">Supabase Sandbox Sandbox Active</span>
                No API credentials loaded. You can register or log in using any email and password combination to test the layout immediately!
              </div>
            </div>
          )}

          {/* Success Notification */}
          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 flex gap-3 animate-fade-in">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{successMsg}</p>
            </div>
          )}

          {/* Error Notification */}
          {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-800 rounded-2xl p-4 flex gap-3 animate-fade-in">
              <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Login Method Tab Toggles (Only in Sign In Mode) */}
          {!isSignUp && (
            <div className="flex bg-slate-100/80 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer ${
                  loginMethod === 'password'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('magic-link');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer ${
                  loginMethod === 'magic-link'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Gmail Link</span>
              </button>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 text-xs px-4 py-3.5 rounded-xl focus:outline-none transition-all placeholder-slate-400 font-medium"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500" htmlFor="email">
                Email address (Gmail ID)
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 text-xs px-4 py-3.5 rounded-xl focus:outline-none transition-all placeholder-slate-400 font-medium"
              />
            </div>

            {/* Render Password Input only if standard password login OR signup mode is active */}
            {(isSignUp || loginMethod === 'password') && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500" htmlFor="password">
                    Password
                  </label>
                  {!isSignUp && (
                    <a
                      href="#"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 text-xs px-4 py-3.5 rounded-xl focus:outline-none transition-all placeholder-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Auth Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs py-4 rounded-xl transition-all shadow-md shadow-indigo-150 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>
                    {isSignUp
                      ? "Creating Account..."
                      : loginMethod === 'magic-link'
                      ? "Sending Login Link..."
                      : "Signing In..."}
                  </span>
                </>
              ) : (
                <span>
                  {isSignUp
                    ? "Register"
                    : loginMethod === 'magic-link'
                    ? "Send Gmail Login Link"
                    : "Login"}
                </span>
              )}
            </button>
          </form>

          {/* Social Sign-In (Only for Sign In View to preserve space) */}
          {!isSignUp && (
            <>
              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-slate-100"></div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-350 px-4">or</span>
                <div className="flex-1 border-t border-slate-100"></div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-3.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          )}

          {/* Mode Switch Link */}
          <div className="text-center mt-6">
            <p className="text-xs font-semibold text-slate-400">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={toggleAuthMode}
                className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors cursor-pointer"
              >
                {isSignUp ? "Sign In" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


