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

async function readSections(): Promise<any[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_config?id=eq.classroom_sections&select=data&limit=1`,
    { headers: headers() }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return rows?.[0]?.data ?? [];
}

async function writeSections(sections: any[]) {
  await fetch(`${SUPABASE_URL}/rest/v1/site_config`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: 'classroom_sections', data: sections, updated_at: new Date().toISOString() }),
  });
}

export async function GET() {
  const sections = await readSections();
  return NextResponse.json(sections);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });

  const sections = await readSections();
  const newSection = { id: String(Date.now()), name, materials: [] };
  sections.push(newSection);
  await writeSections(sections);
  return NextResponse.json(newSection, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();

  if (body.fullData) {
    await writeSections(body.fullData);
    return NextResponse.json(body.fullData);
  }

  const { id, name } = body;
  if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

  const sections = await readSections();
  const idx = sections.findIndex((s: any) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });

  if (name !== undefined) sections[idx].name = name;
  await writeSections(sections);
  return NextResponse.json(sections[idx]);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

  let sections = await readSections();
  sections = sections.filter((s: any) => s.id !== id);
  await writeSections(sections);
  return NextResponse.json({ success: true });
}
