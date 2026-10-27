import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptimeSeconds: typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime()) : 0,
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
