const GITHUB_OWNER = 'Joaquin-L-Cortes';
const GITHUB_REPO  = 'SinPresupuesto';
const GITHUB_API   = 'https://api.github.com';

exports.handler = async function(event) {
  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  // Leer token desde variable de entorno (nunca llega al navegador)
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Token no configurado' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { filename, content } = body;

  // Validar que el filename sea un .html del sitio (seguridad básica)
  if (!filename || !filename.match(/^[\w\-]+\.html$/) ) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Archivo no válido' }) };
  }

  try {
    // 1. Obtener SHA actual del archivo
    const getRes = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!getRes.ok) {
      const err = await getRes.json();
      return { statusCode: 404, body: JSON.stringify({ error: 'Archivo no encontrado: ' + err.message }) };
    }

    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. Codificar contenido en base64
    const encoded = Buffer.from(content, 'utf8').toString('base64');

    // 3. Subir a GitHub
    const putRes = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`, {
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
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return { statusCode: 500, body: JSON.stringify({ error: 'Error al guardar: ' + err.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: 'Guardado correctamente' })
    };

  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
