import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const contentDir = path.join(process.cwd(), 'content');

// Inicializar el cliente dentro de las funciones para evitar errores en build time
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (!file) return NextResponse.json({ error: 'File param missing' }, { status: 400 });

  try {
    const filePath = path.join(contentDir, file);

    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const files = await fs.readdir(filePath);
      const data = await Promise.all(
        files.map(async (f) => {
          const content = await fs.readFile(path.join(filePath, f), 'utf-8');
          return { filename: f, ...JSON.parse(content) };
        })
      );
      return NextResponse.json(data);
    }

    const data = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (e) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

export async function PUT(request: Request) {
  const { file, data, filename } = await request.json();

  if (!file || !data) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  try {
    let filePath = path.join(contentDir, file);

    if (file === 'redes' && filename) {
      filePath = path.join(contentDir, 'redes', filename);
    }

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    // Sincronizar con Supabase solo para archivos de config principal
    const syncFiles = ['nav.json', 'footer.json', 'seo.json', 'donaciones.json', 'cronograma.json'];
    if (syncFiles.includes(file)) {
      const supabase = getSupabase();
      const configId = file.replace('.json', '');
      await supabase.from('site_config').upsert({
        id: configId,
        data: data,
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error in config API:", e);
    return NextResponse.json({ error: 'Failed to write' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { file, filename } = await request.json();
  if (file === 'redes' && filename) {
    try {
      const filePath = path.join(contentDir, 'redes', filename);
      await fs.unlink(filePath);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Not allowed' }, { status: 400 });
}
