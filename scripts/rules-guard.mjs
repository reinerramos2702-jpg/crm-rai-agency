#!/usr/bin/env node
// Guardia de reglas inmutables: detecta ediciones a los archivos de reglas.
// Uso: node scripts/rules-guard.mjs            -> verifica contra .rai-rules.lock
//      node scripts/rules-guard.mjs --update   -> regenera el lock (SOLO Reiner, tras revisar el diff)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCK = '.rai-rules.lock';
const files = ['AGENTS.md', 'scripts/gate.mjs', 'scripts/panel-check.mjs', 'scripts/rules-guard.mjs'];
for (const dir of ['.opencode/agent', '.opencode/command', '.github/workflows']) {
  if (existsSync(dir)) for (const f of readdirSync(dir).sort()) if (/\.(md|ya?ml)$/.test(f)) files.push(join(dir, f).replaceAll('\\', '/'));
}
const hash = (p) => createHash('sha256').update(readFileSync(p, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
const current = Object.fromEntries(files.filter(existsSync).sort().map((f) => [f, hash(f)]));

if (process.argv.includes('--update')) {
  writeFileSync(LOCK, JSON.stringify(current, null, 2) + '\n');
  console.log(`rules-guard: lock actualizado (${Object.keys(current).length} archivos)`);
  process.exit(0);
}
if (!existsSync(LOCK)) { console.error('rules-guard: falta .rai-rules.lock'); process.exit(1); }
const locked = JSON.parse(readFileSync(LOCK, 'utf8'));
const problems = [];
for (const f of new Set([...Object.keys(locked), ...Object.keys(current)])) {
  if (!(f in current)) problems.push(`ELIMINADO  ${f}`);
  else if (!(f in locked)) problems.push(`NUEVO      ${f}`);
  else if (locked[f] !== current[f]) problems.push(`MODIFICADO ${f}`);
}
if (problems.length) {
  console.error('rules-guard: archivos de reglas cambiados sin aprobación registrada:');
  problems.forEach((p) => console.error('  ' + p));
  console.error('Los agentes NO deben editar estos archivos. Si el cambio es legítimo, Reiner revisa el diff y corre: node scripts/rules-guard.mjs --update');
  process.exit(1);
}
console.log(`rules-guard: OK (${Object.keys(current).length} archivos de reglas intactos)`);
