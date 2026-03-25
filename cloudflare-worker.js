// Cloudflare Worker — SinPresupuesto
// Maneja cuatro rutas:
//   GET  /auth      → inicia OAuth con GitHub (para Decap CMS)
//   GET  /callback  → intercambia el code por access_token (para Decap CMS)
//   POST /          → guarda archivos HTML en GitHub (editor web propio)
//   POST /ai        → proxy hacia Cloudflare Workers AI
//
// Variables de entorno necesarias (Settings → Variables en el dashboard):
//   GITHUB_TOKEN        — Personal Access Token (para el editor web, ruta POST /)
//   GITHUB_CLIENT_ID    — OAuth App Client ID    (para Decap CMS, rutas /auth y /callback)
//   GITHUB_CLIENT_SECRET— OAuth App Client Secret (¡guardar como Secret encriptado!)
//   AI_API_TOKEN        — Cloudflare AI API Token
//   CF_ACCOUNT_ID       — Tu Account ID de Cloudflare

const GITHUB_OWNER = 'Joaquin-L-Cortes';
const GITHUB_REPO  = 'SinPresupuesto';
const GITHUB_API   = 'https://api.github.com';
const SITE_ORIGIN  = 'https://sinpresupuesto.com';

const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': request.headers.get('Origin') || SITE_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ─── RUTA GET /auth — Inicia el flujo OAuth con GitHub ────────────────
    // Decap CMS abre esta URL en un popup para pedir autorización
    if (request.method === 'GET' && url.pathname === '/auth') {
      const clientId = env.GITHUB_CLIENT_ID;
      if (!clientId) {
        return new Response('GITHUB_CLIENT_ID no configurado', { status: 500 });
      }
      const githubOAuthUrl =
        `https://github.com/login/oauth/authorize` +
        `?client_id=${clientId}` +
        `&scope=repo` +
        `&state=${crypto.randomUUID()}`;

      return Response.redirect(githubOAuthUrl, 302);
    }

    // ─── RUTA GET /callback — GitHub redirige aquí con el ?code ───────────
    // Intercambia el code por un access_token y se lo pasa a Decap via postMessage
    if (request.method === 'GET' && url.pathname === '/callback') {
      const code  = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        return new Response('Código OAuth ausente', { status: 400 });
      }

      const clientId     = env.GITHUB_CLIENT_ID;
      const clientSecret = env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return new Response('Credenciales OAuth no configuradas', { status: 500 });
      }

      // Intercambiar code → access_token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id:     clientId,
          client_secret: clientSecret,
          code,
          state,
        }),
      });

      if (!tokenRes.ok) {
        return new Response('Error al obtener token de GitHub', { status: 502 });
      }

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(`GitHub OAuth error: ${tokenData.error_description}`, { status: 400 });
      }

      const token    = tokenData.access_token;
      const provider = 'github';

      // Devolver HTML con postMessage — así Decap CMS recibe el token en el popup
      const html = `<!DOCTYPE html>
<html>
<head><title>Autenticando...</title></head>
<body>
<p>Autenticando, por favor espera...</p>
<script>
  (function() {
    function receiveMessage(e) {
      console.log('[Decap OAuth] receiveMessage:', e.origin, e.data);
    }
    window.addEventListener('message', receiveMessage, false);

    const msg = 'authorization:${provider}:success:${JSON.stringify({ token, provider })}';

    // Intentar enviar al opener (popup flow)
    if (window.opener) {
      window.opener.postMessage(msg, '${SITE_ORIGIN}');
      window.close();
    } else {
      // Fallback: mostrar mensaje de éxito
      document.body.innerHTML = '<h2>✓ Autenticado con GitHub</h2><p>Puedes cerrar esta ventana.</p>';
    }
  })();
</script>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── A partir de aquí solo se aceptan POST ──────────────────────────────
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── RUTA POST /ai — Proxy hacia Cloudflare Workers AI ───────────────
    if (url.pathname === '/ai' || url.pathname === '/ai/') {
      const aiToken   = env.AI_API_TOKEN;
      const accountId = env.CF_ACCOUNT_ID;

      if (!aiToken || !accountId) {
        return new Response(JSON.stringify({ error: 'AI no configurada en el Worker' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let body;
      try { body = await request.json(); }
      catch (e) {
        return new Response(JSON.stringify({ error: 'JSON inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { messages, max_tokens, temperature } = body;
      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Falta campo messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${AI_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            max_tokens:  max_tokens  || 1200,
            temperature: temperature || 0.5,
          }),
        }
      );

      if (!aiRes.ok) {
        const errBody = await aiRes.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: 'Error de AI: ' + (errBody?.errors?.[0]?.message || aiRes.status) }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiRes.json();
      const responseText = aiData.result?.response || aiData.choices?.[0]?.message?.content || '';
      return new Response(JSON.stringify({ result: { response: responseText } }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── RUTA POST / — Guardar archivos HTML en GitHub ───────────────────
    const token = env.GITHUB_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'GITHUB_TOKEN no configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try { body = await request.json(); }
    catch (e) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let { filename, content } = body;

    if (!filename) {
      return new Response(JSON.stringify({ error: 'Falta nombre de archivo' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!filename.endsWith('.html')) filename = filename + '.html';
    if (filename === '.html') filename = 'index.html';
    if (!filename.match(/^[\w\-\.]+\.html$/)) {
      return new Response(JSON.stringify({ error: 'Archivo no válido: ' + filename }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const getRes = await fetch(
        `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' } }
      );
      if (!getRes.ok) {
        return new Response(JSON.stringify({ error: 'Archivo no encontrado: ' + filename }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Actualizar ${filename} desde editor web`,
            content: encoded,
            sha,
          }),
        }
      );

      if (!putRes.ok) {
        const err = await putRes.json();
        return new Response(JSON.stringify({ error: 'Error al guardar: ' + (err.message || '') }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
