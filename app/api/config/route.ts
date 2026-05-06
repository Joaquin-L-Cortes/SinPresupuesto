export const runtime = 'edge';

import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

function headers() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };
}

async function getRow(id: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_config?id=eq.${encodeURIComponent(id)}&select=data&limit=1`,
    { headers: headers() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.data ?? null;
}

async function getAllRows() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_config?select=id,data`,
    { headers: headers() }
  );
  if (!res.ok) return [];
  return await res.json();
}

async function upsertRow(id: string, data: any) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_config`,
    {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ id, data, updated_at: new Date().toISOString() }),
    }
  );
  return res.ok;
}

async function deleteRow(id: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_config?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: headers() }
  );
  return res.ok;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (!file) return NextResponse.json({ error: 'File param missing' }, { status: 400 });

  const configId = file.replace('.json', '');

  if (configId === 'redes') {
    const rows = await getAllRows();
    const redes = (rows as any[])
      .filter((row: any) => row.id.startsWith('redes_'))
      .map((row: any) => ({
        filename: row.id.replace('redes_', '') + '.json',
        ...row.data,
      }));
    return NextResponse.json(redes);
  }

  const data = await getRow(configId);
  if (data === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const { file, data, filename } = await request.json();
  if (!file || !data) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  let configId = file.replace('.json', '');
  if (file === 'redes' && filename) {
    configId = 'redes_' + filename.replace('.json', '');
  }

  const ok = await upsertRow(configId, data);
  if (!ok) return NextResponse.json({ error: 'Failed to write' }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { file, filename } = await request.json();

  if (file === 'redes' && filename) {
    const configId = 'redes_' + filename.replace('.json', '');
    const ok = await deleteRow(configId);
    if (!ok) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Not allowed' }, { status: 400 });
}
