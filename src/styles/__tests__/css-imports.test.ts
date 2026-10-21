import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Todo el CSS de la app se carga desde el layout raíz (src/styles/modules.ts): si una página o un componente
 * importa su propio `.css`, Next lo descarga tras el clic y el módulo se ve sin estilos ~0,3 s al navegar.
 */
const SRC = join(process.cwd(), 'src');
const AGGREGATOR = 'src/styles/modules.ts';
const ALLOWED_OUTSIDE = new Set(['src/app/layout.tsx']); // solo para globals.css

const norm = (p: string) => relative(process.cwd(), p).split('\\').join('/');

function walk(dir: string, out: string[] = []): string[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Recorre el árbol `src` del propio repositorio.
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC);
const CSS_IMPORT = /^\s*import\s+['"]([^'"]+\.css)['"]/gm;

function cssImportsOf(file: string): string[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Archivos descubiertos bajo `src`.
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(CSS_IMPORT)].map((m) => m[1]);
}

describe('CSS: un solo punto de entrada', () => {
  const sources = files.filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));

  it('ninguna página ni componente importa un .css (salvo globals.css en el layout y el agregador)', () => {
    const offenders: string[] = [];
    for (const f of sources) {
      const rel = norm(f);
      if (rel === AGGREGATOR) continue;
      for (const spec of cssImportsOf(f)) {
        if (ALLOWED_OUTSIDE.has(rel) && spec === './globals.css') continue;
        offenders.push(`${rel} → ${spec}`);
      }
    }
    expect(offenders, 'Mueve estos imports a src/styles/modules.ts').toEqual([]);
  });

  it('el layout raíz importa globals.css primero y luego el agregador', () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Ruta fija dentro del repositorio.
    const layout = readFileSync(join(SRC, 'app/layout.tsx'), 'utf8');
    const g = layout.indexOf("import './globals.css'");
    const m = layout.indexOf("import '../styles/modules'");
    expect(g).toBeGreaterThanOrEqual(0);
    expect(m).toBeGreaterThan(g);
  });

  it('el agregador importa cada .css de src/ (salvo globals.css y los que entran por @import) exactamente una vez', () => {
    const imported = cssImportsOf(join(process.cwd(), AGGREGATOR)).map((spec) => norm(resolve(dirname(join(process.cwd(), AGGREGATOR)), spec)));
    const duplicated = imported.filter((p, i) => imported.indexOf(p) !== i);
    expect(duplicated).toEqual([]);

    const viaAtImport = new Set<string>();
    const allCss = files.filter((f) => f.endsWith('.css'));
    for (const css of allCss) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- Archivos descubiertos bajo `src`.
      const text = readFileSync(css, 'utf8');
      for (const m of text.matchAll(/@import\s+['"](\.[^'"]+)['"]/g)) viaAtImport.add(norm(resolve(dirname(css), m[1])));
    }

    const expected = allCss.map(norm).filter((p) => p !== 'src/app/globals.css' && !viaAtImport.has(p));
    expect([...imported].sort()).toEqual([...expected].sort());
  });
});
