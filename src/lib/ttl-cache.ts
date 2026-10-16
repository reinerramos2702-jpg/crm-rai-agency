/**
 * Caché en memoria con caducidad, para resultados costosos que toleran unos
 * segundos de retraso (p. ej. conteos de la Guía de Inicio contra una base remota).
 * Vive por proceso: en serverless es un atajo oportunista, nunca la fuente de verdad.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expires: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 200,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: this.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Devuelve el valor vigente o lo calcula, evitando cálculos simultáneos repetidos de la misma clave. */
  private readonly pending = new Map<string, Promise<T>>();
  async getOrCompute(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const running = this.pending.get(key);
    if (running) return running;
    const p = compute()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, p);
    return p;
  }
}
