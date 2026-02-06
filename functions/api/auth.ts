// Password authentication API
// Usage: POST /api/auth with body: { password: "..." }

type PagesFunction<
  Env = unknown,
  Params extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (context: {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<Params, string | string[]>;
  data: Data;
}) => Response | Promise<Response>;

interface Env {
  PASSWORD?: string;
}

export const onRequestPost: PagesFunction<Env> = async context => {
  const { request, env } = context;

  try {
    const body: { password?: string } = await request.json();
    const providedPassword = body.password || '';

    // Get password from environment variable
    const correctPassword = env.PASSWORD || '';

    // If no password is set in environment, allow access (for development)
    if (!correctPassword) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No password configured',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Verify password
    if (providedPassword === correctPassword) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password correct',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Incorrect password',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error: ${(error as Error).message}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  // Handle CORS preflight requests
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};
