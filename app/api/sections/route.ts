export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

async function readSections() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('site_config')
    .select('data')
    .eq('id', 'classroom_sections')
    .single();
  if (error || !data) return [];
  return data.data;
}

async function writeSections(sections: any[]) {
  const supabase = getSupabase();
  await supabase.from('site_config').upsert({
    id: 'classroom_sections',
    data: sections,
    updated_at: new Date().toISOString(),
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
