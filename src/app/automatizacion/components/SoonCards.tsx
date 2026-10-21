import React from 'react';
import { Bell, Clock, FlaskConical, Gauge, RotateCw, Sparkles, type LucideIcon } from 'lucide-react';

interface SoonItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

const SOON: SoonItem[] = [
  { icon: Clock, title: 'Horario de ejecución', text: 'Ejecuta los flujos solo en tu horario laboral (por ejemplo, 8:00 a 20:00 hora de Caracas); lo demás espera a la mañana siguiente.' },
  { icon: Gauge, title: 'Límite de ejecuciones por hora', text: 'Protege tus canales y tu cuota: si se supera el límite, los flujos esperan en cola en vez de dispararse todos a la vez.' },
  { icon: RotateCw, title: 'Reintentos automáticos', text: 'Si un paso falla (por ejemplo, el webhook no responde), se reintenta varias veces antes de marcar la ejecución con error.' },
  { icon: Bell, title: 'Alertas de fallo por correo', text: 'Resumen al correo de alertas cuando un flujo falla varias veces seguidas, sin tener que abrir Actividad.' },
  { icon: FlaskConical, title: 'Modo de prueba', text: 'Simula un flujo con un contacto de ejemplo y revisa qué haría, sin enviar mensajes ni cambiar datos reales.' },
  { icon: Sparkles, title: 'Constructor con IA', text: 'Describe el flujo en lenguaje natural y la IA arma el disparador y los pasos por ti.' },
];

export function SoonCards() {
  return (
    <div className="st-soon">
      {SOON.map(({ icon: Icon, title, text }) => (
        <div key={title} className="st-soon-card">
          <div className="st-soon-top">
            <Icon size={16} aria-hidden="true" />
            <strong>{title}</strong>
            <span className="st-tag">Próximamente</span>
          </div>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}
