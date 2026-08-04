// The Studio Wiki deploys from the repository root so its build can consume
// canonical docs and game assets. Keep the function implementation beside the
// Wiki while exposing the conventional root /api route to Vercel. Vercel emits
// this root wrapper as CommonJS, so the ESM Wiki handler must load dynamically.
export default async function handler(request: unknown, response: unknown) {
  const route = await import('../studio-wiki/api/card-reviews.js');
  return route.default(request as never, response as never);
}
