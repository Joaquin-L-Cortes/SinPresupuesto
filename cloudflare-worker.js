// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH_INDEX — cargado desde Cloudflare KV en el primer request del isolate
// KV namespace binding: SINPRE_INDEX  key: "search_index"
// ═══════════════════════════════════════════════════════════════════════════════
let SEARCH_INDEX = null;  // populated lazily from KV; survives isolate warm-up

/**
 * sinpresito-ai Worker v3 — Índice en Cloudflare KV
 * Deploy: wrangler deploy cloudflare-worker.js --name sinpresito-ai
 * Requiere: wrangler kv namespace create SINPRE_INDEX
 *           npm run upload-index   (carga search_index.json a KV)
 *
 * Secretos requeridos:
 *   AI_API_TOKEN  — Cloudflare AI token
 *   CF_ACCOUNT_ID — tu account ID
 *
 * Endpoint: POST /ai
 *   body: { message: string, history?: [{role, content}] }
 */


// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE BÚSQUEDA POR PONDERACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE BÚSQUEDA MEJORADO — con corrección de tipografía y mejor ponderación
// ═══════════════════════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  'esta','seccion','encontrara','examen','admision','nacional','para','universidad',
  'colombia','material','sin','pre','esperando','que','sea','ayuda','del','los','las',
  'una','con','por','sus','son','mas','pero','como','este','pdf','por','ser','han',
  'fue','uno','dos','tres','puede','hay','tiene','todo','cada','muy','bien','cuando',
  'donde','entre','desde','hacia','sobre','bajo','ante','tras','asi','eso','ese','esa',
  'algo','mismo','otro','otra','todos','todas','quiero','necesito','busco','dame',
  'cual','ver','saber','informacion','dar','dime','muestrame','tienes','algo','cual',
  'tengo','puedo','podria','podrias','me','mi','mis','tu','tus','nos','nuestro'
]);

// IDs de recursos con páginas rotas (404 en RTVCPlay) — excluidos del buscador
const BROKEN_IDS = new Set([27, 33, 35, 36, 37]);

// Palabras clave de materias — para no confundir "aprender X" con intent=teoria
const SUBJECT_TOKENS = new Set([
  'matematicas','fisica','quimica','biologia','sociales','textual','imagen',
  'calculo','algebra','geometria','trigonometria','celulas','celula','derivada',
  'derivadas','integral','integrales','funcion','funciones','ecuacion','ecuaciones',
  'atomo','atomos','enlace','reaccion','reacciones','mol','moles','ley','leyes',
  'fuerza','fuerzas','energia','trabajo','momentum','campo','gen','genes','adn','arn',
  'evolucion','ecosistema','ecosistemas','historia','logica','silogismo',
  'filosofia','geografia','membrana','transporte','metabolismo','fotosintesis',
  'respiracion','celular','termodinamica','cinematica','estatica','gravitacion',
  'vectores','matrices','probabilidad','estadistica','conjuntos','progresiones',
  'macroestructura','superestructura','narrativo','argumentativo','silogismos',
  'kepler','newton','mendel','darwin','faraday','gauss','pitagoras','euler',
  'limite','limites','serie','series','diferencial','diferencial','polinomio',
  'logaritmo','logaritmos','raiz','raices','potencia','potencias','fraccion',
  'fracciones','porcentaje','porcentajes','proporcion','proporciones',
  'enlace','enlaces','orbital','orbitales','isotopo','isotopos','mol','moles',
  'presion','volumen','temperatura','calor','entropia','entalpia',
  'cromosoma','cromosomas','dna','rna','proteina','proteinas','enzima','enzimas',
  'ecosistema','biosfera','cadena','trofica','fotosintesis','cloroplasto',
  'constitucion','derecho','derechos','ciudadano','ciudadanos','mapa','mapas',
  'silogismo','falacia','falacias','premisa','conclusion','argumento'
]);

