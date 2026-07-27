import { AuthModal } from '../components/AuthModal';

// Throwaway preview route — just the new login background behind the
// existing auth boxes so Raheem can see how the art reads. Not the final
// login page design; that's separate follow-up work.
export function LoginPreview() {
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
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative z-10">
        <AuthModal onClose={() => {}} />
      </div>
    </div>
  );
}
