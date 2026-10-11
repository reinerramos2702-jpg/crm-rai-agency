#!/usr/bin/env node
// Gate de verificación independiente: el resultado es el código de salida, no la opinión de un agente.
// Uso: node scripts/gate.mjs [--fast]   (--fast omite el build)
import { spawnSync } from 'node:child_process';

const fast = process.argv.includes('--fast');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const steps = [
  ['reglas', process.execPath, ['scripts/rules-guard.mjs']],
  ['panel', process.execPath, ['scripts/panel-check.mjs']],
  ['typecheck', npm, ['run', 'typecheck']],
  ['lint', npm, ['run', 'lint']],
  ['tests', npm, ['test']],
  ...(fast ? [] : [['build', npm, ['run', 'build']]]),
];
const results = [];
for (const [name, cmd, args] of steps) {
  console.log(`\n=== gate: ${name} ===`);
  const t = Date.now();
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, ok: r.status === 0, s: ((Date.now() - t) / 1000).toFixed(1) });
  if (r.status !== 0) break; // falla rápido: no se avanza con un paso roto
}
console.log('\n=== resumen del gate ===');
results.forEach((x) => console.log(`${x.ok ? 'OK    ' : 'FALLA '} ${x.name} (${x.s}s)`));
const ok = results.length === steps.length && results.every((x) => x.ok);
console.log(ok ? 'GATE: VERDE' : 'GATE: ROJO');
process.exit(ok ? 0 : 1);