// ─── Corrección de tipografía (distancia de edición ≤ 2) ─────────────────────
// Tabla de correcciones comunes para el dominio educativo colombiano
const TYPO_CORRECTIONS = {
  'derevidas': 'derivadas',
  'derivda': 'derivadas',
  'derivdas': 'derivadas',
  'matamaticas': 'matematicas',
  'matematicas': 'matematicas',
  'fisca': 'fisica',
  'fisika': 'fisica',
  'quimca': 'quimica',
  'quimika': 'quimica',
  'biologa': 'biologia',
  'biologias': 'biologia',
  'sociales': 'sociales',
  'celula': 'celula',
  'celulas': 'celulas',
  'calculo': 'calculo',
  'ecuciones': 'ecuaciones',
  'ecuasiones': 'ecuaciones',
  'vectores': 'vectores',
  'vecotr': 'vector',
  'trigonometria': 'trigonometria',
  'trignometria': 'trigonometria',
  'estequimetria': 'estequiometria',
  'estequiomtria': 'estequiometria',
  'cinematica': 'cinematica',
  'cinematika': 'cinematica',
  'evolucion': 'evolucion',
  'evolucion': 'evolucion',
  'fotosintesis': 'fotosintesis',
  'fotosintecis': 'fotosintesis',
  'metabolismos': 'metabolismo',
  'metabolsimo': 'metabolismo',
  'silogimos': 'silogismos',
  'silogismos': 'silogismos',
  'probabildad': 'probabilidad',
  'estadisitica': 'estadistica',
  'geometira': 'geometria',
  'geometira': 'geometria',
  'logaritmos': 'logaritmos',
  'logaritmo': 'logaritmo',
  'logarimos': 'logaritmos',
  'integrales': 'integrales',
  'intagrales': 'integrales',
  'analis': 'analisis',
  'analize': 'analisis',
  'sociales': 'sociales',
  'sosciales': 'sociales',
  'biologico': 'biologico',
  'quimico': 'quimico',
};

/** Distancia de Levenshtein entre dos strings cortos */
function levenshtein(a, b) {
  if (a.length > 20 || b.length > 20) return 99; // evitar costo O(n²) en strings largos
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => j === 0 ? i : 0));
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] :
        1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

/** Intenta corregir un token con errores de tipografía */
function correctToken(tok) {
  // 1. Corrección directa por tabla
  if (TYPO_CORRECTIONS[tok]) return TYPO_CORRECTIONS[tok];
  // 2. Buscar en los tokens del índice con Levenshtein ≤ 2 (solo para tokens ≥ 5 chars)
  if (tok.length < 5) return tok;
  // Recolectar tokens únicos del índice (lazy, primera vez)
  if (!correctToken._allToks) {
    const s = new Set();
    for (const e of SEARCH_INDEX) for (const k of Object.keys(e[7])) if (k.length >= 4) s.add(k);
    correctToken._allToks = [...s];
  }
  let bestTok = tok, bestDist = 99;
  for (const candidate of correctToken._allToks) {
    if (Math.abs(candidate.length - tok.length) > 2) continue;
    const d = levenshtein(tok, candidate);
    if (d < bestDist && d <= 2) { bestDist = d; bestTok = candidate; }
  }
  return bestTok;
}

// Intenciones y sus boosts por categoría de material
const INTENT_CONFIG = {
  ejercicios: {
    keywords: ['ejercicio','ejercicios','practicar','practica','practico','problemas','taller','resolver','talleres'],
    boosts: { 'Ejercicios prácticos': 2.5, 'Evaluación y simulacros': 1.3 }
  },
  diapositivas: {
    keywords: ['diapositiva','diapositivas','ppt','presentacion','visual','diapo','slides','presentaciones','apuntes'],
    boosts: { 'Material visual/diapositivas': 3.0 }
  },
  simulacro: {
    keywords: ['simulacro','simulacros','simular'],
    boosts: { 'Evaluación y simulacros': 3.0, 'Exámenes reales UN': 1.5 }
  },
  examen: {
    keywords: ['examenes','exam','historico','historicos','pasado','anterior','real','reales'],
    boosts: { 'Exámenes reales UN': 3.0, 'Evaluación y simulacros': 1.5 }
  },
  resumen: {
    keywords: ['resumen','resumenes','tomo','tomos','repaso','repasar','sinopsis','resumir','compendio'],
    boosts: { 'Recurso complementario': 2.5, 'Material teórico': 1.5 }
  },
  teoria: {
    keywords: ['teoria','teorico','modulo','apunte','apuntes','concepto','conceptos','explicacion','entender','aprender','comprender','explicar'],
    boosts: { 'Material teórico': 2.5, 'Material visual/diapositivas': 0.9 }
  }
};

function normalize(text) {
  return text.toLowerCase()
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
    .replace(/[úùü]/g,'u').replace(/[ñ]/g,'n')
    .replace(/[^a-z0-9\s]/g,' ');
}

