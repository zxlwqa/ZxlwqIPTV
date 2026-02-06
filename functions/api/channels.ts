// Define Cloudflare Workers types locally to resolve compilation errors
interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

type PagesFunction<
  Env = unknown,
  Params extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;

interface Env {
  TV: D1Database;
}

interface ChannelRequestBody {
  userId: string;
  name: string;
  group?: string;
  logo?: string;
  url: string;
  tvgId?: string;
}

// Simple hash function to generate stable IDs
const generateId = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  try {
    const result = await env.TV.prepare(
      'SELECT id, name, "group", logo, url, tvg_id FROM custom_channels WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

    if (!result.results) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    interface ChannelRow {
      id: string;
      name: string;
      group: string | null;
      logo: string | null;
      url: string;
      tvg_id: string | null;
    }

    const channels = result.results.map((row: ChannelRow) => ({
      id: row.id,
      name: row.name,
      group: row.group || '我的收藏',
      logo: row.logo || undefined,
      url: row.url,
      tvgId: row.tvg_id || undefined,
    }));

    return new Response(JSON.stringify(channels), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(`Database Error: ${(err as Error).message}`, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async context => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as ChannelRequestBody;
    const { userId, name, group, logo, url, tvgId } = body;

    if (!userId || !name || !url) {
      return new Response('Missing required fields: userId, name, url', { status: 400 });
    }

    // Generate ID from name + url to ensure uniqueness
    const id = `custom_${generateId(`${userId}_${name}_${url}`)}`;
    const now = Date.now();

    // Insert or update
    await env.TV.prepare(
      `INSERT INTO custom_channels (id, user_id, name, "group", logo, url, tvg_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON CONFLICT(id) DO UPDATE SET 
       name=excluded.name, 
       "group"=excluded."group",
       logo=excluded.logo,
       url=excluded.url,
       tvg_id=excluded.tvg_id,
       updated_at=excluded.updated_at`
    )
      .bind(id, userId, name, group || '我的收藏', logo || null, url, tvgId || null, now, now)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        id,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(`Database Error: ${(err as Error).message}`, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async context => {
  const { request, env } = context;
  const url = new URL(request.url);
  const channelId = url.searchParams.get('id');
  const userId = url.searchParams.get('userId');

  if (!channelId || !userId) {
    return new Response('Missing id or userId', { status: 400 });
  }

  try {
    await env.TV.prepare('DELETE FROM custom_channels WHERE id = ? AND user_id = ?')
      .bind(channelId, userId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(`Database Error: ${(err as Error).message}`, { status: 500 });
  }
};
