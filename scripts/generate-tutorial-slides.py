#!/usr/bin/env python3
"""
Genera las diapositivas SVG de la Guía de Inicio (/launchpad).

Cómo actualizar un tutorial cuando cambia la UI:
1. Edita la entrada correspondiente en DATA (heading / desc / cta / nav_label).
2. Ejecuta:  python3 scripts/generate-tutorial-slides.py
   Esto sobrescribe public/tutorials/<id>/slide-1.svg y slide-2.svg.
3. Sube manualmente el campo "version" del id en public/tutorials/manifest.json.

Todo vive en este único archivo: ni Gemini, ni assets externos, ni binarios.
Las imágenes son SVG generados por código -> 100% editables y versionables en git.
"""
import html
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'tutorials')

NAV_ITEMS = [
    'Dashboard',
    'Guía de Inicio',
    'Nueva Campaña',
    'Conversaciones',
    'Marketing',
    'Facturación',
    'Claves de IA',
    'Configuración',
]

GOLD = '#C9A84C'
GOLD_BR = '#E8B923'
BG = '#0A0A0F'
SIDEBAR = '#12121A'
CARD = '#1A1A2E'
BORDER = '#2A2A4A'
TEXT = '#F5F5F5'
MUTED = '#8888AA'

DATA = {
    'crear-contacto': {
        'title': 'Crea tu primer contacto',
        'nav': 'Conversaciones',
        'slides': [
            {
                'heading': 'Crea tu primer contacto',
                'desc': ['Ve a Conversaciones y pulsa el', 'botón + para agregar un contacto.'],
                'cta': '+ Nuevo contacto',
            },
            {
                'heading': 'Completa los datos',
                'desc': ['Ingresa nombre, teléfono, email', 'y guarda el contacto.'],
                'cta': 'Guardar contacto',
            },
        ],
    },
    'importar-contactos': {
        'title': 'Importa tus contactos existentes',
        'nav': 'Conversaciones',
        'slides': [
            {
                'heading': 'Importa tus contactos',
                'desc': ['Usa el botón Importar para subir', 'un archivo CSV con tus contactos.'],
                'cta': 'Importar contactos',
            },
            {
                'heading': 'Mapea las columnas',
                'desc': ['Relaciona cada columna del CSV', 'con nombre, teléfono y email.'],
                'cta': 'Confirmar importación',
            },
        ],
    },
    'embudo-captacion': {
        'title': 'Crea un embudo de captación',
        'nav': 'Marketing',
        'slides': [
            {
                'heading': 'Crea un embudo de captación',
                'desc': ['En Marketing > Enlaces de', 'Activación, agrega un nuevo enlace.'],
                'cta': '+ Agregar',
            },
            {
                'heading': 'Configura el formulario',
                'desc': ['Define los campos a capturar y', 'publica el enlace para compartir.'],
                'cta': 'Publicar enlace',
            },
        ],
    },
    'comunicacion-multicanal': {
        'title': 'Activa la comunicación multicanal',
        'nav': 'Conversaciones',
        'slides': [
            {
                'heading': 'Activa la comunicación multicanal',
                'desc': ['En Conversaciones > Configuración,', 'conecta correo, SMS y WhatsApp.'],
                'cta': 'Conectar canal',
            },
            {
                'heading': 'Responde desde un solo chat',
                'desc': ['Todos los canales conectados', 'aparecen en una sola bandeja.'],
                'cta': 'Ver bandeja unificada',
            },
        ],
    },
    'primera-campana': {
        'title': 'Lanza tu primera campaña',
        'nav': 'Marketing',
        'slides': [
            {
                'heading': 'Lanza tu primera campaña',
                'desc': ['En Marketing > Correos, pulsa', 'Nuevo para crear una campaña.'],
                'cta': '+ Nuevo',
            },
            {
                'heading': 'Escribe y envía',
                'desc': ['Redacta el asunto y contenido,', 'luego envía la campaña.'],
                'cta': 'Enviar campaña',
            },
        ],
    },
}