function tokenize(text) {
  return normalize(text).split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

function detectIntent(tokens) {
  const hasSubject = tokens.some(t => SUBJECT_TOKENS.has(t));
  for (const [intent, cfg] of Object.entries(INTENT_CONFIG)) {
    for (const kw of cfg.keywords) {
      for (const tok of tokens) {
        const match = tok === kw || (tok.length >= 5 && kw.startsWith(tok.slice(0,5)));
        if (match) {
          // 'aprender/comprender/entender' + subject token = NOT teoria intent
          if (intent === 'teoria' && hasSubject &&
              ['aprender','comprender','entender','explicar'].includes(kw)) continue;
          return intent;
        }
      }
    }
  }
  return null;
}

/** 
 * Busca en el índice y retorna los top-N materiales más relevantes.
 * Incluye corrección de tipografía y boost de especificidad.
 * @param {string} query
 * @param {number} topN
 * @returns {{ intent: string|null, results: Array }}
 */
function searchMaterials(query, topN = 5) {
  const rawTokens = tokenize(query);
  // Aplicar corrección de tipografía
  const tokens = rawTokens.map(t => correctToken(t));
  const intent = detectIntent(tokens);
  const scores = new Map(); // id → score

  for (const tok of tokens) {
    for (const entry of SEARCH_INDEX) {
      const tw = entry[7]; // {token: weight}
      // Exact match — peso completo
      if (tw[tok] !== undefined) {
        // Boost adicional para tokens de alta especificidad (peso >= 3.5 en el índice)
        const specificityBoost = tw[tok] >= 3.5 ? 1.5 : 1.0;
        scores.set(entry[0], (scores.get(entry[0]) || 0) + tw[tok] * specificityBoost);
      }
      // Prefix match (solo para tokens ≥ 4 chars) — 50% weight
      if (tok.length >= 4) {
        for (const [key, w] of Object.entries(tw)) {
          if (key !== tok && key.startsWith(tok)) {
            scores.set(entry[0], (scores.get(entry[0]) || 0) + w * 0.5);
          }
        }
      }
    }
  }

  // Apply intent boosts
  if (intent && INTENT_CONFIG[intent]) {
    const boosts = INTENT_CONFIG[intent].boosts;
    for (const entry of SEARCH_INDEX) {
      const id = entry[0];
      if (!scores.has(id)) continue;
      const cat = entry[3];
      const factor = boosts[cat] || 1.0;
      scores.set(id, scores.get(id) * factor);
    }
  }



  // ── Boost condicional por tipo según intención detectada ─────────────────────
  if (intent === 'ejercicios') {
    for (const entry of SEARCH_INDEX) {
      const id = entry[0];
      if (!scores.has(id)) continue;
      const cat = entry[3];
      if (cat === 'Ejercicios prácticos') scores.set(id, scores.get(id) * 1.4);
      if (cat === 'Material teórico') scores.set(id, scores.get(id) * 0.7);
    }
  } else if (intent === 'teoria') {
    for (const entry of SEARCH_INDEX) {
      const id = entry[0];
      if (!scores.has(id)) continue;
      const cat = entry[3];
      if (cat === 'Material teórico') scores.set(id, scores.get(id) * 1.4);
      if (cat === 'Ejercicios prácticos') scores.set(id, scores.get(id) * 0.7);
    }
  }

  // ── Inyectar token ordinal para ejercicios seriados (desempate determinista) ─
  for (const entry of SEARCH_INDEX) {
    const id = entry[0];
    if (!scores.has(id)) continue;
    const nombre = entry[1];
    const match = nombre.match(/^(\d+)[\.\s]/);
    if (match) {
      const ordinal = parseInt(match[1], 10);
      // Micro-boost inversely proportional to ordinal so #1 beats #2, etc.
      scores.set(id, scores.get(id) + (0.01 / ordinal));
    }
  }

  // Sort and pick top N
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([id]) => !BROKEN_IDS.has(id))
    .slice(0, topN);

  const idToEntry = new Map(SEARCH_INDEX.map(e => [e[0], e]));
  const results = sorted.map(([id, score]) => {
    const e = idToEntry.get(id);
    return {
      score: Math.round(score * 10) / 10,
      nombre: e[1],
      asignatura: e[2],
      categoria: e[3],
      tipo: e[4],
      url: e[5],
      seccion: e[6],
    };
  });

  return { intent, tokens, results };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — compacto, con instrucciones de uso del buscador
// ═══════════════════════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Eres SinPesito, asistente del preuniversitario gratuito SinPresupuesto (Colombia), para el examen de admisión a la Universidad Nacional (UN).

REGLAS ABSOLUTAS:
1. NUNCA escribas URLs en tu respuesta. Los materiales aparecen como tarjetas automáticas debajo de tu texto.
2. NUNCA hagas listas numeradas ni con viñetas de materiales.
3. NUNCA inventes materiales que no estén en [MATERIALES ENCONTRADOS].
4. Máximo 2 oraciones. Directo y útil. Solo en español.

CÓMO RESPONDER:
- Si hay [MATERIALES ENCONTRADOS] y el usuario pidió algo específico (ej: "el de diapositivas", "el módulo"): di SOLO "Aquí tienes [nombre exacto del material]." — una oración.
- Si hay varios materiales: "Encontré [nombre1] y [nombre2], haz clic para abrirlos."
- Si NO hay materiales: "No encontré material específico, revisa la sección de [materia] en la plataforma."
- Saludo sin búsqueda: responde brevemente.

El curso cubre: Análisis Textual, Matemáticas, Física, Química, Biología, Sociales, Análisis de Imagen, Simulacros UN, Exámenes UN 2004-2024, extras ICFES y UdeA.`;

// ═══════════════════════════════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════════════════════════════
const CORS = {
  "Access-Control-Allow-Origin": "https://sinpresupuesto.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    // ── BOOTSTRAP: cargar índice desde KV si el isolate arrancó frío ───────
    if (!SEARCH_INDEX) {
      const raw = await env.SINPRE_INDEX.get("search_index");
      if (!raw) {
        return new Response(
          JSON.stringify({ reply: "⚠️ Índice de materiales no disponible. Recarga en unos segundos." }),
          { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      SEARCH_INDEX = JSON.parse(raw);
    }

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

    const url = new URL(request.url);
    if (url.pathname !== "/ai") return new Response("Not found", { status: 404, headers: CORS });

    let body;
    try { body = await request.json(); }
    catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }); }

    const userMsg = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const accountId = env.CF_ACCOUNT_ID;

    // ── BÚSQUEDA SEMÁNTICA POR PONDERACIÓN ──────────────────────────────────
    // Detectar si el mensaje necesita búsqueda. También captura seguimientos como "sí", "el de diapositivas"
    const isFollowUp = /^(s[ií]|claro|ese|esa|el de|la de|los de|abre|abrir|ver|verlo|verla|muestrame|ese material|okay|ok|si por favor)/i.test(userMsg.trim()) || (userMsg.trim().length < 30 && history.length > 0);
    const directSearch = /material|recurso|libro|pdf|diapositiva|ppt|ejercicio|práctica|apuntes|tomo|simulacro|examen|video|módulo|tema|estudiar|aprender|practicar|busco|tienes|hay|dónde|donde|sobre|celula|biologia|física|física|química|matematicas|sociales|textual|imagen/i.test(userMsg);
    const needsSearch = directSearch || isFollowUp;

    // Para seguimientos, enriquecer con historial reciente para mantener contexto del tema
    let searchQuery = userMsg;
    if (isFollowUp && !directSearch && history.length > 0) {
      const recentCtx = history.slice(-4).map(h => h.content).join(" ");
      searchQuery = recentCtx + " " + userMsg;
    }

    let searchBlock = "";
    let searchMeta = null;
    
    if (needsSearch) {
      searchMeta = searchMaterials(searchQuery, 10);
      if (searchMeta.results.length > 0) {
        // Diversity filter: max 2 results per asignatura+categoria combo
        const seen = new Map();
        searchMeta.results = searchMeta.results.filter(r => {
          const key = `${r.asignatura}|${r.categoria}`;
          const count = seen.get(key) || 0;
          if (count >= 2) return false;
          seen.set(key, count + 1);
          return true;
        }).slice(0, 6);

        const lines = searchMeta.results.map((r, i) =>
          `${i+1}. [score:${r.score}] "${r.nombre}" | ${r.asignatura} | ${r.categoria} | ${r.tipo}
   URL: ${r.url}
   Sección: ${r.seccion}`
        ).join("
");
        searchBlock = `

[MATERIALES ENCONTRADOS - intent:${searchMeta.intent || 'general'}, tokens:${searchMeta.tokens.join(',')}]
${lines}
[FIN MATERIALES]`;
      }
    }

    // ── LLAMADA AL MODELO ───────────────────────────────────────────────────
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: userMsg + searchBlock },
    ];

    try {
      const aiRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.AI_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages, max_tokens: 800 }),
        }
      );

      const data = await aiRes.json();
      const rawReply = data?.result?.response || data?.response || "Sin respuesta del modelo.";

      // ── Limpiar URLs que el modelo haya podido inventar ──────────────────
      const reply = rawReply
        // Eliminar cualquier URL (http/https/drive/youtube)
        .replace(/https?:\/\/[^\s)>\]"]+/g, "")
        // Eliminar líneas que sean solo una URL o casi solo una URL
        .replace(/^\s*https?:\/\/.*$/gm, "")
        // Limpiar espacios dobles resultantes
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Pass the search results directly to the frontend as structured data
      const materials = searchMeta ? searchMeta.results.slice(0, 5) : [];

      return new Response(JSON.stringify({
        reply,
        materials,
        _debug: searchMeta ? { intent: searchMeta.intent, tokens: searchMeta.tokens, hits: searchMeta.results.length } : null
      }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ reply: "❌ Error al conectar con el modelo de IA." }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  },
};
