import { useState, type FormEvent } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  changePassword,
  isCurrentUserAnonymous,
} from '../services/persistence/supabaseClient';

type Mode = 'sign_in' | 'sign_up' | 'change_password';

// Themed auth modal — sign-up (converts anon to permanent), sign-in
// (replaces current session), and change-password (in-place, needs
// active permanent session).
export function AuthModal({
  onClose,
  defaultMode = 'sign_up',
  headline,
  body,
}: {
  onClose: (result?: 'signed_up' | 'signed_in' | 'password_changed') => void;
  defaultMode?: Mode;
  headline?: string;
  body?: string;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<
    | { kind: 'email_sent'; email: string }
    | { kind: 'password_changed' }
    | null
  >(null);

  const isAnon = isCurrentUserAnonymous();
  const isChange = mode === 'change_password';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccessState(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (mode === 'change_password') {
      const result = await changePassword(newPassword);
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccessState({ kind: 'password_changed' });
      return;
    }

    const result =
      mode === 'sign_up'
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (mode === 'sign_up' && result.needsEmailConfirmation) {
      // Don't close — show the "check your inbox" state so the user
      // knows the sign-up is not yet complete.
      setSuccessState({ kind: 'email_sent', email });
      return;
    }
    onClose(mode === 'sign_up' ? 'signed_up' : 'signed_in');
    if (mode === 'sign_in') window.location.reload();
  }

  // Success screen (pending email confirmation OR password changed)
  if (successState) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={() => onClose(successState.kind === 'password_changed' ? 'password_changed' : 'signed_up')}
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
          {successState.kind === 'email_sent' ? (
            <>
              <h2 className="font-fantasy text-xl font-bold mb-2">Check your inbox</h2>
              <p className="text-sm mb-3">
                We sent a confirmation link to <span className="font-bold">{successState.email}</span>.
                Click the link to finish linking your email to this account.
              </p>
              <p className="text-xs opacity-80 mb-4">
                Your progress on this browser is already saved — you can keep playing.
                The email link just makes it possible to log back in from another device.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-fantasy text-xl font-bold mb-2">Password updated</h2>
              <p className="text-sm mb-4">
                Your new password is active. Use it next time you sign in.
              </p>
            </>
          )}
          <button
            onClick={() => onClose(successState.kind === 'password_changed' ? 'password_changed' : 'signed_up')}
            className="px-4 py-2 rounded font-fantasy font-bold text-sm"
            style={{ background: '#8a1c1c', color: '#faeaca' }}
          >
            Got it
          </button>
        </div>
      </div>
    );
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
          {headline ??
            (mode === 'sign_up'
              ? 'Save your progress'
              : mode === 'sign_in'
                ? 'Welcome back'
                : 'Change password')}
        </h2>
        {body && <p className="text-sm mb-4 opacity-90">{body}</p>}

        {!isChange && (
          <div className="flex mb-4 border-b" style={{ borderColor: 'rgba(74,50,17,0.2)' }}>
            <button
              type="button"
              className={`px-4 py-2 font-fantasy text-sm ${mode === 'sign_up' ? 'border-b-2 font-bold' : 'opacity-60'}`}
              style={mode === 'sign_up' ? { borderColor: '#8a1c1c' } : {}}
              onClick={() => switchMode('sign_up')}
            >
              Create account
            </button>
            <button
              type="button"
              className={`px-4 py-2 font-fantasy text-sm ${mode === 'sign_in' ? 'border-b-2 font-bold' : 'opacity-60'}`}
              style={mode === 'sign_in' ? { borderColor: '#8a1c1c' } : {}}
              onClick={() => switchMode('sign_in')}
            >
              Sign in
            </button>
          </div>
        )}

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
          {!isChange && (
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
          )}
          {!isChange && (
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
          )}
          {isChange && (
            <label className="block">
              <span className="block text-xs font-bold mb-1 uppercase tracking-wider">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={busy}
                className="w-full px-3 py-2 rounded border text-sm"
                style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(74,50,17,0.3)', color: '#4a3211' }}
              />
            </label>
          )}

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
              {busy
                ? 'Working…'
                : mode === 'sign_up'
                  ? 'Create account'
                  : mode === 'sign_in'
                    ? 'Sign in'
                    : 'Update password'}
            </button>
            <button
              type="button"
              onClick={() => !busy && onClose()}
              disabled={busy}
              className="px-3 py-2 rounded font-fantasy text-xs"
              style={{ color: '#4a3211' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
