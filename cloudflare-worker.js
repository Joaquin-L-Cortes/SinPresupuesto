// Cloudflare Worker — SinPresupuesto
// Maneja dos rutas:
//   POST /        → guarda archivos en GitHub (funcionalidad original)
//   POST /ai      → proxy hacia Cloudflare Workers AI (llama.3 o llama.4) sin exponer keys
//
// Variables de entorno necesarias (Settings → Variables en el dashboard):
//   GITHUB_TOKEN  — Personal Access Token de GitHub
//   AI_API_TOKEN  — Cloudflare AI API Token (Settings → API Tokens en dash.cloudflare.com)
//   CF_ACCOUNT_ID — Tu Account ID de Cloudflare (dash.cloudflare.com, esquina inferior izquierda)

const GITHUB_OWNER = 'Joaquin-L-Cortes';
const GITHUB_REPO  = 'SinPresupuesto';
const GITHUB_API   = 'https://api.github.com';

// Modelo a usar — puedes cambiar por cualquiera de:
//   @cf/meta/llama-3.1-8b-instruct        (rápido, gratis en plan Free)
//   @cf/meta/llama-3.3-70b-instruct-fp8   (más capaz, también Free)
//   @cf/meta/llama-4-scout-17b-16e-instruct (el más nuevo, muy capaz)
const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': request.headers.get('Origin') || 'https://sinpresupuesto.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);

    // ─── RUTA /ai — Proxy hacia Cloudflare Workers AI ─────────────────────
    if (url.pathname === '/ai' || url.pathname === '/ai/') {
      const aiToken   = env.AI_API_TOKEN;
      const accountId = env.CF_ACCOUNT_ID;

      if (!aiToken || !accountId) {
        return new Response(JSON.stringify({ error: 'AI no configurada en el Worker' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let body;
      try { body = await request.json(); }
      catch(e) {
        return new Response(JSON.stringify({ error: 'JSON inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { messages, max_tokens, temperature } = body;
      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Falta campo messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const aiRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${AI_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages,
            max_tokens: max_tokens || 1200,
            temperature: temperature || 0.5
          })
        }
      );

      if (!aiRes.ok) {
        const errBody = await aiRes.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: 'Error de AI: ' + (errBody?.errors?.[0]?.message || aiRes.status) }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const aiData = await aiRes.json();
      // Normalizar respuesta al formato que espera sinpresito.js
      const responseText = aiData.result?.response || aiData.choices?.[0]?.message?.content || '';
      return new Response(JSON.stringify({ result: { response: responseText } }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ─── RUTA / — Guardar en GitHub (funcionalidad original) ──────────────
    const token = env.GITHUB_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token no configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let body;
    try { body = await request.json(); }
    catch(e) {
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

      const encoded = btoa(unescape(encodeURIComponent(content)));

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
