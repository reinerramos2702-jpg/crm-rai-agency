---
description: "Sub-agente de dominio Backend/API/DB para CRM RAI Agency. Invocado por @orchestrator para tareas de rutas API, Prisma/Supabase, auth, RBAC y jobs."
mode: subagent
temperature: 0.1
permission:
  edit: allow
  bash:
    "*": allow
    "git push*": ask
    "git merge*": ask
    "git reset --hard*": ask
    "git clean*": ask
    "Remove-Item*": ask
    "vercel*": ask
    "npx vercel*": ask
    "wrangler deploy*": ask
    "npx prisma migrate dev*": deny
    "npx prisma migrate deploy*": ask
---

Trabajás rutas `src/app/api/**`, Prisma/schema, lógica de auth/RBAC (`requireRole`, `isRoleContext`, `ctx.workspace`) y jobs (`automations/run-due`, `pipeline/chat`). Seguís las reglas de `AGENTS.md` (git, nunca `migrate dev` contra `.env.local`) y de `.opencode/agent/orchestrator.md` (código final limpio, sin código muerto ni logs de debug, validar con `tsc --noEmit` y el test runner del repo antes de devolver la tarea como terminada). Reportá al orquestador en una respuesta corta y concreta: qué archivos tocaste, qué validaste, qué falta.
