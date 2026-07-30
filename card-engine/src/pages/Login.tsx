import { AuthModal } from '../components/AuthModal';
import { landingRoute } from './Landing';

/**
 * The front door.
 *
 * A DESTINATION, NOT A DIALOG. `AuthModal` normally renders as a fixed-inset
 * scrim you can click away — here it renders in its `page` variant, which drops
 * the scrim and the Cancel button, because there is nothing behind this to
 * dismiss to. Same component either way: the form owns sign-in, sign-up, Google
 * SSO and password reset, and a second copy would drift into a second set of
 * bugs.
 *
 * Two art crops, swapped at `md` — the login art was painted as a landscape and
 * a portrait rather than one image squeezed to fit.
 */
export function Login() {
  return (
    <div className="relative min-h-dvh flex items-center justify-center">
      <img
        src="/assets/backgrounds/archetypes/login/landscape.jpg"
        alt=""
        className="hidden md:block fixed inset-0 w-full h-full object-cover"
      />
      <img
        src="/assets/backgrounds/archetypes/login/portrait.jpg"
        alt=""
        className="md:hidden fixed inset-0 w-full h-full object-cover"
      />
      {/* Legibility wash, not a modal scrim — the art stays readable behind it. */}
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

      <main className="relative z-10 w-full max-w-md">
        <h1
          className="font-fantasy text-4xl font-bold text-center mb-1 tracking-wide"
          style={{ color: '#f5d98a', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
        >
          Card Engine
        </h1>
        <p
          className="text-center text-sm mb-5 font-fantasy tracking-widest"
          style={{ color: '#e8d4ae', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
        >
          ─ ✦ ─
        </p>

        <AuthModal
          variant="page"
          defaultMode="sign_in"
          headline="Enter the castle"
          // `onClose` is the SUCCESS callback here, not a dismissal — this page
          // has nothing to dismiss to.
          //
          // A full navigation rather than a state flip, because signing in has
          // to re-run PersistenceGate's whole boot: migration, card hydration,
          // wallet, ability seeding. Re-entering the app without that would
          // leave the stores holding the previous (anonymous) session's data.
          onClose={() => {
            window.location.href = landingRoute();
          }}
          footer={
            <p className="mt-4 text-center text-[11px] font-fantasy tracking-wide opacity-70">
              Closed testing · invite only
            </p>
          }
        />
      </main>
    </div>
  );
}
