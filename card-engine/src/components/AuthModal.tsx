import { useState, type FormEvent } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  isCurrentUserAnonymous,
} from '../services/persistence/supabaseClient';

type Mode = 'sign_in' | 'sign_up';

// Themed sign-in / sign-up modal. Opened from the nav auth chip and
// from the first-forge prompt. Sign-up path preserves the current
// anonymous session's uid via supabaseClient.signUpWithEmail (which
// wraps updateUser under the hood).
export function AuthModal({
  onClose,
  defaultMode = 'sign_up',
  headline,
  body,
}: {
  onClose: (result?: 'signed_up' | 'signed_in') => void;
  defaultMode?: Mode;
  headline?: string;
  body?: string;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnon = isCurrentUserAnonymous();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === 'sign_up'
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose(mode === 'sign_up' ? 'signed_up' : 'signed_in');
    // If sign-in landed us on a different uid, the app needs to
    // re-hydrate. Simplest: force a reload.
    if (mode === 'sign_in') {
      window.location.reload();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md p-6 rounded-lg shadow-2xl"
        style={{
          background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
          color: '#4a3211',
          border: '1px solid rgba(74,50,17,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-fantasy text-xl font-bold mb-1">
          {headline ?? (mode === 'sign_up' ? 'Save your progress' : 'Welcome back')}
        </h2>
        {body && <p className="text-sm mb-4 opacity-90">{body}</p>}

        <div className="flex mb-4 border-b" style={{ borderColor: 'rgba(74,50,17,0.2)' }}>
          <button
            type="button"
            className={`px-4 py-2 font-fantasy text-sm ${mode === 'sign_up' ? 'border-b-2 font-bold' : 'opacity-60'}`}
            style={mode === 'sign_up' ? { borderColor: '#8a1c1c' } : {}}
            onClick={() => {
              setMode('sign_up');
              setError(null);
            }}
          >
            Create account
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-fantasy text-sm ${mode === 'sign_in' ? 'border-b-2 font-bold' : 'opacity-60'}`}
            style={mode === 'sign_in' ? { borderColor: '#8a1c1c' } : {}}
            onClick={() => {
              setMode('sign_in');
              setError(null);
            }}
          >
            Sign in
          </button>
        </div>

        {mode === 'sign_up' && isAnon && (
          <p className="text-xs mb-3 opacity-80">
            Your existing cards will carry over to this account.
          </p>
        )}
        {mode === 'sign_in' && isAnon && (
          <p className="text-xs mb-3" style={{ color: '#8a1c1c' }}>
            Signing in to a different account replaces this browser's guest data.
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-bold mb-1 uppercase tracking-wider">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(74,50,17,0.3)', color: '#4a3211' }}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold mb-1 uppercase tracking-wider">Password</span>
            <input
              type="password"
              autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(74,50,17,0.3)', color: '#4a3211' }}
            />
          </label>

          {error && (
            <div
              className="text-xs p-2 rounded"
              style={{ background: 'rgba(220,38,38,0.15)', color: '#8a1c1c', border: '1px solid rgba(220,38,38,0.3)' }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded font-fantasy font-bold text-sm flex-1"
              style={{ background: '#8a1c1c', color: '#faeaca', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Working…' : mode === 'sign_up' ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => !busy && onClose()}
              disabled={busy}
              className="px-3 py-2 rounded font-fantasy text-xs"
              style={{ color: '#4a3211' }}
            >
              Continue as guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
