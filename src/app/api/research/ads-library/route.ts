import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { resolveApiKey } from '@/lib/llm-providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Ads Library scraping can take up to 2 minutes
export const maxDuration = 120;

interface AdItem {
  text: string;
  hasImage: boolean;
  hasVideo: boolean;
  index: number;
}

interface ScrapedData {
  ads: AdItem[];
  totalText: string;
  pageTitle: string;
  scrapedOk: boolean;
  errorMsg?: string;
}

interface AdsAnalysis {
  brandName: string;
  totalAdsFound: number;
  formats: { image: number; video: number; carousel: number; text: number };
  platforms: { facebook: number; instagram: number; messenger: number; audience_network: number };
  mainMessages: string[];
  commonCTAs: string[];
  themes: string[];
  tone: string;
  targetAudience: string;
  keyInsights: string[];
  recommendations: string[];
  topAdExamples: Array<{ headline: string; description: string; format: string }>;
}

async function scrapeAdsLibrary(brandName: string, country: string): Promise<ScrapedData> {
  try {
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-infobars',
        '--window-size=1280,800',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'es-ES',
      extraHTTPHeaders: {
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    // Disable webdriver detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // @ts-expect-error override
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();

    const searchUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(brandName)}&search_type=keyword_unordered`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Handle cookie consent if present
    try {
      const cookieBtn = await page.waitForSelector('[data-testid="cookie-policy-manage-dialog-accept-button"], button[title*="Aceptar"], button[title*="Accept"]', { timeout: 5000 });
      if (cookieBtn) await cookieBtn.click();
    } catch {
      // No cookie banner, continue
    }

    // Wait for ads to load
    await page.waitForTimeout(4000);

    // Scroll down to load more ads
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }

    // Extract ads data
    const data = await page.evaluate(() => {
      const bodyText = (document.body as HTMLElement).innerText || '';
      const ads: AdItem[] = [];

      // Try to find ad cards using various detection strategies
      const candidates = Array.from(document.querySelectorAll('div[class]'));
      let adIndex = 0;

      candidates.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const text = htmlEl.innerText || '';
        const hasSubstantialText = text.length > 80 && text.length < 3000;
        const hasMedia = el.querySelectorAll('img, video').length > 0;
        const isTopLevel =
          !el.parentElement?.closest('[class*="_7jy"]') &&
          !el.parentElement?.closest('[class*="x1qjc9v5"]');

        if (hasSubstantialText && hasMedia && isTopLevel && adIndex < 50) {
          const hasVideo = el.querySelectorAll('video').length > 0;
          const hasImage = !hasVideo && el.querySelectorAll('img').length > 0;

          ads.push({
            text: text.slice(0, 600),
            hasImage,
            hasVideo,
            index: adIndex++,
          });
        }
      });

      // Fallback: if we found nothing via DOM, parse bodyText for ad patterns
      if (ads.length === 0) {
        // Look for patterns in the page text
        const lines = bodyText.split('\n').filter((l) => l.trim().length > 20);
        for (let i = 0; i < Math.min(lines.length, 200); i++) {
          const line = lines[i];
          // Heuristic: lines that look like ad copy
          if (line.length > 40 && line.length < 500 && !line.includes('Facebook') && !line.includes('Meta')) {
            if (adIndex < 30) {
              ads.push({
                text: line,
                hasImage: false,
                hasVideo: false,
                index: adIndex++,
              });
            }
          }
        }
      }

      return {
        ads,
        totalText: bodyText.slice(0, 15000),
        pageTitle: document.title,
        url: window.location.href,
      };
    });

    await browser.close();

    return {
      ads: data.ads,
      totalText: data.totalText,
      pageTitle: data.pageTitle,
      scrapedOk: true,
    };
  } catch (err) {
    console.error('[ads-library] Playwright scrape error:', err);
    return {
      ads: [],
      totalText: '',
      pageTitle: '',
      scrapedOk: false,
      errorMsg: (err as Error).message,
    };
  }
}

async function analyzeWithAI(
  brandName: string,
  country: string,
  scraped: ScrapedData,
  googleApiKey: string | null
): Promise<AdsAnalysis> {
  const defaultAnalysis: AdsAnalysis = {
    brandName,
    totalAdsFound: scraped.ads.length,
    formats: { image: 0, video: 0, carousel: 0, text: 0 },
    platforms: { facebook: 0, instagram: 0, messenger: 0, audience_network: 0 },
    mainMessages: [],
    commonCTAs: [],
    themes: [],
    tone: 'No determinado',
    targetAudience: 'No determinado',
    keyInsights: [],
    recommendations: [],
    topAdExamples: [],
  };

  if (!googleApiKey && !scraped.totalText) return defaultAnalysis;

  try {
    // Use Google Gemini if available, otherwise return default
    if (!googleApiKey) return defaultAnalysis;

    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    const { generateText } = await import('ai');

    const model = createGoogleGenerativeAI({ apiKey: googleApiKey })('gemini-1.5-flash');

    const adsSnippet = scraped.ads.length > 0
      ? scraped.ads.slice(0, 15).map((a, i) => `Ad ${i + 1} [${a.hasVideo ? 'VIDEO' : a.hasImage ? 'IMAGEN' : 'TEXTO'}]:\n${a.text}`).join('\n---\n')
      : 'No se pudieron extraer anuncios específicos.';

    const pageSnippet = scraped.totalText.slice(0, 5000);

    const prompt = `Eres un experto en estrategia de marketing y publicidad digital. Analiza los siguientes datos de Meta Ads Library para la marca "${brandName}" en el mercado ${country}.

DATOS EXTRAÍDOS DE ADS LIBRARY:
${adsSnippet}

TEXTO COMPLETO DE LA PÁGINA (fragmento):
${pageSnippet}

Genera un análisis completo y retorna ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "totalAdsFound": <número estimado de anuncios activos>,
  "formats": {
    "image": <porcentaje 0-100>,
    "video": <porcentaje 0-100>,
    "carousel": <porcentaje 0-100>,
    "text": <porcentaje 0-100>
  },
  "platforms": {
    "facebook": <porcentaje 0-100>,
    "instagram": <porcentaje 0-100>,
    "messenger": <porcentaje 0-100>,
    "audience_network": <porcentaje 0-100>
  },
  "mainMessages": [<lista de 4-6 mensajes principales o ángulos clave usados>],
  "commonCTAs": [<lista de 3-5 CTAs detectados como "Comprar ahora", "Saber más", etc>],
  "themes": [<lista de 4-6 temas o categorías de contenido>],
  "tone": "<descripción del tono en una frase>",
  "targetAudience": "<descripción del público objetivo detectado>",
  "keyInsights": [<lista de 5-7 insights estratégicos importantes>],
  "recommendations": [<lista de 5 recomendaciones para competir o diferenciarse>],
  "topAdExamples": [
    {
      "headline": "<titular del anuncio>",
      "description": "<descripción breve del anuncio>",
      "format": "imagen|video|carousel"
    }
  ]
}

Si no hay suficiente datos, usa tu conocimiento general sobre la marca para complementar el análisis. Responde SOLO con el JSON, sin markdown ni texto adicional.`;

    const response = await generateText({ model, prompt, maxTokens: 2000 });

    // Parse JSON response
    const jsonText = response.text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(jsonText) as Partial<AdsAnalysis>;

    return {
      brandName,
      totalAdsFound: parsed.totalAdsFound || scraped.ads.length,
      formats: parsed.formats || defaultAnalysis.formats,
      platforms: parsed.platforms || defaultAnalysis.platforms,
      mainMessages: parsed.mainMessages || [],
      commonCTAs: parsed.commonCTAs || [],
      themes: parsed.themes || [],
      tone: parsed.tone || 'No determinado',
      targetAudience: parsed.targetAudience || 'No determinado',
      keyInsights: parsed.keyInsights || [],
      recommendations: parsed.recommendations || [],
      topAdExamples: parsed.topAdExamples || [],
    };
  } catch (err) {
    console.error('[ads-library] AI analysis error:', err);
    // Return basic analysis from scraped data
    const videoCount = scraped.ads.filter((a) => a.hasVideo).length;
    const imageCount = scraped.ads.filter((a) => a.hasImage).length;
    const total = scraped.ads.length || 1;

    return {
      ...defaultAnalysis,
      totalAdsFound: scraped.ads.length,
      formats: {
        video: Math.round((videoCount / total) * 100),
        image: Math.round((imageCount / total) * 100),
        carousel: 0,
        text: Math.round(((total - videoCount - imageCount) / total) * 100),
      },
      topAdExamples: scraped.ads.slice(0, 5).map((a) => ({
        headline: a.text.split('\n')[0].slice(0, 80) || 'Sin título',
        description: a.text.slice(0, 200),
        format: a.hasVideo ? 'video' : 'imagen',
      })),
    };
  }
}

function generateHTMLReport(analysis: AdsAnalysis, scrapedOk: boolean, searchUrl: string): string {
  const now = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formatData = [
    analysis.formats.image,
    analysis.formats.video,
    analysis.formats.carousel,
    analysis.formats.text,
  ];
  const platformData = [
    analysis.platforms.facebook,
    analysis.platforms.instagram,
    analysis.platforms.messenger,
    analysis.platforms.audience_network,
  ];

  const insightsHtml = analysis.keyInsights
    .map(
      (insight, i) => `
        <div class="insight-card">
          <div class="insight-number">${String(i + 1).padStart(2, '0')}</div>
          <p>${insight}</p>
        </div>`
    )
    .join('');

  const recoHtml = analysis.recommendations
    .map(
      (rec, i) => `
        <div class="reco-item">
          <div class="reco-icon">💡</div>
          <div>
            <strong>Recomendación ${i + 1}</strong>
            <p>${rec}</p>
          </div>
        </div>`
    )
    .join('');

  const messagesHtml = analysis.mainMessages
    .map((m) => `<span class="tag">${m}</span>`)
    .join('');

  const ctasHtml = analysis.commonCTAs
    .map((c) => `<span class="tag cta-tag">${c}</span>`)
    .join('');

  const themesHtml = analysis.themes
    .map((t) => `<span class="tag theme-tag">${t}</span>`)
    .join('');

  const adsExamplesHtml = analysis.topAdExamples
    .slice(0, 5)
    .map(
      (ad) => `
        <div class="ad-card">
          <div class="ad-format-badge ${ad.format}">${ad.format === 'video' ? '🎬 VIDEO' : ad.format === 'carousel' ? '🎠 CAROUSEL' : '🖼️ IMAGEN'}</div>
          <h4 class="ad-headline">${ad.headline}</h4>
          <p class="ad-desc">${ad.description}</p>
        </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta Ads Library — ${analysis.brandName} | RAI Content Engine</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>
    :root {
      --gold: #c9a84c;
      --purple: #7b5ea7;
      --cyan: #2ec4b6;
      --dark: #0e0e10;
      --card: #161618;
      --border: rgba(255,255,255,0.08);
      --text: #f0f0f0;
      --muted: #888;
      --success: #2ec4b6;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--dark);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

    /* HEADER */
    .header {
      background: linear-gradient(135deg, #0e0e10 0%, #1a1020 50%, #0e1520 100%);
      border-bottom: 1px solid var(--border);
      padding: 48px 0 40px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -10%;
      width: 60%;
      height: 200%;
      background: radial-gradient(ellipse, rgba(123,94,167,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(29,88,166,0.2);
      border: 1px solid rgba(29,88,166,0.4);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #5b9ee8;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 0%, var(--gold) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .header-meta span {
      font-size: 13px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${scrapedOk ? '#2ec4b6' : '#f59e0b'};
      display: inline-block;
    }

    /* METRICS ROW */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 32px 0;
    }
    .metric-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: var(--accent, var(--purple));
    }
    .metric-card.gold::before { background: var(--gold); }
    .metric-card.cyan::before { background: var(--cyan); }
    .metric-card.purple::before { background: var(--purple); }
    .metric-card.red::before { background: #f87171; }
    .metric-value {
      font-size: 32px;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
      margin-bottom: 4px;
    }
    .metric-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .metric-sub {
      font-size: 12px;
      color: var(--muted);
      margin-top: 8px;
    }

    /* CHARTS ROW */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .chart-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
    }
    .chart-card h3 {
      font-size: 13px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .chart-container { position: relative; height: 220px; }

    /* SECTIONS */
    .section {
      margin-bottom: 24px;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .section-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .section h2 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
    }
    .section-grid {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }

    /* TAGS */
    .tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag {
      background: rgba(123,94,167,0.15);
      border: 1px solid rgba(123,94,167,0.3);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      color: #c4a3e8;
      font-weight: 500;
    }
    .cta-tag {
      background: rgba(201,168,76,0.12);
      border-color: rgba(201,168,76,0.3);
      color: var(--gold);
    }
    .theme-tag {
      background: rgba(46,196,182,0.1);
      border-color: rgba(46,196,182,0.25);
      color: var(--cyan);
    }

    /* INSIGHTS */
    .insights-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .insight-card {
      background: rgba(123,94,167,0.08);
      border: 1px solid rgba(123,94,167,0.15);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .insight-number {
      font-size: 22px;
      font-weight: 900;
      color: rgba(123,94,167,0.4);
      line-height: 1;
      flex-shrink: 0;
      min-width: 28px;
    }
    .insight-card p {
      font-size: 13px;
      color: #d4d4d4;
      line-height: 1.6;
    }

    /* INFO ROW */
    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .info-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .info-card h3 {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
    }
    .info-value {
      font-size: 14px;
      color: var(--text);
      line-height: 1.6;
    }

    /* RECOMMENDATIONS */
    .reco-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(46,196,182,0.04);
      border: 1px solid rgba(46,196,182,0.1);
      border-radius: 10px;
      margin-bottom: 10px;
      align-items: flex-start;
    }
    .reco-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .reco-item strong {
      font-size: 12px;
      color: var(--cyan);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 4px;
    }
    .reco-item p {
      font-size: 13px;
      color: #d4d4d4;
      line-height: 1.6;
    }

    /* AD EXAMPLES */
    .ads-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .ad-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      position: relative;
    }
    .ad-format-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      border-radius: 4px;
      padding: 2px 8px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ad-format-badge.video { background: rgba(239,68,68,0.15); color: #f87171; }
    .ad-format-badge.imagen, .ad-format-badge.image { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .ad-format-badge.carousel { background: rgba(168,85,247,0.15); color: #c084fc; }
    .ad-headline {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .ad-desc {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* WARNING */
    .warning-bar {
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #fcd34d;
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    /* FOOTER */
    .footer {
      border-top: 1px solid var(--border);
      padding: 32px 0;
      margin-top: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer-brand {
      font-size: 14px;
      font-weight: 700;
      background: linear-gradient(135deg, #fff, var(--gold));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .footer p {
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }
    .footer-link {
      color: var(--cyan);
      text-decoration: none;
      font-size: 12px;
    }

    @media (max-width: 768px) {
      .metrics-row { grid-template-columns: 1fr 1fr; }
      .charts-row { grid-template-columns: 1fr; }
      .insights-grid { grid-template-columns: 1fr; }
      .ads-grid { grid-template-columns: 1fr; }
      .info-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="container">
    <div class="header-badge">
      <span>📊</span>
      META ADS LIBRARY ANALYSIS
    </div>
    <h1>${analysis.brandName}</h1>
    <p style="color: var(--muted); font-size: 14px;">Análisis competitivo de publicidad pagada en Meta</p>
    <div class="header-meta">
      <span><span class="status-dot"></span> ${scrapedOk ? 'Datos extraídos en tiempo real' : 'Análisis con datos de entrenamiento'}</span>
      <span>📅 Generado el ${now}</span>
      <span>🤖 Powered by RAI Content Engine</span>
    </div>
  </div>
</div>

<div class="container">

  ${!scrapedOk ? `
  <div class="warning-bar" style="margin-top: 24px;">
    ⚠️ <span>El scraping automático fue bloqueado por Meta. El análisis se generó con datos de entrenamiento sobre la marca. Para mejores resultados, abre <a href="${searchUrl}" target="_blank" style="color: #f59e0b;">Ads Library directamente</a> y pega el contenido en el chat.</span>
  </div>` : ''}

  <!-- METRICS -->
  <div class="metrics-row">
    <div class="metric-card gold">
      <div class="metric-value">${analysis.totalAdsFound}+</div>
      <div class="metric-label">Anuncios Activos</div>
      <div class="metric-sub">Detectados en la búsqueda</div>
    </div>
    <div class="metric-card purple">
      <div class="metric-value">${analysis.formats.video}%</div>
      <div class="metric-label">Formato Video</div>
      <div class="metric-sub">Del total de anuncios</div>
    </div>
    <div class="metric-card cyan">
      <div class="metric-value">${analysis.commonCTAs.length}</div>
      <div class="metric-label">CTAs Únicos</div>
      <div class="metric-sub">Llamadas a la acción</div>
    </div>
    <div class="metric-card red">
      <div class="metric-value">${analysis.mainMessages.length}</div>
      <div class="metric-label">Ángulos Creativos</div>
      <div class="metric-sub">Mensajes principales</div>
    </div>
  </div>

  <!-- CHARTS -->
  <div class="charts-row">
    <div class="chart-card">
      <h3>Distribución de Formatos</h3>
      <div class="chart-container">
        <canvas id="formatsChart"></canvas>
      </div>
    </div>
    <div class="chart-card">
      <h3>Distribución por Plataforma</h3>
      <div class="chart-container">
        <canvas id="platformsChart"></canvas>
      </div>
    </div>
  </div>

  <!-- MESSAGES & CTAs -->
  <div class="info-row">
    <div class="info-card">
      <h3>🎯 Mensajes Principales</h3>
      <div class="tags-wrap">${messagesHtml || '<span style="color:var(--muted);font-size:12px">No detectados</span>'}</div>
    </div>
    <div class="info-card">
      <h3>👆 CTAs Comunes</h3>
      <div class="tags-wrap">${ctasHtml || '<span style="color:var(--muted);font-size:12px">No detectados</span>'}</div>
    </div>
  </div>

  <!-- AUDIENCE & TONE -->
  <div class="info-row">
    <div class="info-card">
      <h3>👥 Audiencia Objetivo</h3>
      <p class="info-value">${analysis.targetAudience}</p>
    </div>
    <div class="info-card">
      <h3>🎨 Tono de Marca</h3>
      <p class="info-value">${analysis.tone}</p>
      <div style="margin-top: 12px;"><div class="tags-wrap">${themesHtml}</div></div>
    </div>
  </div>

  <!-- KEY INSIGHTS -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon" style="background: rgba(123,94,167,0.15);">🔍</div>
      <h2>Insights Estratégicos</h2>
    </div>
    <div class="insights-grid">
      ${insightsHtml || '<div class="insight-card"><p>No se pudieron generar insights con los datos disponibles.</p></div>'}
    </div>
  </div>

  <!-- AD EXAMPLES -->
  ${adsExamplesHtml ? `
  <div class="section">
    <div class="section-header">
      <div class="section-icon" style="background: rgba(59,130,246,0.15);">📢</div>
      <h2>Ejemplos de Anuncios Detectados</h2>
    </div>
    <div class="ads-grid">
      ${adsExamplesHtml}
    </div>
  </div>` : ''}

  <!-- RECOMMENDATIONS -->
  <div class="section">
    <div class="section-header">
      <div class="section-icon" style="background: rgba(46,196,182,0.12);">💡</div>
      <h2>Recomendaciones para Competir</h2>
    </div>
    ${recoHtml || '<div class="reco-item"><div class="reco-icon">💡</div><div><p>Analiza los mensajes de la competencia y diferencia tu propuesta de valor.</p></div></div>'}
  </div>

</div>

<!-- FOOTER -->
<div class="container">
  <div class="footer">
    <div>
      <div class="footer-brand">RAI Content Engine</div>
      <p>Reporte generado automáticamente • ${now}</p>
    </div>
    <a href="${searchUrl}" target="_blank" class="footer-link">Ver en Meta Ads Library →</a>
  </div>
</div>

<script>
  const chartDefaults = {
    plugins: {
      legend: {
        labels: { color: '#888', font: { size: 11 } },
        position: 'right',
      }
    }
  };

  // Formats Chart
  new Chart(document.getElementById('formatsChart'), {
    type: 'doughnut',
    data: {
      labels: ['Imagen', 'Video', 'Carrusel', 'Texto'],
      datasets: [{
        data: [${formatData.join(',')}],
        backgroundColor: ['#3b82f6', '#ef4444', '#a855f7', '#6b7280'],
        borderColor: '#161618',
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      ...chartDefaults,
      cutout: '65%',
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          callbacks: {
            label: (ctx) => ' ' + ctx.label + ': ' + ctx.raw + '%'
          }
        }
      }
    }
  });

  // Platforms Chart
  new Chart(document.getElementById('platformsChart'), {
    type: 'bar',
    data: {
      labels: ['Facebook', 'Instagram', 'Messenger', 'Audience Network'],
      datasets: [{
        label: '% de distribución',
        data: [${platformData.join(',')}],
        backgroundColor: ['#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b'],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ' ' + ctx.raw + '%'
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#888', font: { size: 11 } },
          max: 100,
        },
        y: {
          grid: { display: false },
          ticks: { color: '#888', font: { size: 11 } },
        }
      }
    }
  });
</script>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { brandName, country = 'ALL' } = body as { brandName: string; country?: string };

  if (!brandName?.trim()) {
    return NextResponse.json(
      { error: 'Se requiere el nombre de la marca (brandName)' },
      { status: 400 }
    );
  }

  const searchUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(brandName)}&search_type=keyword_unordered`;

  // 1. Scrape Ads Library
  const scraped = await scrapeAdsLibrary(brandName, country);

  // 2. Get Google API key for AI analysis
  const googleApiKey =
    (await resolveApiKey(auth.userId, 'google')) || process.env.GOOGLE_API_KEY || null;

  // 3. Analyze with AI
  const analysis = await analyzeWithAI(brandName, country, scraped, googleApiKey);

  // 4. Generate HTML report
  const htmlReport = generateHTMLReport(analysis, scraped.scrapedOk, searchUrl);

  return NextResponse.json({
    success: true,
    htmlReport,
    adsFound: analysis.totalAdsFound,
    scrapedOk: scraped.scrapedOk,
    analysis: {
      brandName: analysis.brandName,
      formats: analysis.formats,
      insights: analysis.keyInsights.slice(0, 3),
      recommendations: analysis.recommendations.slice(0, 2),
    },
  });
}
