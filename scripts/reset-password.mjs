#!/usr/bin/env node
// Restablece la contraseña de un usuario del CRM en el entorno STAGING.
// La contraseña la escribe quien ejecuta el script (entrada oculta): nunca va en el chat, en argumentos ni en logs.
//
// Uso (desde la raíz del repo):
//   node --env-file=.env.staging scripts/reset-password.mjs
//
// Seguridad:
// - Se niega a correr si DATABASE_URL no apunta al schema `staging` (jamás toca producción).
// - Mismo formato de hash que src/lib/password.ts (scrypt:<salt>:<hash>); la compatibilidad
//   está cubierta por src/lib/__tests__/reset-password-script.test.ts.
import crypto from 'node:crypto';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

export function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export function isStagingUrl(url) {
  return typeof url === 'string' && /[?&]schema=staging(&|$)/.test(url);
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = false;
    rl._writeToOutput = function (s) {
      if (!rl.stdoutMuted) rl.output.write(s);
      else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n');
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    rl.stdoutMuted = hidden;
  });
}

async function main() {
  if (!isStagingUrl(process.env.DATABASE_URL)) {
    console.error('ABORTADO: DATABASE_URL no apunta al schema "staging". Este script solo corre contra staging.');
    console.error('Ejecuta: node --env-file=.env.staging scripts/reset-password.mjs');
    process.exit(1);
  }
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const email = (await ask('Email del usuario: ')).trim().toLowerCase();
    if (!email) throw new Error('Email vacío.');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('No existe un usuario con ese email en staging.');
    const p1 = await ask('Nueva contraseña (mín. 8 caracteres, no se ve al escribir): ', { hidden: true });
    if (p1.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    const p2 = await ask('Repite la contraseña: ', { hidden: true });
    if (p1 !== p2) throw new Error('Las contraseñas no coinciden. No se cambió nada.');
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPasswordScrypt(p1) } });
    console.log(`Listo: contraseña actualizada para ${email}. Ya puedes iniciar sesión en localhost:3000/login.`);
  } catch (err) {
    console.error(`ERROR: ${err instanceof Error ? err.message : 'fallo desconocido'}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
