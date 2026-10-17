import type { CSSProperties } from 'react';
import type { Stage } from './stages';

/** Estilo en línea que admite propiedades CSS personalizadas (`--nombre`) sin conversiones de tipo. */
export type CssVars = CSSProperties & Record<`--${string}`, string>;

export function stageVars(stage: Stage): CssVars {
  return { '--stage': stage.color };
}
