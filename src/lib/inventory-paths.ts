import * as fs from 'fs';
import * as path from 'path';

export type InventoryPathErrorCode = 'NOT_ALLOWED' | 'NOT_FOUND' | 'UNREADABLE';

export class InventoryPathError extends Error {
  constructor(
    public readonly code: InventoryPathErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'InventoryPathError';
  }
}

export function validateInventoryWorkspaceId(workspaceId: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(workspaceId)) {
    throw new InventoryPathError('NOT_ALLOWED', 'Acceso al inventario no permitido');
  }
  return workspaceId;
}

export function getInventoryAllowedRoots(
  workspaceId: string,
  configuredBases = process.env.INVENTORY_ALLOWED_ROOTS,
  cwd = process.cwd()
): string[] {
  const safeWorkspaceId = validateInventoryWorkspaceId(workspaceId);
  const bases = configuredBases
    ?.split(path.delimiter)
    .map((base) => base.trim())
    .filter(Boolean);

  const effectiveBases = bases?.length ? bases : [path.join(cwd, 'inventory')];
  return Array.from(
    new Set(effectiveBases.map((base) => path.resolve(cwd, base, safeWorkspaceId)))
  );
}

export function isPathWithinRoot(candidatePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
}

function realpath(canonicalPath: string): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Caller passes only path.resolve-canonicalized paths already matched to the allowlist.
  return fs.realpathSync(canonicalPath);
}

/**
 * Las bases son configuración administrada por el servidor y no deben ser
 * escribibles por usuarios no confiables. Node no ofrece una API portable
 * equivalente a openat/O_NOFOLLOW para encadenar realpath + operación de forma
 * atómica, por lo que queda una carrera residual si otro proceso puede cambiar
 * el filesystem entre esta validación y el readdir/stat posterior.
 */
export function resolveInventoryRoot(
  requestedPath: string,
  allowedRoots: string[]
): string {
  const canonicalRequest = path.resolve(requestedPath);
  const canonicalAllowedRoots = allowedRoots.map((root) => path.resolve(root));
  const matchingRoots = canonicalAllowedRoots.filter((root) =>
    isPathWithinRoot(canonicalRequest, root)
  );

  if (matchingRoots.length === 0) {
    throw new InventoryPathError('NOT_ALLOWED', 'Acceso al inventario no permitido');
  }

  let realRequest: string;
  try {
    realRequest = realpath(canonicalRequest);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new InventoryPathError(
      code === 'ENOENT' ? 'NOT_FOUND' : 'UNREADABLE',
      code === 'ENOENT' ? 'Inventario no encontrado' : 'No se pudo acceder al inventario'
    );
  }

  const isWithinRealRoot = matchingRoots.some((root) => isPathWithinRoot(realRequest, root));

  if (!isWithinRealRoot) {
    throw new InventoryPathError('NOT_ALLOWED', 'Acceso al inventario no permitido');
  }

  return realRequest;
}

export function resolveInventoryDescendant(
  parentPath: string,
  entryName: string,
  allowedRoots: string[]
): string {
  if (
    !entryName ||
    entryName === '.' ||
    entryName === '..' ||
    path.basename(entryName) !== entryName ||
    entryName.includes('/') ||
    entryName.includes('\\')
  ) {
    throw new InventoryPathError('NOT_ALLOWED', 'Acceso al inventario no permitido');
  }

  return resolveInventoryRoot(path.resolve(parentPath, entryName), allowedRoots);
}
