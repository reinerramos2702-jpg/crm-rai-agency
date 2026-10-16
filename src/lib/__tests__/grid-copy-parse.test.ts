import { describe, expect, it } from 'vitest';
import { findCopysInMessages, splitCopysFromChat } from '../grid-copy-parse';

const TEXT = `Aquí están los copys.

### Tema 1
**Gancho potente**

Cuerpo del primero.
#uno #dos

---

**Día 2**
Segundo copy

ALTO TOTAL: valida para continuar.

Caption 4: algo
Cuarto copy`;

describe('splitCopysFromChat', () => {
  const r = splitCopysFromChat(TEXT, 7);
  it('asigna cada bloque a su día', () => {
    expect(r).toHaveLength(7);
    expect(r[0]).toContain('Cuerpo del primero.');
    expect(r[0]).toContain('#uno #dos');
    expect(r[1]).toBe('Segundo copy');
    expect(r[2]).toBeNull();
    expect(r[3]).toBe('Cuarto copy');
  });

  it('descarta separadores y la línea de ALTO TOTAL', () => {
    expect(r[0]).not.toContain('---');
    expect(r[1]).not.toContain('ALTO TOTAL');
  });

  it('ignora números fuera del rango y textos sin encabezados', () => {
    expect(splitCopysFromChat('Tema 12\nalgo', 7).every((x) => x === null)).toBe(true);
    expect(splitCopysFromChat('Solo texto libre', 7).every((x) => x === null)).toBe(true);
  });

  it('conserva el primer bloque si un día se repite', () => {
    const out = splitCopysFromChat('Tema 1\nuno\nTema 1\ndos', 7);
    expect(out[0]).toBe('uno');
  });
});

describe('findCopysInMessages', () => {
  it('toma la respuesta más reciente con al menos 2 copys', () => {
    const found = findCopysInMessages(
      [
        { role: 'assistant', content: 'Tema 1\nviejo\nTema 2\nviejo2' },
        { role: 'user', content: 'ok' },
        { role: 'assistant', content: 'Tema 1\nnuevo\nTema 2\nnuevo2' },
        { role: 'assistant', content: 'Gracias' },
      ],
      7,
    );
    expect(found?.[0]).toBe('nuevo');
  });

  it('devuelve null si no hay copys suficientes', () => {
    expect(findCopysInMessages([{ role: 'assistant', content: 'Tema 1\nsolo uno' }], 7)).toBeNull();
    expect(findCopysInMessages([], 7)).toBeNull();
  });
});
