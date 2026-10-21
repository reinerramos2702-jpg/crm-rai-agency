/** Textos de error de carga de la biblioteca, según el estado HTTP que dejó la caché de datos («HTTP 500»). */
export interface LoadErrorCopy {
  title: string;
  text: string;
  /** Reintentar solo sirve cuando el fallo puede ser temporal. */
  retryable: boolean;
}

export function describeLoadError(message: string | null): LoadErrorCopy {
  const status = /HTTP (\d{3})/.exec(message ?? '')?.[1];
  if (status === '401') {
    return { title: 'Tu sesión expiró', text: 'Vuelve a iniciar sesión para ver la biblioteca del servidor.', retryable: false };
  }
  if (status === '403') {
    return {
      title: 'Tu rol no tiene acceso a la biblioteca',
      text: 'Pide a una persona administradora que revise tus permisos.',
      retryable: false,
    };
  }
  if (status !== undefined) {
    return {
      title: 'El servidor no pudo cargar la biblioteca',
      text: 'Es un fallo temporal. Inténtalo de nuevo en unos segundos.',
      retryable: true,
    };
  }
  return { title: 'No hay conexión con el servidor', text: 'Revisa tu conexión a internet e inténtalo de nuevo.', retryable: true };
}
