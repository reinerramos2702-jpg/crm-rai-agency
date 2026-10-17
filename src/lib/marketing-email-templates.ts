/** Biblioteca local de plantillas de correo (no se envía nada desde aquí). Lógica pura. */
import { escapeHtml } from './marketing-countdown';
import { renderSnippet } from './marketing-snippets';

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'Bienvenida' | 'Seguimiento' | 'Ventas' | 'Citas' | 'Reactivación';
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: readonly EmailTemplate[] = [
  {
    id: 'bienvenida',
    name: 'Bienvenida a nuevos clientes',
    category: 'Bienvenida',
    subject: 'Bienvenido a {{empresa}}, {{nombre}}',
    body: 'Hola {{nombre}},\n\nGracias por confiar en {{empresa}}. Estamos felices de empezar a trabajar contigo.\n\nEn las próximas horas te escribiremos para coordinar los primeros pasos. Si tienes cualquier duda, responde este correo y te ayudamos.\n\nUn abrazo,\nEl equipo de {{empresa}}',
  },
  {
    id: 'seguimiento',
    name: 'Seguimiento después de una reunión',
    category: 'Seguimiento',
    subject: 'Resumen de nuestra conversación, {{nombre}}',
    body: 'Hola {{nombre}},\n\nGracias por el tiempo de hoy. Te dejo un resumen de lo que acordamos y los próximos pasos.\n\nSi quieres ajustar algo, dímelo y lo revisamos juntos.\n\nQuedo atento,\n{{empresa}}',
  },
  {
    id: 'propuesta',
    name: 'Envío de propuesta',
    category: 'Ventas',
    subject: 'Tu propuesta de {{empresa}}',
    body: 'Hola {{nombre}},\n\nTe comparto la propuesta que preparamos para ti: {{enlace}}\n\nEstá pensada para resolver lo que conversamos. Con gusto la revisamos en una llamada corta cuando te convenga.\n\nSaludos,\n{{empresa}}',
  },
  {
    id: 'recordatorio',
    name: 'Recordatorio de cita',
    category: 'Citas',
    subject: 'Recordatorio: tu cita es el {{fecha}}',
    body: 'Hola {{nombre}},\n\nTe recordamos que tu cita con {{empresa}} es el {{fecha}}.\n\nSi necesitas reprogramar, responde este correo o escríbenos al {{telefono}}.\n\n¡Te esperamos!',
  },
  {
    id: 'oferta',
    name: 'Oferta por tiempo limitado',
    category: 'Ventas',
    subject: '{{nombre}}, esta oferta termina pronto',
    body: 'Hola {{nombre}},\n\nSolo hasta el {{fecha}} tienes una condición especial en {{empresa}}.\n\nAprovéchala aquí: {{enlace}}\n\nSi tienes dudas, estamos a un mensaje de distancia.',
  },
  {
    id: 'reactivacion',
    name: 'Reactivación de contactos',
    category: 'Reactivación',
    subject: '{{nombre}}, ¿seguimos en contacto?',
    body: 'Hola {{nombre}},\n\nHace tiempo que no hablamos y en {{empresa}} tenemos novedades que pueden interesarte.\n\n¿Te gustaría que te contemos más? Responde con un "sí" y te escribimos.\n\nGracias por estar ahí.',
  },
];

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/** Variables sin valor se quedan como {{variable}} para que se note qué falta. */
export function renderEmail(t: Pick<EmailTemplate, 'subject' | 'body'>, values: Record<string, string>, accent = '#C9A84C'): RenderedEmail {
  const subject = renderSnippet(t.subject, values);
  const text = renderSnippet(t.body, values);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  const safeAccent = /^#[0-9a-f]{3,6}$/i.test(accent) ? accent : '#C9A84C';
  const html = `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1A1A2E;max-width:560px;margin:0 auto;padding:24px;border-top:4px solid ${safeAccent}">\n${paragraphs}\n</div>`;
  return { subject, text, html };
}

export const EMAIL_CATEGORIES: ReadonlyArray<EmailTemplate['category'] | 'Todas'> = ['Todas', 'Bienvenida', 'Seguimiento', 'Ventas', 'Citas', 'Reactivación'];
