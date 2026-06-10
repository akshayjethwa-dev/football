import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { registerWithEmail } from '../services/authService';
import { Shield, Key, Mail, Landmark, Users } from 'lucide-react';

export default function LoginPage() {
  const { login, loginWithGoogle, loginSandbox } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccessMsg(null);

    try {
      if (isRegistering) {
        // Register client admin or superadmin
        // Note: Special case, if email matches designated superadmin, register as superadmin
        const isSuperAdminEmail = 
          email === 'ironpoolj@gmail.com' || 
          email === 'superadmin@ashreysystems.com';
        
        await registerWithEmail(email, password, isSuperAdminEmail ? 'superadmin' : 'clientadmin', null);
        setSuccessMsg("Account created successfully! Logging you in...");
        // Auto login
        await login(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please verify your credentials.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed') || err.message?.includes('CONFIGURATION_NOT_FOUND')) {
        setError(
          <div className="space-y-2 text-xs">
            <p className="font-bold underline text-rose-350">Email/Password Sign-In Method is Disabled</p>
            <p>This occurs when the Email/Password sign-in provider is not yet activated on the Firebase project.</p>
            <p>Please click the button below to go to your Firebase Console under <strong className="text-white">Authentication &gt; Sign-in method</strong>, choose <strong className="text-white">Email/Password</strong>, enable it, and press save.</p>
            <div className="pt-1">
              <a 
                href="https://console.firebase.google.com/project/predictive-district-xw1xt/authentication/providers" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold px-3 py-1.5 rounded-lg transition"
              >
                <span>Enable Email/Password Provider in Firebase Console</span>
                <span>↗</span>
              </a>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Or click "Authenticate with Google" below for an instant, zero-setup sign-in bypass.</p>
          </div>
        );
      } else {
        setError(err.message || "An authentication error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    setSuccessMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError(
          <div className="space-y-2 text-xs">
            <p className="font-bold underline text-rose-350">Google Provider has not been initialized</p>
            <p>Please click the link below to verify that Authentication features are enabled in the Firebase Console.</p>
            <a 
              href="https://console.firebase.google.com/project/predictive-district-xw1xt/authentication/providers" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <span>Verify Providers Console</span>
              <span>↗</span>
            </a>
          </div>
        );
      } else {
        setError(err.message || "An error occurred during Google Auth.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSetup = () => {
    setEmail('superadmin@ashreysystems.com');
    setPassword('ashrey1234');
    setIsRegistering(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-xl text-slate-900 shadow-lg shadow-emerald-500/20">
            <Landmark className="h-7 w-7" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans">
            Ashrey Systems
          </span>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white font-sans">
          Football Campaign Engine
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          {isRegistering ? 'Create internal superadmin account' : 'B2B campaign administration center'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-4 border border-slate-800 shadow-2xl rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm leading-relaxed">
              <p className="font-semibold mb-1">Authentication Alert</p>
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-sm">
              {successMsg}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-3 text-sm placeholder-slate-600 transition"
                  placeholder="superadmin@ashreysystems.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-3 text-sm placeholder-slate-600 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-98"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : isRegistering ? 'Register as SuperAdmin' : 'Sign In To Console'}
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-slate-800 hover:border-slate-700 rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-900 transition shadow-md active:scale-98 cursor-pointer"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Instant Login with Google</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  await loginSandbox();
                } catch (err: any) {
                  setError(err.message || "Failed to start Offline Sandbox mode.");
                }
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl bg-emerald-500/10 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition shadow-md active:scale-98 cursor-pointer"
            >
              <svg className="h-4.5 w-4.5 mr-0.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Instant Local Sandbox Mode (Zero Setup)</span>
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-medium">
                  Quick Access
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleQuickDemoSetup}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl bg-slate-950/40 text-xs font-medium text-slate-400 hover:text-emerald-400 transition"
              >
                <Shield className="h-4 w-4" />
                Fill Test SuperAdmin Parameters
              </button>

              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="mt-2 text-center text-sm ml-1 text-emerald-400 hover:text-emerald-300 hover:underline transition self-center"
              >
                {isRegistering ? 'Already have an account? Sign in' : 'First-time super-admin setup? Create local account'}
              </button>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-850 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Ashrey Internal super-access only
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
