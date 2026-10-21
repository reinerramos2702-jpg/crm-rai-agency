#!/usr/bin/env node
/**
 * Verifica (solo lectura) que cada modelo de Prisma tenga su tabla en la base conectada.
 * Uso: node --env-file=.env.staging scripts/check-db-tables.mjs
 * No imprime credenciales ni datos: solo nombres de tablas.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const out = (m) => process.stdout.write(`${m}\n`);
const err = (...a) => process.stderr.write(`${a.join(' ')}\n`);
const prisma = new PrismaClient();
try {
  const [{ schema }] = await prisma.$queryRaw`SELECT current_schema() AS schema`;
  const rows = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`;
  const present = new Set(rows.map((r) => r.table_name));
  const models = Prisma.dmmf.datamodel.models.map((m) => m.dbName ?? m.name);
  const missing = models.filter((t) => !present.has(t));
  out(`Esquema: ${schema} · modelos: ${models.length} · tablas presentes: ${models.length - missing.length}`);
  if (missing.length === 0) {
    out('OK: todas las tablas existen.');
  } else {
    out(`FALTAN ${missing.length} tabla(s): ${missing.join(', ')}`);
    process.exitCode = 1;
  }
} catch (e) {
  err('No se pudo consultar la base:', e instanceof Error ? e.message.split('\n')[0] : 'error');
  process.exitCode = 2;
} finally {
  await prisma.$disconnect();
}
