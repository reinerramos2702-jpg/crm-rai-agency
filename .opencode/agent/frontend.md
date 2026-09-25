---
description: "Sub-agente de dominio Frontend/UI para CRM RAI Agency. Invocado por @orchestrator para componentes, páginas, formularios y estado de cliente."
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

Trabajás componentes/páginas/UI del repo (Next.js — `src/app/**`, componentes compartidos). Seguís las convenciones de estilo ya existentes en el repo, nunca `localStorage` como fuente de verdad para progreso/estado que debería venir de la DB (ver el caso ya cerrado de `/launchpad`). Código final limpio y depurado, sin componentes muertos ni imports sin usar, antes de devolver la tarea al orquestador como terminada.
