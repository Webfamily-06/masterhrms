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

      const res = await fetch(`${backendOrigin}/api/health/ready`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
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
        { status: res.ok ? 'ready' : 'not_ready', timestamp: new Date().toISOString() },
        { status: res.status }
      );
    } catch (err: any) {
      return NextResponse.json(
        {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          error: err?.message || 'Backend readiness check failed',
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    service: 'Master HRMS Web CMS',
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