DATA.update({
    'seguimiento-automatizado': {
        'title': 'Configura el seguimiento automático',
        'nav': 'Marketing',
        'slides': [
            {
                'heading': 'Automatiza el seguimiento',
                'desc': ['Crea una secuencia que se activa', 'cuando entra un nuevo contacto.'],
                'cta': '+ Nueva automatización',
            },
            {
                'heading': 'Define los pasos',
                'desc': ['Agrega esperas y mensajes que se', 'envían automáticamente.'],
                'cta': 'Activar secuencia',
            },
        ],
    },
    'programacion-citas': {
        'title': 'Activa la programación de citas',
        'nav': 'Marketing',
        'slides': [
            {
                'heading': 'Activa la programación de citas',
                'desc': ['Configura tu disponibilidad semanal', 'y duración de cada cita.'],
                'cta': 'Configurar horario',
            },
            {
                'heading': 'Comparte tu enlace de reservas',
                'desc': ['Tus clientes podrán reservar citas', 'directamente desde el enlace.'],
                'cta': 'Copiar enlace de reservas',
            },
        ],
    },
    'pipeline-ventas': {
        'title': 'Optimiza tu proceso de ventas',
        'nav': 'Conversaciones',
        'slides': [
            {
                'heading': 'Organiza tu proceso de ventas',
                'desc': ['Visualiza tus oportunidades en', 'columnas: Nuevo, Contactado...'],
                'cta': 'Ver pipeline',
            },
            {
                'heading': 'Mueve oportunidades de etapa',
                'desc': ['Arrastra cada tarjeta a medida que', 'avanza la negociación.'],
                'cta': 'Actualizar etapa',
            },
        ],
    },
    'redes-sociales': {
        'title': 'Gestiona tus redes sociales',
        'nav': 'Marketing',
        'slides': [
            {
                'heading': 'Planifica tus redes sociales',
                'desc': ['En Marketing > Planificador, agrega', 'una nueva publicación.'],
                'cta': '+ Nueva publicación',
            },
            {
                'heading': 'Programa la fecha y hora',
                'desc': ['Selecciona las redes y programa', 'la publicación automáticamente.'],
                'cta': 'Programar',
            },
        ],
    },
    'anuncios-meta': {
        'title': 'Captura leads con anuncios de Meta',
        'nav': 'Marketing',
        'slides': [
            {
                'heading': 'Conecta Meta Ads',
                'desc': ['En Administrador de Anuncios, conecta', 'tu cuenta de Facebook / Instagram.'],
                'cta': 'Conectar cuenta',
            },
            {
                'heading': 'Crea tu primera campaña',
                'desc': ['Define objetivo, presupuesto', 'y audiencia de tu anuncio.'],
                'cta': 'Crear campaña',
            },
        ],
    },
    'campana-sms': {
        'title': 'Lanza tu primera campaña de SMS',
        'nav': 'Marketing',
        'slides': [
            {
                'heading': 'Lanza una campaña de SMS',
                'desc': ['Redacta un mensaje corto para', 'enviar a tu audiencia.'],
                'cta': '+ Nuevo SMS',
            },
            {
                'heading': 'Selecciona audiencia y envía',
                'desc': ['Elige los contactos y envía', 'tu campaña de SMS.'],
                'cta': 'Enviar SMS',
            },
        ],
    },
    'conversaciones-ventas': {
        'title': 'Gestiona tus conversaciones de ventas',
        'nav': 'Conversaciones',
        'slides': [
            {
                'heading': 'Gestiona tus conversaciones',
                'desc': ['Todas tus conversaciones de ventas', 'en una sola bandeja de entrada.'],
                'cta': 'Abrir bandeja',
            },
            {
                'heading': 'Responde en tiempo real',
                'desc': ['Escribe tu respuesta y envíala', 'directamente desde el chat.'],
                'cta': 'Enviar mensaje',
            },
        ],
    },
    'chat-en-vivo': {
        'title': 'Activa el chat en vivo',
        'nav': 'Conversaciones',
        'slides': [
            {
                'heading': 'Activa el chat en vivo',
                'desc': ['En Configuración, activa el widget', 'de chat para tu sitio web.'],
                'cta': 'Activar chat en vivo',
            },
            {
                'heading': 'Atiende a tus visitantes',
                'desc': ['Los mensajes del widget llegan', 'directo a tu bandeja.'],
                'cta': 'Ver conversaciones',
            },
        ],
    },
    'messenger': {
        'title': 'Conecta Messenger e Instagram',
        'nav': 'Conversaciones',
        'slides': [
            {
                'heading': 'Conecta Messenger e Instagram',
                'desc': ['En Configuración, vincula tus', 'páginas de Facebook e Instagram.'],
                'cta': 'Conectar',
            },
            {
                'heading': 'Responde desde un solo lugar',
                'desc': ['Los mensajes de redes sociales', 'llegan a tu bandeja unificada.'],
                'cta': 'Ver bandeja',
            },
        ],
    },
    'lanzar-producto': {
        'title': 'Lanza tu primer producto',
        'nav': 'Facturación',
        'slides': [
            {
                'heading': 'Crea tu primer producto',
                'desc': ['En Facturación > Productos, agrega', 'un nuevo producto o servicio.'],
                'cta': '+ Agregar',
            },
            {
                'heading': 'Publica y empieza a vender',
                'desc': ['Define precio y descripción,', 'luego publica tu producto.'],
                'cta': 'Publicar producto',
            },
        ],
    },
    'conectar-pagos': {
        'title': 'Conecta un proveedor de pagos',
        'nav': 'Facturación',
        'slides': [
            {
                'heading': 'Conecta un proveedor de pagos',
                'desc': ['En Integraciones, elige PayPal,', 'Stripe o Mercado Pago.'],
                'cta': 'Conectar',
            },
            {
                'heading': 'Empieza a cobrar',
                'desc': ['Una vez conectado, podrás recibir', 'pagos de tus clientes.'],
                'cta': 'Ver transacciones',
            },
        ],
    },
    'enlace-pago': {
        'title': 'Crea un enlace de pago personalizado',
        'nav': 'Facturación',
        'slides': [
            {
                'heading': 'Crea un enlace de pago',
                'desc': ['En Enlaces de Pago, agrega un', 'nuevo enlace personalizado.'],
                'cta': '+ Agregar',
            },
            {
                'heading': 'Comparte el enlace',
                'desc': ['Define el monto y comparte el', 'enlace con tu cliente.'],
                'cta': 'Copiar enlace',
            },
        ],
    },
    'facturas': {
        'title': 'Genera y envía facturas profesionales',
        'nav': 'Facturación',
        'slides': [
            {
                'heading': 'Genera tu primera factura',
                'desc': ['En Facturas y Estimaciones, pulsa', 'Nuevo para crear una factura.'],
                'cta': '+ Nuevo',
            },
            {
                'heading': 'Envía la factura',
                'desc': ['Revisa los datos y envía la', 'factura al cliente.'],
                'cta': 'Enviar al cliente',
            },
        ],
    },
})


