import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const supabase = getSupabase();
    const configId = file.replace('.json', '');

    if (configId === 'redes') {
      const { data, error } = await supabase
        .from('site_config')
        .select('id, data')
        .like('id', 'redes_%');

      if (error) throw error;
      const result = (data || []).map(row => ({
        filename: row.id.replace('redes_', '') + '.json',
        ...row.data,
      }));
      return NextResponse.json(result);
    }

    const { data, error } = await supabase
      .from('site_config')
      .select('data')
      .eq('id', configId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(data.data);
  } catch (e) {
    console.error('Config GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { file, data, filename } = await request.json();

  if (!file || !data) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  try {
    const supabase = getSupabase();
    let configId = file.replace('.json', '');

    if (file === 'redes' && filename) {
      configId = 'redes_' + filename.replace('.json', '');
    }

    await supabase.from('site_config').upsert({
      id: configId,
      data: data,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Config PUT error:', e);
    return NextResponse.json({ error: 'Failed to write' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { file, filename } = await request.json();

  if (file === 'redes' && filename) {
    try {
      const supabase = getSupabase();
      const configId = 'redes_' + filename.replace('.json', '');
      await supabase.from('site_config').delete().eq('id', configId);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Not allowed' }, { status: 400 });
}
