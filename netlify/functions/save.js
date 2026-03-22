const GITHUB_OWNER = 'Joaquin-L-Cortes';
const GITHUB_REPO  = 'SinPresupuesto';
const GITHUB_API   = 'https://api.github.com';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

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

  let { filename, content } = body;

  // Netlify sirve URLs sin .html — agregarlo si falta
  if (!filename) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el nombre del archivo' }) };
  }
  if (!filename.endsWith('.html')) {
    filename = filename + '.html';
  }
  // Si es raíz o vacío, asumir index
  if (filename === '.html' || filename === '') {
    filename = 'index.html';
  }

  // Validar que sea un archivo html válido del sitio
  if (!filename.match(/^[\w\-\.]+\.html$/)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Archivo no válido: ' + filename }) };
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
      return { statusCode: 404, body: JSON.stringify({ error: 'Archivo no encontrado en GitHub: ' + filename }) };
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
