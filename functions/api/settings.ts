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

export const onRequestGet: PagesFunction<Env> = async context => {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  try {
    const result = await env.TV.prepare(
      'SELECT favorites, custom_logos, custom_urls, playlist_url, skip_intro, intro_end, outro_start FROM user_settings WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    if (!result) {
      return new Response(JSON.stringify(null), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(`Database Error: ${(err as Error).message}`, { status: 500 });
  }
};

interface SettingsRequestBody {
  userId: string;
  favorites?: string[];
  customLogos?: Record<string, string>;
  customUrls?: Record<string, string>;
  playlistUrl?: string;
  skipIntro?: boolean;
  introEnd?: number;
  outroStart?: number;
}

export const onRequestPost: PagesFunction<Env> = async context => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as SettingsRequestBody;
    const {
      userId,
      favorites,
      customLogos,
      customUrls,
      playlistUrl,
      skipIntro,
      introEnd,
      outroStart,
    } = body;

    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    // Upsert logic
    await env.TV.prepare(
      `INSERT INTO user_settings (user_id, favorites, custom_logos, custom_urls, playlist_url, skip_intro, intro_end, outro_start, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON CONFLICT(user_id) DO UPDATE SET 
       favorites=excluded.favorites, 
       custom_logos=excluded.custom_logos, 
       custom_urls=excluded.custom_urls,
       playlist_url=excluded.playlist_url,
       skip_intro=excluded.skip_intro,
       intro_end=excluded.intro_end,
       outro_start=excluded.outro_start,
       updated_at=excluded.updated_at`
    )
      .bind(
        userId,
        JSON.stringify(favorites || []),
        JSON.stringify(customLogos || {}),
        JSON.stringify(customUrls || {}),
        playlistUrl,
        skipIntro !== undefined ? String(skipIntro) : null,
        introEnd !== undefined ? String(introEnd) : null,
        outroStart !== undefined ? String(outroStart) : null,
        Date.now()
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(`Database Error: ${(err as Error).message}`, { status: 500 });
  }
};
