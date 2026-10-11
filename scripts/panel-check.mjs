#!/usr/bin/env node
// Verifica la integridad estructural de docs/planning/panel-control.html.
// Uso: node scripts/panel-check.mjs [ruta-al-panel]
// Exit 0 = sin errores (puede haber avisos); exit 1 = errores.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'docs/planning/panel-control.html';
const raw = readFileSync(file, 'utf8');
const errors = [];
const warnings = [];

// Se ignoran <script>, <style> y comentarios para contar etiquetas.
const html = raw
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '');

for (const tag of ['div', 'section', 'span']) {
  const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
  const close = (html.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
  if (open !== close) errors.push(`<${tag}> desbalanceado: ${open} aperturas vs ${close} cierres`);
}

if (!/id="updated-date"/.test(html)) errors.push('Falta <span id="updated-date">');

const parts = html.split(/<div class="check-item/).slice(1);
const ids = new Map();
let done = 0;
parts.forEach((chunk, idx) => {
  const head = chunk.slice(0, chunk.indexOf('>'));
  const title = (chunk.match(/class="check-title">([\s\S]*?)<\/div>/)?.[1] ?? `item #${idx + 1}`)
    .replace(/<[^>]+>/g, '').trim().slice(0, 70);
  const status = head.match(/data-status="([^"]*)"/)?.[1];
  if (!['pending', 'done', 'blocked'].includes(status)) {
    errors.push(`[${title}] data-status inválido: ${status}`);
    return;
  }
  const isDoneClass = /\bdone\b/.test(head);
  const isBlockedClass = /\bblocked\b/.test(head);
  if (status === 'done') done++;
  if (isDoneClass !== (status === 'done')) errors.push(`[${title}] clase "done" y data-status no coinciden`);
  if (isBlockedClass !== (status === 'blocked')) errors.push(`[${title}] clase "blocked" y data-status no coinciden`);
  const tag = chunk.match(/<span class="tag (tag-[a-z]+)">/)?.[1];
  if (!tag) warnings.push(`[${title}] sin etiqueta tag-*`);
  else if (status === 'done' && tag !== 'tag-decided') warnings.push(`[${title}] hecho pero con ${tag}`);
  else if (status === 'blocked' && tag !== 'tag-blocked') warnings.push(`[${title}] bloqueado pero con ${tag}`);
  const id = head.match(/data-id="([^"]*)"/)?.[1];
  if (id) {
    if (ids.has(id)) errors.push(`[${title}] data-id duplicado: ${id}`);
    ids.set(id, title);
  }
  if (status === 'done' && !/(\d+\/\d+|commit|verific|evidencia|[0-9a-f]{7})/i.test(chunk.slice(0, 6000)))
    warnings.push(`[${title}] hecho sin evidencia detectable (commit/tests/verificación)`);
});

console.log(`panel-check: ${parts.length} items, ${done} hechos, ${errors.length} errores, ${warnings.length} avisos`);
errors.forEach((e) => console.error(`ERROR  ${e}`));
warnings.forEach((w) => console.warn(`AVISO  ${w}`));
process.exit(errors.length ? 1 : 0);
