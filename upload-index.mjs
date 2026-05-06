#!/usr/bin/env node
/**
 * upload-index.mjs — Carga search_index.json al KV namespace SINPRE_INDEX
 *
 * Uso:
 *   node upload-index.mjs                  # usa wrangler.jsonc para el account/namespace
 *   node upload-index.mjs --preview        # carga al namespace de preview
 *
 * Requiere:
 *   npx wrangler kv namespace create SINPRE_INDEX   (una sola vez)
 *   # Copiar el namespace_id al wrangler.jsonc antes de correr este script
 *
 * También puede usarse desde npm:
 *   npm run upload-index
 */

import { execSync }  from 'child_process';
import { readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = path.join(__dirname, 'search_index.json');
const KV_KEY     = 'search_index';
const BINDING    = 'SINPRE_INDEX';

// ── Validate the file exists and is valid JSON ───────────────────────────────
let raw;
try {
  raw = readFileSync(INDEX_FILE, 'utf8');
} catch {
  console.error(`❌  No se encontró ${INDEX_FILE}`);
  console.error('   Genera el archivo con:  node extract-index.mjs');
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  console.error('❌  search_index.json no es JSON válido:', e.message);
  process.exit(1);
}

const sizeKB   = (statSync(INDEX_FILE).size / 1024).toFixed(1);
const isPreview = process.argv.includes('--preview');
const envFlag   = isPreview ? '--preview' : '';

console.log(`📦  search_index.json — ${parsed.length} entradas, ${sizeKB} KB`);
console.log(`🗂️   Namespace binding : ${BINDING}`);
console.log(`🔑  KV key            : ${KV_KEY}`);
console.log(`🌐  Entorno           : ${isPreview ? 'preview' : 'production'}`);
console.log('');

// KV values > 25 MB are rejected; warn early
if (statSync(INDEX_FILE).size > 25 * 1024 * 1024) {
  console.error('❌  El archivo supera el límite de 25 MB de Cloudflare KV.');
  process.exit(1);
}

// ── Upload via wrangler CLI ──────────────────────────────────────────────────
// wrangler kv key put --binding=<BINDING> <KEY> --path=<FILE>  [--preview]
const cmd = [
  'npx wrangler kv key put',
  `--binding=${BINDING}`,
  `"${KV_KEY}"`,
  `--path="${INDEX_FILE}"`,
  envFlag,
].filter(Boolean).join(' ');

console.log(`▶  ${cmd}\n`);

try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('\n✅  Índice cargado en KV correctamente.');
  console.log('   El worker leerá la versión nueva en el próximo cold start (< 60 s).');
} catch {
  console.error('\n❌  Error al subir a KV. Revisa que:');
  console.error('   1. wrangler esté autenticado  (npx wrangler login)');
  console.error('   2. El namespace_id esté en wrangler.jsonc bajo kv_namespaces');
  console.error(`   3. El binding se llame exactamente "${BINDING}"`);
  process.exit(1);
}
