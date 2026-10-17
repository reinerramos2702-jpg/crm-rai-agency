import { describe, expect, it } from 'vitest';
import { EMAIL_TEMPLATES, renderEmail } from '../marketing-email-templates';

describe('marketing-email-templates', () => {
  it('tiene plantillas con id único y textos en español sin variables rotas', () => {
    expect(new Set(EMAIL_TEMPLATES.map((t) => t.id)).size).toBe(EMAIL_TEMPLATES.length);
    for (const t of EMAIL_TEMPLATES) {
      expect(t.subject.length).toBeGreaterThan(5);
      expect((t.body.match(/\{\{/g) ?? []).length).toBe((t.body.match(/\}\}/g) ?? []).length);
    }
  });
  it('renderiza asunto, texto y HTML escapado', () => {
    const r = renderEmail({ subject: 'Hola {{nombre}}', body: 'Para {{nombre}} <b>\n\nSegundo' }, { nombre: 'Ana' });
    expect(r.subject).toBe('Hola Ana');
    expect(r.text).toContain('Para Ana');
    expect(r.html).toContain('&lt;b&gt;');
    expect(r.html.match(/<p /g)).toHaveLength(2);
  });
  it('deja visibles las variables sin valor y protege el color', () => {
    const r = renderEmail({ subject: '{{empresa}}', body: 'x' }, {}, 'red;"><script>');
    expect(r.subject).toBe('{{empresa}}');
    expect(r.html).toContain('#C9A84C');
    expect(r.html).not.toContain('<script>');
  });
});