def render_slide(item_title, nav_label, step_num, slide):
    e = html.escape
    heading = e(slide['heading'])
    cta = e(slide['cta'])
    desc_lines = slide['desc']

    # --- Sidebar nav ---
    nav_svg = []
    for i, label in enumerate(NAV_ITEMS):
        y = 116 + i * 42
        active = label == nav_label
        if active:
            nav_svg.append(
                f'<rect x="12" y="{y - 24}" width="196" height="34" rx="8" '
                f'fill="rgba(201,168,76,0.12)" stroke="{GOLD}" stroke-width="1"/>'
            )
            nav_svg.append(
                f'<text x="28" y="{y}" fill="{GOLD}" font-family="Inter, Arial, sans-serif" '
                f'font-size="13" font-weight="700">{e(label)}</text>'
            )
        else:
            nav_svg.append(
                f'<text x="28" y="{y}" fill="{MUTED}" font-family="Inter, Arial, sans-serif" '
                f'font-size="13">{e(label)}</text>'
            )
    nav_svg = '\n    '.join(nav_svg)

    # --- Description tspans ---
    desc_tspans = ''.join(
        f'<tspan x="290" dy="{0 if i == 0 else 26}">{e(line)}</tspan>'
        for i, line in enumerate(desc_lines)
    )

    # --- Decorative empty placeholder rows below ---
    deco_rows = []
    for i in range(3):
        y = 470 + i * 56
        deco_rows.append(
            f'<rect x="290" y="{y}" width="920" height="40" rx="8" '
            f'fill="none" stroke="{BORDER}" stroke-width="1" stroke-dasharray="4 4"/>'
        )
    deco_rows = '\n    '.join(deco_rows)

    return f'''<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial, sans-serif">
  <defs>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{GOLD}"/>
      <stop offset="1" stop-color="{GOLD_BR}"/>
    </linearGradient>
  </defs>

  <!-- fondo -->
  <rect width="1280" height="720" fill="{BG}"/>

  <!-- sidebar -->
  <rect x="0" y="0" width="220" height="720" fill="{SIDEBAR}"/>
  <line x1="220" y1="0" x2="220" y2="720" stroke="{BORDER}" stroke-width="1"/>
  <rect x="20" y="24" width="40" height="40" rx="8" fill="url(#goldGrad)"/>
  <text x="72" y="44" fill="{GOLD}" font-size="18" font-weight="800">RAI</text>
  <text x="72" y="60" fill="{MUTED}" font-size="9" letter-spacing="1">CONTENT ENGINE</text>
  <line x1="20" y1="86" x2="200" y2="86" stroke="{BORDER}" stroke-width="1"/>
  {nav_svg}

  <!-- topbar -->
  <rect x="220" y="0" width="1060" height="64" fill="{BG}"/>
  <line x1="220" y1="64" x2="1280" y2="64" stroke="{BORDER}" stroke-width="1"/>
  <text x="250" y="40" fill="{TEXT}" font-size="20" font-weight="700">{e(item_title)}</text>
  <rect x="1100" y="20" width="140" height="28" rx="14" fill="rgba(201,168,76,0.15)"/>
  <text x="1170" y="39" fill="{GOLD}" font-size="12" text-anchor="middle">Paso {step_num} de 2</text>

  <!-- card principal -->
  <rect x="250" y="96" width="1000" height="590" rx="16" fill="{CARD}" stroke="{BORDER}" stroke-width="1"/>
  <text x="290" y="160" fill="{TEXT}" font-size="26" font-weight="700">{heading}</text>
  <text x="290" y="200" fill="{MUTED}" font-size="15">
    {desc_tspans}
  </text>

  <!-- botón / acción resaltada -->
  <rect x="290" y="320" width="320" height="56" rx="10" fill="url(#goldGrad)"/>
  <text x="450" y="355" fill="{BG}" font-size="15" font-weight="700" text-anchor="middle">{cta}</text>
  <text x="630" y="355" fill="{GOLD_BR}" font-size="14" font-style="italic">&#8592; haz clic aqu&#237;</text>

  <!-- elementos decorativos vacios -->
  {deco_rows}
</svg>
'''


def main():
    for item_id, item in DATA.items():
        out_dir = os.path.join(OUT_DIR, item_id)
        os.makedirs(out_dir, exist_ok=True)
        for idx, slide in enumerate(item['slides'], start=1):
            svg = render_slide(item['title'], item['nav'], idx, slide)
            path = os.path.join(out_dir, f'slide-{idx}.svg')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(svg)
            print(f'  -> {path}')
    print(f'\nListo: {len(DATA)} pasos x 2 diapositivas SVG generadas.')


if __name__ == '__main__':
    main()
