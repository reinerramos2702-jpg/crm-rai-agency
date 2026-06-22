/**
 * Top 30 países (códigos telefónicos + ISO-2 para banderas).
 * Las banderas se renderizan como SVG vía flagcdn.com (https://flagcdn.com/{iso2}.svg).
 * Usado por el selector de código de país en Conversaciones (Nuevo contacto).
 */
export interface CountryDialCode {
  name: string;
  iso2: string; // código ISO 3166-1 alpha-2 en minúsculas (para flagcdn)
  dial: string; // código de marcación con '+'
}

export const COUNTRY_CODES: CountryDialCode[] = [
  { name: 'Venezuela', iso2: 've', dial: '+58' },
  { name: 'España', iso2: 'es', dial: '+34' },
  { name: 'Estados Unidos', iso2: 'us', dial: '+1' },
  { name: 'México', iso2: 'mx', dial: '+52' },
  { name: 'Colombia', iso2: 'co', dial: '+57' },
  { name: 'Argentina', iso2: 'ar', dial: '+54' },
  { name: 'Chile', iso2: 'cl', dial: '+56' },
  { name: 'Perú', iso2: 'pe', dial: '+51' },
  { name: 'Ecuador', iso2: 'ec', dial: '+593' },
  { name: 'Brasil', iso2: 'br', dial: '+55' },
  { name: 'República Dominicana', iso2: 'do', dial: '+1' },
  { name: 'Panamá', iso2: 'pa', dial: '+507' },
  { name: 'Costa Rica', iso2: 'cr', dial: '+506' },
  { name: 'Guatemala', iso2: 'gt', dial: '+502' },
  { name: 'Honduras', iso2: 'hn', dial: '+504' },
  { name: 'El Salvador', iso2: 'sv', dial: '+503' },
  { name: 'Nicaragua', iso2: 'ni', dial: '+505' },
  { name: 'Bolivia', iso2: 'bo', dial: '+591' },
  { name: 'Paraguay', iso2: 'py', dial: '+595' },
  { name: 'Uruguay', iso2: 'uy', dial: '+598' },
  { name: 'Cuba', iso2: 'cu', dial: '+53' },
  { name: 'Reino Unido', iso2: 'gb', dial: '+44' },
  { name: 'Francia', iso2: 'fr', dial: '+33' },
  { name: 'Alemania', iso2: 'de', dial: '+49' },
  { name: 'Italia', iso2: 'it', dial: '+39' },
  { name: 'Portugal', iso2: 'pt', dial: '+351' },
  { name: 'Canadá', iso2: 'ca', dial: '+1' },
  { name: 'China', iso2: 'cn', dial: '+86' },
  { name: 'India', iso2: 'in', dial: '+91' },
  { name: 'Japón', iso2: 'jp', dial: '+81' },
];

export function flagUrl(iso2: string) {
  return `https://flagcdn.com/${iso2}.svg`;
}
