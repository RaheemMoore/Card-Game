type HeaderValue = string | string[] | undefined;

interface ApiRequest {
  method?: string;
  headers: Record<string, HeaderValue>;
  query: Record<string, HeaderValue>;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  end(): void;
}

const SIGNED_URL_TTL_SECONDS = 60 * 30;

function env() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && anon && service ? { url: url.replace(/\/$/, ''), anon, service } : null;
}

function first(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function bearer(req: ApiRequest): string | null {
  const value = first(req.headers.authorization) ?? first(req.headers.Authorization);
  return value?.startsWith('Bearer ') ? value.slice(7).trim() : null;
}

function portraitObjectPath(value: string | null): string | null {
  if (!value || value.startsWith('data:') || value.startsWith('/assets/')) return null;
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, '').replace(/^portraits\//, '');
  const marker = '/storage/v1/object/public/portraits/';
  const index = value.indexOf(marker);
  return index >= 0 ? decodeURIComponent(value.slice(index + marker.length)) : null;
}

async function signPortrait(config: NonNullable<ReturnType<typeof env>>, value: string | null): Promise<string | null> {
  const path = portraitObjectPath(value);
  if (!path) return value;
  if (path.includes('..')) return null;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${config.url}/storage/v1/object/sign/portraits/${encoded}`, {
    method: 'POST',
    headers: {
      apikey: config.service,
      Authorization: `Bearer ${config.service}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
  });
  if (!response.ok) return null;
  const data = await response.json() as { signedURL?: string; signedUrl?: string };
  const signed = data.signedURL ?? data.signedUrl;
  if (!signed) return null;
  return signed.startsWith('http') ? signed : `${config.url}${signed}`;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const config = env();
  if (!config) {
    res.status(500).json({ error: 'Studio review service is not configured.' });
    return;
  }
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in to open the alpha card pool.' });
    return;
  }

  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anon, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) {
    res.status(401).json({ error: 'Your Studio session has expired.' });
    return;
  }

  const payload = {
    search_query: first(req.query.search)?.trim() || null,
    archetype_filter: first(req.query.archetype) || null,
    disposition_filter: first(req.query.status) || null,
    sort_direction: first(req.query.sort) === 'oldest' ? 'oldest' : 'newest',
    limit_count: Math.min(100, Math.max(1, Number(first(req.query.limit) ?? 24) || 24)),
    offset_count: Math.max(0, Number(first(req.query.offset) ?? 0) || 0),
  };
  const rpcResponse = await fetch(`${config.url}/rest/v1/rpc/list_studio_card_reviews`, {
    method: 'POST',
    headers: {
      apikey: config.anon,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!rpcResponse.ok) {
    const detail = await rpcResponse.text();
    res.status(rpcResponse.status).json({ error: 'Could not load the alpha card pool.', detail });
    return;
  }

  const rows = await rpcResponse.json() as Array<Record<string, unknown> & { portrait_url: string | null; card_data: Record<string, unknown> }>;
  const cardIds = rows.map((row) => String(row.card_id)).filter((value) => /^[A-Za-z0-9_-]+$/.test(value));
  const abilityRefs = cardIds.length ? await fetch(
    `${config.url}/rest/v1/card_ability_references?select=card_id,slot_type,local_tier,ability_id,data&card_id=in.(${cardIds.join(',')})`,
    { headers: { apikey: config.service, Authorization: `Bearer ${config.service}` } },
  ).then((response) => response.ok ? response.json() : []) as Array<Record<string, unknown>> : [];
  const abilityIds = [...new Set(abilityRefs.map((ref) => String(ref.ability_id)).filter((value) => /^[A-Za-z0-9_-]+$/.test(value)))];
  const abilityDefinitions = abilityIds.length ? await fetch(
    `${config.url}/rest/v1/ability_definitions?select=id,display_name,data&id=in.(${abilityIds.join(',')})`,
    { headers: { apikey: config.service, Authorization: `Bearer ${config.service}` } },
  ).then((response) => response.ok ? response.json() : []) as Array<Record<string, unknown>> : [];
  const definitionsById = new Map(abilityDefinitions.map((definition) => [String(definition.id), definition]));
  const hydrated = await Promise.all(rows.map(async (row) => {
    const signedPortrait = await signPortrait(config, row.portrait_url);
    const card = { ...row.card_data };
    if (signedPortrait) card.portraitAsset = signedPortrait;
    const abilities = abilityRefs.filter((ref) => ref.card_id === row.card_id).map((ref) => {
      const definition = definitionsById.get(String(ref.ability_id));
      const data = (definition?.data ?? {}) as Record<string, unknown>;
      return {
        abilityId: String(ref.ability_id),
        slotType: String(ref.slot_type),
        localTier: String(ref.local_tier),
        displayName: String(definition?.display_name ?? data.displayName ?? ref.ability_id),
        description: String(data.descriptionShort ?? 'No ability description is attached.'),
      };
    });
    return { ...row, portrait_url: signedPortrait, card_data: card, abilities };
  }));

  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({
    cards: hydrated,
    totalCount: hydrated.length ? Number((hydrated[0] as Record<string, unknown>).total_count ?? 0) : 0,
    signedUrlTtlSeconds: SIGNED_URL_TTL_SECONDS,
  });
}
