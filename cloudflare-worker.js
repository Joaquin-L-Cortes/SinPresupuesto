// Cloudflare Worker — reemplaza la función de Netlify
// Pega este código en el editor de tu Worker en workers.cloudflare.com

const GITHUB_OWNER = 'Joaquin-L-Cortes';
const GITHUB_REPO  = 'SinPresupuesto';
const GITHUB_API   = 'https://api.github.com';

// El token lo guardas en Variables de entorno del Worker (nunca en el código)
// En Cloudflare: Settings → Variables → Add variable → GITHUB_TOKEN

export default {
  async fetch(request, env) {
    // CORS — permitir peticiones desde tu dominio
    const corsHeaders = {
      // Acepta peticiones desde tu dominio propio y desde GitHub Pages
      'Access-Control-Allow-Origin': request.headers.get('Origin') || 'https://sinpresupuesto.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = env.GITHUB_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token no configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch(e) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let { filename, content } = body;

    if (!filename) {
      return new Response(JSON.stringify({ error: 'Falta nombre de archivo' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!filename.endsWith('.html')) filename = filename + '.html';
    if (filename === '.html') filename = 'index.html';
    if (!filename.match(/^[\w\-\.]+\.html$/)) {
      return new Response(JSON.stringify({ error: 'Archivo no válido: ' + filename }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // Obtener SHA del archivo actual
      const getRes = await fetch(
        `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' } }
      );
      if (!getRes.ok) {
        return new Response(JSON.stringify({ error: 'Archivo no encontrado: ' + filename }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const fileData = await getRes.json();
      const sha = fileData.sha;

      // Codificar en base64
      const encoded = btoa(unescape(encodeURIComponent(content)));

      // Subir a GitHub
      const putRes = await fetch(
        `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Actualizar ${filename} desde editor web`,
            content: encoded,
            sha: sha
          })
        }
      );

      if (!putRes.ok) {
        const err = await putRes.json();
        return new Response(JSON.stringify({ error: 'Error al guardar: ' + (err.message || '') }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch(err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
