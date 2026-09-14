# Brainstorm Funcionalidades Nuevas — CRM RAI Agency

> Documento de trabajo para migrar a chat de Cowork. Incluye las 3 ideas originales de Reiner + 20 ideas propuestas por Claude, organizadas por apartado. Ninguna está construida aún — es la base para armar el master prompt de la semana de desarrollo.

---

## 1. Ideas originales (Reiner)

### 1.1 Apartado "Captación de Asesores" (Belloanam)
Funnel completo para reclutar y gestionar asesores dentro del CRM:
- Captar nuevos asesores interesados.
- Analizar automáticamente su presencia digital.
- Detectar oportunidades de mejora en Instagram.
- Generar planes estratégicos de contenido personalizados.
- Dar seguimiento al avance de cada asesor.
- Crear una comunidad escalable.
- Panel privado para que Belloanam administre todos sus clientes/asesores.

**Nota clave:** el CRM lo usa un equipo completo, no una sola persona — distintas categorías de staff (asesores, vendedores, community managers, camarógrafos, editores) trabajando dentro de la misma plataforma. Centralizar todo ahí.

### 1.2 Guión de capacitación 0-100
Documento/guión generado por Claude Code que explique **cada funcionalidad y cada botón del CRM**, de cero a cien, para que Reiner se lo aprenda y luego capacite a cada negocio que compre el CRM. Debe soportar:
- Capacitación inicial del cliente.
- Seguimiento y dudas durante varios meses.
- Soporte técnico gratis 3 meses post-venta.

### 1.3 Retargeting por fecha de nacimiento (fidelización)
Cuando el cliente final del CRM (el negocio) tiene web o app:
- Se le pide al usuario final su fecha de nacimiento.
- Se guarda en base de datos.
- El sistema genera y envía automáticamente un email en el cumpleaños, con descuento/promoción.
- Objetivo: fidelización automática sin intervención manual.

---

## 2. Ideas nuevas propuestas (Claude) — 20

### A. Gestión de equipo interno (roles/asesores/CM/camarógrafos)
1. Módulo RRHH-lite: perfiles de staff por categoría (asesor / vendedor / CM / camarógrafo / editor), asignación por cliente.
2. Panel de carga de trabajo — cuántos clientes/tareas activas tiene cada persona, para balancear equipo.
3. Comisiones/metas por asesor — tracking de ventas cerradas, % comisión, dashboard de metas.
4. Chat interno / notas por cliente entre miembros del equipo (no visible al cliente final).

### B. Onboarding y captación (extiende el apartado de asesores)
5. Formulario público de aplicación de asesores con scoring automático (IA) antes de revisión humana.
6. Auditoría automática de presencia digital más allá de IG — web, Google Business, TikTok.
7. Generador automático de propuesta comercial (PDF) post-auditoría, para cerrar venta más rápido.
8. Pipeline visual tipo kanban: Lead → Auditado → Propuesta enviada → Cliente activo.

### C. Contenido / redes (relacionado al calendario de contenido ya planeado en v2.0)
9. Banco de plantillas de contenido reutilizables por industria/nicho.
10. Reporte automático mensual de desempeño en redes (PDF/email al cliente), con insight generado por IA.
11. Detección de tendencias/hashtags relevantes por nicho, sugeridos al generar plan de contenido.
12. Flujo de aprobación cliente→agencia: el cliente aprueba/rechaza posts antes de publicar.

### D. Fidelización / marketing automation (extiende la idea de cumpleaños)
13. Motor genérico de triggers por fecha (no solo cumpleaños): aniversario cliente, fecha de compra, inactividad X días.
14. Segmentación de contactos (tags, comportamiento, valor) para campañas dirigidas.
15. A/B testing simple de emails/mensajes automáticos.
16. Integración WhatsApp para promos automáticas (reusar Meta Cloud API ya planeada en el inbox unificado).

### E. Negocio / operación de la agencia
17. Facturación recurrente + recordatorios de pago automáticos de la agencia hacia sus propios clientes.
18. Biblioteca de recursos de capacitación in-app (videos, PDFs) — vinculada directo al guión de capacitación (punto 1.2).
19. Sistema de tickets de soporte técnico con SLA (para los 3 meses gratis post-venta) — historial, tiempos de respuesta.
20. Dashboard ejecutivo consolidado (Belloanam/dueño): salud de cada cliente, riesgo de churn, ingresos totales de la agencia.

---

## 3. Pendiente de decidir (antes de armar el master prompt)

- Priorizar qué combinación de ideas (originales + nuevas) entra en el sprint de 1 semana — no caben todas.
- Definir si el guión de capacitación 0-100 se genera al final o en paralelo, módulo por módulo.
- Definir orden de construcción final.

---

*Generado a partir de sesión de brainstorming — pendiente de priorización antes de convertirse en master prompt ejecutable.*
