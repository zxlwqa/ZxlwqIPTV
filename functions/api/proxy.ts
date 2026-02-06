// Proxy function to handle CORS for video streams
// Usage: /api/proxy?url=https://example.com/video.m3u8

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

export const onRequestGet: PagesFunction = async context => {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    // Validate URL to prevent SSRF attacks
    const targetUrlObj = new URL(targetUrl);
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(targetUrlObj.protocol)) {
      return new Response('Invalid protocol', {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Fetch the target resource
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return new Response(`Proxy error: ${response.status} ${response.statusText}`, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Read the response body
    const body = await response.arrayBuffer();

    // For HLS manifest files (.m3u8), we may need to rewrite URLs
    let finalBody: ArrayBuffer | string = body;
    if (
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegURL') ||
      targetUrl.includes('.m3u8')
    ) {
      // Rewrite relative URLs in the manifest to use our proxy
      const text = new TextDecoder().decode(body);
      const baseUrl = new URL(targetUrl);
      const proxyBase = `${url.origin}${url.pathname}`;

      // Rewrite URLs in the manifest
      const rewritten = text
        .split('\n')
        .map(line => {
          const trimmedLine = line.trim();

          // Skip comments and empty lines (but preserve them)
          if (trimmedLine.startsWith('#') || trimmedLine === '') {
            return line;
          }

          // Check if line contains a URL (could be in various HLS tag formats)
          // Handle absolute URLs
          if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
            // Absolute URL - proxy it
            return `${proxyBase}?url=${encodeURIComponent(trimmedLine)}`;
          }
          // Handle root-relative URLs
          else if (trimmedLine.startsWith('/')) {
            // Root-relative URL
            return `${proxyBase}?url=${encodeURIComponent(baseUrl.origin + trimmedLine)}`;
          }
          // Handle relative URLs (most common case for HLS segments)
          else if (!trimmedLine.startsWith('#') && trimmedLine.length > 0) {
            // Relative URL - resolve against base URL
            const dir = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
            const resolvedUrl = new URL(trimmedLine, baseUrl.origin + dir).href;
            return `${proxyBase}?url=${encodeURIComponent(resolvedUrl)}`;
          }

          // Return original line if no URL pattern matched
          return line;
        })
        .join('\n');

      finalBody = rewritten;
    }

    // Return the proxied response with CORS headers
    return new Response(finalBody, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        // Preserve important headers from the original response
        ...(response.headers.get('content-length') && {
          'Content-Length': response.headers.get('content-length')!,
        }),
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(`Proxy error: ${(error as Error).message}`, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  // Handle CORS preflight requests
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400',
    },
  });
};
