import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const rawBackend = process.env.SERVER_URL || process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  const backendOrigin = rawBackend ? rawBackend.replace(/\/+$/, '') : null;

  if (backendOrigin) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${backendOrigin}/api/health`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MasterHRMS-CMS-HealthProbe/1.0',
        },
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }

      return NextResponse.json(
        {
          status: res.ok ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          backendStatus: res.status,
          service: 'Master HRMS Gateway',
        },
        { status: res.status }
      );
    } catch (err: any) {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          service: 'Master HRMS Gateway',
          backend: {
            status: 'unreachable',
            target: backendOrigin,
            error: err?.name === 'AbortError' ? 'Backend health ping timed out' : (err?.message || 'Failed to connect to backend'),
          },
        },
        { status: 503 }
      );
    }
  }

  // Standalone mode when SERVER_URL is not configured
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Master HRMS Web CMS',
    mode: 'standalone',
    uptimeSeconds: typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime()) : 0,
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    },
  });
}
