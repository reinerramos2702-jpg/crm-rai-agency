import JSZip from 'jszip';

/**
 * Extrae el texto plano de un archivo .docx (Word) a partir de su buffer.
 *
 * Un .docx es un ZIP que contiene `word/document.xml` con el contenido en XML.
 * Cada párrafo es un nodo `<w:p>` y el texto visible vive en nodos `<w:t>`.
 * Concatenamos el texto de cada `<w:t>` dentro de un mismo `<w:p>` y separamos
 * párrafos con saltos de línea, preservando la estructura legible del documento.
 *
 * Usado por:
 * - `/api/workspace/brand-doc` (POST) — el usuario arrastra su propio doc
 *   "Sistema Operativo de Contenido" y se guarda como `Workspace.brandDocText`.
 */
export async function extractTextFromDocx(buffer: Buffer | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('No se encontró word/document.xml — ¿es un archivo .docx válido?');
  }
  const xml = await docXmlFile.async('string');

  // Cada párrafo <w:p ...> ... </w:p> se procesa por separado.
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];

  const lines: string[] = [];
  for (const para of paragraphs) {
    // Texto visible: <w:t ...>texto</w:t> (puede haber atributos como xml:space="preserve")
    // eslint-disable-next-line security/detect-unsafe-regex -- XML de .docx acotado por el usuario logueado; el patrón lazy sobre entrada limitada no escala a ReDoS real.
    const textMatches = para.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
    const text = textMatches
      .map((m) => {
        // eslint-disable-next-line security/detect-unsafe-regex -- mismo contexto que arriba: limpiar tags de un match ya extraído.
        const inner = m.replace(/<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>/, '');
        return decodeXmlEntities(inner);
      })
      .join('');

    // Detecta saltos de línea manuales dentro del párrafo (<w:br/> o <w:cr/>)
    const hasBreak = /<w:(br|cr)\s*\/>/.test(para);
    lines.push(text);
    if (hasBreak && text.trim()) lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
