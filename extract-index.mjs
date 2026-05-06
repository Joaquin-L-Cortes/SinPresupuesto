#!/usr/bin/env node
/**
 * extract-index.mjs — Extrae SEARCH_INDEX del worker embebido y lo guarda
 *                      como search_index.json listo para subir a KV.
 *
 * Útil si alguien modifica el índice directamente en el worker antiguo
 * y necesita sincronizar el archivo standalone.
 *
 * Uso:
 *   node extract-index.mjs [--input cloudflare-worker.js]
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputFlag = process.argv.indexOf('--input');
const inputFile = inputFlag !== -1
  ? process.argv[inputFlag + 1]
  : path.join(__dirname, 'cloudflare-worker.js');

const outputFile = path.join(__dirname, 'search_index.json');

// ── Read source ──────────────────────────────────────────────────────────────
let src;
try {
  src = readFileSync(inputFile, 'utf8');
} catch {
  console.error(`❌  No se encontró el archivo: ${inputFile}`);
  process.exit(1);
}

// ── Locate the array ────────────────────────────────────────────────────────
const OPEN  = 'const SEARCH_INDEX = [[';
const CLOSE = ']];';

const startOff = src.indexOf(OPEN);
if (startOff === -1) {
  console.error('❌  No se encontró "const SEARCH_INDEX = [[" en el archivo.');
  console.error('   Asegúrate de pasar el worker original (con índice embebido).');
  process.exit(1);
}

const endOff = src.indexOf(CLOSE, startOff);
if (endOff === -1) {
  console.error('❌  No se encontró el cierre del array ("]];").');
  process.exit(1);
}

// Strip the JS assignment wrapper → plain JSON array
const arrayJS  = src.slice(startOff + 'const SEARCH_INDEX = '.length, endOff + 2); // up to ]]
const arrayJSON = arrayJS; // the array literal IS valid JSON

// ── Parse & validate ────────────────────────────────────────────────────────
let data;
try {
  data = JSON.parse(arrayJSON);
} catch (e) {
  console.error('❌  El array no es JSON válido:', e.message);
  process.exit(1);
}

// ── Write compact JSON ───────────────────────────────────────────────────────
const compact = JSON.stringify(data, null, 0);
writeFileSync(outputFile, compact, 'utf8');

const sizeKB = (Buffer.byteLength(compact, 'utf8') / 1024).toFixed(1);
console.log(`✅  Extraídas ${data.length} entradas → ${outputFile}`);
console.log(`   Tamaño: ${sizeKB} KB`);
console.log('');
console.log('Siguiente paso:');
console.log('   node upload-index.mjs');
