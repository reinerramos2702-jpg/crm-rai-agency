-- Cierra el acceso público (API de Supabase) a las tablas de `public`.
-- Contexto (23 oct 2026): `PasswordResetToken` y `ScheduledPost` tenían RLS desactivado y el rol `anon`
-- con permisos totales; además los privilegios por defecto de `postgres` en `public` otorgan permisos a
-- `anon`/`authenticated` en toda tabla nueva. El CRM solo accede por Prisma (rol `postgres`, ignora RLS),
-- no usa supabase-js ni REST, así que este cierre no cambia el comportamiento de la app.
--
-- Idempotente: se puede ejecutar más de una vez. Los bloques DO comprueban que los roles existan, para que
-- la migración también corra en una base Postgres sin los roles de Supabase.
--
-- Rollback (solo si algo externo dependía de `anon`; no esperado):
--   ALTER TABLE "PasswordResetToken" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "ScheduledPost" DISABLE ROW LEVEL SECURITY;
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

-- 1. RLS activo en las dos tablas que lo tenían desactivado (sin políticas = bloqueadas para anon/authenticated).
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduledPost" ENABLE ROW LEVEL SECURITY;

-- 2. Quitar permisos a `anon` y `authenticated` en todas las tablas existentes de `public`.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
  END IF;
END
$$;

-- 3. Que las tablas futuras creadas por `postgres` en `public` no nazcan abiertas.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    END IF;
  END IF;
END
$$;
