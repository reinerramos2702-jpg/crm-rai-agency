import { describe, expect, it } from 'vitest';
import {
  MAX_TEXT_FILE_BYTES,
  buildUserMessage,
  chatErrorMessage,
  createStreamParser,
  fileIcon,
  fileKind,
  formatSize,
  isReadableText,
} from '../campaign-chat';

describe('stream del chat', () => {
  it('extrae texto y errores e ignora metadatos', () => {
    const p = createStreamParser();
    const ev = p.push('0:"Hola"\nf:{"id":1}\n0:" mundo"\n3:"Falló"\n');
    expect(ev).toEqual([
      { type: 'text', text: 'Hola' },
      { type: 'text', text: ' mundo' },
      { type: 'error', message: 'Falló' },
    ]);
  });

  it('une líneas partidas entre fragmentos de red', () => {
    const p = createStreamParser();
    expect(p.push('0:"Ho')).toEqual([]);
    expect(p.push('la"\n0:"!"')).toEqual([{ type: 'text', text: 'Hola' }]);
    expect(p.flush()).toEqual([{ type: 'text', text: '!' }]);
    expect(p.flush()).toEqual([]);
  });

  it('descarta fragmentos malformados y toma el mensaje de errores en objeto', () => {
    const p = createStreamParser();
    expect(p.push('0:{roto\n3:{"message":"Cuota"}\n3:{}\n')).toEqual([
      { type: 'error', message: 'Cuota' },
      { type: 'error', message: 'Error desconocido del modelo.' },
    ]);
  });
});

describe('errores HTTP', () => {
  it('traduce sesión expirada y falta de clave', () => {
    expect(chatErrorMessage(401, '', 'google')).toBe('Sesión expirada. Vuelve a iniciar sesión.');
    expect(chatErrorMessage(400, '{"error":"No API key for google"}', 'google')).toContain('"google"');
  });

  it('usa el cuerpo (JSON o texto) o un mensaje genérico', () => {
    expect(chatErrorMessage(502, '{"message":"Caído"}', 'x')).toBe('Caído');
    expect(chatErrorMessage(500, 'Boom', 'x')).toBe('Boom');
    expect(chatErrorMessage(503, '', 'x')).toBe('Error 503 al contactar la IA.');
  });
});

describe('adjuntos', () => {
  it('formatea tamaños', () => {
    expect(formatSize(512)).toBe('512B');
    expect(formatSize(2048)).toBe('2KB');
    expect(formatSize(3 * 1024 * 1024)).toBe('3.0MB');
  });

  it('clasifica por tipo y extensión', () => {
    expect(fileKind('image/png', 'a.png')).toBe('image');
    expect(fileKind('', 'Notas.MD')).toBe('text');
    expect(fileKind('application/octet-stream', 'x.zip')).toBe('archive');
    expect(fileIcon('video/mp4', 'v.mp4')).toBe('🎬');
    expect(fileIcon('', 'raro.bin')).toBe('📎');
  });

  it('solo lee como texto lo legible y liviano', () => {
    expect(isReadableText({ type: 'text/plain', name: 'a.txt', size: 100 })).toBe(true);
    expect(isReadableText({ type: '', name: 'datos.csv', size: 100 })).toBe(true);
    expect(isReadableText({ type: 'text/plain', name: 'a.txt', size: MAX_TEXT_FILE_BYTES + 1 })).toBe(false);
    expect(isReadableText({ type: 'image/png', name: 'a.png', size: 10 })).toBe(false);
  });

  it('arma el mensaje con el bloque de adjuntos', () => {
    expect(buildUserMessage('  Hola  ', [])).toBe('Hola');
    const out = buildUserMessage('Mira', [
      { name: 'a.txt', sizeBytes: 10, type: 'text/plain', content: 'contenido' },
      { name: 'f.png', sizeBytes: 2048, type: 'image/png' },
    ]);
    expect(out).toContain('[Archivos adjuntos]');
    expect(out).toContain('a.txt (10B)\n```\ncontenido\n```');
    expect(out).toContain('🖼️ f.png (2KB)');
  });
});
