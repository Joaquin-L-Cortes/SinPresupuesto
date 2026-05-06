import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

const sectionsFile = path.join(process.cwd(), 'content', 'classroom_sections.json');

// Helper para leer JSON
async function readSections() {
  try {
    const data = await fs.readFile(sectionsFile, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read sections file', e);
    return [];
  }
}

// Helper para escribir JSON
async function writeSections(sections: any[]) {
  await fs.writeFile(sectionsFile, JSON.stringify(sections, null, 2), 'utf-8');
}

export async function GET() {
  const sections = await readSections();
  return NextResponse.json(sections);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });

  const sections = await readSections();
  const newSection = {
    id: String(Date.now()),
    name,
    materials: [], // Categorías
  };
  sections.push(newSection);
  await writeSections(sections);
  revalidatePath('/materiales');
  return NextResponse.json(newSection, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  
  // Opción 1: Guardar todos los datos (útil para CRUD profundo)
  if (body.fullData) {
    await writeSections(body.fullData);
    revalidatePath('/materiales');
    return NextResponse.json(body.fullData);
  }

  // Opción 2: Actualizar una sola sección
  const { id, name } = body;
  if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
  
  const sections = await readSections();
  const idx = sections.findIndex((s: any) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });

  if (name !== undefined) sections[idx].name = name;
  
  await writeSections(sections);
  revalidatePath('/materiales');
  return NextResponse.json(sections[idx]);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
  
  let sections = await readSections();
  sections = sections.filter((s: any) => s.id !== id);
  
  await writeSections(sections);
  revalidatePath('/materiales');
  return NextResponse.json({ success: true });
}
