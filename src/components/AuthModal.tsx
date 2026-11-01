import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, ArrowRight, AlertCircle, CheckCircle2, UserPlus, Mail, ShieldAlert } from 'lucide-react';
import { apiRequest, setStoredAuth } from '../lib/api';
import { AdminUser } from '../types';

interface AuthModalProps {
  onLoginSuccess: (user: AdminUser) => void;
  isSessionExpired?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess, isSessionExpired }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'request-reset' | 'verify-reset'>('login');
  
  // Login fields
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@NexGrid2026!');
  
  // Signup fields
  const [signupMasterCode, setSignupMasterCode] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Password reset fields
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ token: string; user: AdminUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setStoredAuth(res.token, res.user);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (signupMasterCode.trim() !== '0099484830') {
      setError('Invalid Master Authorization Code. Master code 0099484830 is required to register an administrator.');
      return;
    }

    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: AdminUser; message: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          masterCode: signupMasterCode.trim(),
          username: signupUsername.trim(),
          email: signupEmail.trim(),
          fullName: signupFullName.trim(),
          password: signupPassword,
        }),
      });

      setSuccessMsg('Account registered and verified successfully! Entering portal...');
      setStoredAuth(res.token, res.user);
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiRequest<{ message: string; devToken?: string }>('/api/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccessMsg(res.message);
      if (res.devToken) {
        setResetToken(res.devToken);
        setMode('verify-reset');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request reset token.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/verify-reset', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      setSuccessMsg(res.message);
      setTimeout(() => {
        setMode('login');
        setPassword(newPassword);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100 relative overflow-y-auto font-sans selection:bg-blue-600 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[250px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-auto z-10 relative">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">NexGrid Admin Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSessionExpired
              ? 'Your session timed out due to inactivity. Accounts and records remain permanently stored.'
              : 'Internal Customer & Domain Infrastructure Management'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Mode 1: Login */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Admin Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or nexgriddigital@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('request-reset');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Helper Credentials */}
            <div className="pt-2 text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('Admin@NexGrid2026!');
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline decoration-slate-600 underline-offset-4 transition-colors block mx-auto"
              >
                Autofill default administrator credentials
              </button>

              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                Need a new admin account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign Up with Master Code
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Mode 2: Sign Up with Master Code */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3.5 text-xs">
            {/* Master Code input highlighted */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>Master Authorization Code *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSignupMasterCode('0099484830')}
                  className="text-[10px] text-blue-400 hover:text-blue-200 underline decoration-blue-500/50"
                >
                  Use 0099484830
                </button>
              </div>

              <input
                type="text"
                required
                value={signupMasterCode}
                onChange={(e) => setSignupMasterCode(e.target.value)}
                placeholder="Enter 0099484830"
                className="w-full px-3 py-2 bg-slate-950 border border-blue-700/60 rounded-lg text-white font-mono text-sm tracking-wider focus:outline-hidden focus:border-blue-400"
              />
              <p className="text-[10px] text-blue-200/80">
                Required master authorization code: <strong className="font-mono text-white">0099484830</strong>
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
                placeholder="e.g. Dawit Tadesse"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="e.g. dawit"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="dawit@nexgrid.et"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Password (min 8 chars) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 mt-2"
            >
              <span>{loading ? 'Registering Administrator...' : 'Create Admin Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Already registered? <span className="text-blue-400 font-semibold">Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* Mode 3: Request Password Reset */}
        {mode === 'request-reset' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <p className="text-xs text-slate-400">
              Enter your verified administrator email address to generate a 15-minute verification token.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nexgriddigital@gmail.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {loading ? 'Processing...' : 'Request Verification Token'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="w-full text-xs text-slate-400 hover:text-white text-center block pt-1"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Mode 4: Verify Reset Token & Set New Password */}
        {mode === 'verify-reset' && (
          <form onSubmit={handleVerifyReset} className="space-y-4">
            <p className="text-xs text-slate-400">
              Enter the reset token along with your new secure administrator password.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reset Token</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Verification token"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {loading ? 'Updating Password...' : 'Save New Password & Log In'}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-xs text-slate-400 hover:text-white text-center block pt-1"
            >
              Cancel and Return to Sign In
            </button>
          </form>
        )}
      </div>

      {/* Security footer */}
      <div className="mt-6 text-center text-xs text-slate-500 z-10 space-y-1">
        <p className="flex items-center justify-center gap-1.5 font-medium text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
          <span>NexGrid Digital Systems Enterprise Portal</span>
        </p>
        <p className="text-[11px] text-slate-600">
          Authorized personnel only • Africa/Addis_Ababa Timezone • 256-bit PBKDF2 Encryption
        </p>
      </div>
    </div>
  );
};
