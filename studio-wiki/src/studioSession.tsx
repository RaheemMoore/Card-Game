import { useEffect, useState } from 'react';
import { LogIn, RefreshCw, TriangleAlert } from 'lucide-react';
import { Panel } from './components';
import {
  getStudioSession,
  subscribeStudioSession,
  restoreStudioSession,
  signInToStudio,
  isStudioDataConfigured,
  type StudioSession,
} from './studioApi';

/**
 * The session hook and the sign-in panel.
 *
 * Both lived inside App.tsx until the lore desk needed them too (2026-08-10).
 * Exporting them from App would have made LoreDesk import the module that
 * imports it, so they moved here instead — no behaviour change, just a home
 * that more than one page can reach.
 */

export function useStudioSession() {
  const [session, setSession] = useState<StudioSession | null>(() => getStudioSession());
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const sync = () => setSession(getStudioSession());
    const unsubscribe = subscribeStudioSession(sync);
    restoreStudioSession().finally(() => { sync(); setChecking(false); });
    return unsubscribe;
  }, []);
  return { session, checking };
}

export function StudioSignIn({ purpose }: { purpose: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const configured = isStudioDataConfigured();
  return <Panel className="studio-signin">
    <LogIn/><div><p className="eyebrow">TEAM ACCESS</p><h2>Sign in with your Card Engine account</h2><p>{purpose} This uses the same account as the game; the Wiki never stores your password.</p>
      {!configured ? <div className="studio-service-note"><TriangleAlert/><span>The live workspace will activate after Supabase environment configuration is added to this Wiki deployment.</span></div> : <form onSubmit={async (event) => { event.preventDefault(); setWorking(true); setError(''); try { await signInToStudio(email, password); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.'); } finally { setWorking(false); } }}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}/></label><button disabled={working}>{working ? <RefreshCw className="spin"/> : <LogIn/>}{working ? 'Signing in…' : 'Open the Studio'}</button>{error && <p className="studio-form-error" role="alert">{error}</p>}</form>}
    </div>
  </Panel>;
}
