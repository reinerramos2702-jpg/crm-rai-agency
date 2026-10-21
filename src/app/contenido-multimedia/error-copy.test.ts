import { describe, expect, it } from 'vitest';
import { describeLoadError } from './error-copy';

describe('describeLoadError', () => {
  it('distingue sesión vencida y falta de permisos, que no se arreglan reintentando', () => {
    expect(describeLoadError('HTTP 401')).toMatchObject({ title: 'Tu sesión expiró', retryable: false });
    expect(describeLoadError('HTTP 403')).toMatchObject({ retryable: false });
  });

  it('trata los fallos del servidor como temporales', () => {
    expect(describeLoadError('HTTP 500')).toMatchObject({ title: 'El servidor no pudo cargar la biblioteca', retryable: true });
    expect(describeLoadError('HTTP 503').retryable).toBe(true);
  });

  it('sin estado HTTP asume un problema de conexión', () => {
    expect(describeLoadError('Failed to fetch')).toMatchObject({ title: 'No hay conexión con el servidor', retryable: true });
    expect(describeLoadError(null).retryable).toBe(true);
  });
});
