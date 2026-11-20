import type { LandingCopy } from './types';

export const es: LandingCopy = {
  locale: 'es',
  htmlLang: 'es',
  path: '/es/',
  meta: {
    title: 'Neruz Page View: visor responsive y capturas gratis',
    description:
      'Mira tu sitio en varios tamaños de pantalla a la vez y haz capturas, videos con scroll y mockups. Extensión gratis, de código abierto y 100% local.',
    ogDescription:
      'Mira tu sitio en varias pantallas y haz capturas, videos y mockups. Gratis, abierto y 100% local.',
  },
  skipLink: 'Saltar al contenido',
  languageLabel: 'Cambiar idioma',
  languageNames: { 'pt-BR': 'Português', en: 'English', es: 'Español' },
  header: {
    signature: 'por Fonte Dev',
    signatureLabel: 'Sitio de Fonte Dev (se abre en una pestaña nueva)',
    signatureLogoAlt: 'Fonte Dev',
  },
  language: { current: 'Idioma actual: {idioma}', short: 'ES', selected: 'seleccionado' },
  common: { newTab: '(se abre en una pestaña nueva)' },
  github: 'GitHub',
  brandEyebrow: 'Neruz / Page View',
  cta: {
    addTo: {
      chrome: 'Agregar a Chrome',
      edge: 'Agregar a Edge',
      firefox: 'Agregar a Firefox',
      brave: 'Agregar a Brave',
      opera: 'Agregar a Opera',
    },
    chooseBrowser: 'Elige tu navegador',
    alsoFor: 'También para:',
    browserNotes: {
      brave: 'Brave instala directo desde la Chrome Web Store.',
      opera: 'En Opera, activa antes el complemento oficial Install Chrome Extensions.',
    },
    mobileInstall: 'Ábrelo en tu computadora para instalar',
    copyLink: 'Copiar enlace',
    linkCopied: 'Enlace copiado',
    share: 'Compartir',
    viewCode: 'Ver el código en GitHub',
    support: 'Gratis, código abierto (MIT) y sin crear cuenta.',
  },
  hero: {
    title: 'Mira tu sitio en varias pantallas a la vez.',
    subtitle:
      'Prueba el diseño responsive, haz capturas con marco de dispositivo y graba videos que recorren la página solos. Una extensión gratis y de código abierto que funciona solo en tu computadora.',
    posterAlt: 'Un sitio mostrado a la vez en celular, tablet y laptop',
    windowWidthLabel: 'Ancho de la ventana',
    skipIntro: 'Saltar intro',
  },
  sceneOneClick: {
    stepLabel: 'Captura',
    title: 'Un clic y la captura ya está lista para mostrar.',
    subtitle:
      'Haz clic en el ícono, elige "Captura con marco" y obtén la página completa dentro de un marco de dispositivo. El modo Experiencia espera a que aparezcan las animaciones antes de capturar, para que nada salga a medias.',
    before: 'Antes: captura normal',
    after: 'Después: página completa, con marco',
    compareLabel: 'Comparar antes y después',
    backgroundLabel: 'Color de fondo de la captura',
    backgrounds: ['Fondo grafito', 'Fondo claro', 'Fondo terracota'],
  },
  popup: {
    title: 'Neruz Page View',
    quickShotLabel: 'Captura con marco',
    quickShotHint: 'Esta página en un marco de dispositivo, lista para bajar.',
    openStudioLabel: 'Abrir en el Estudio',
    openStudioHint: 'Mírala en varias pantallas a la vez.',
    urlPlaceholder: 'O pega una dirección (ej.: localhost:3000)',
    urlButton: 'Abrir',
    deviceLabel: 'Dispositivo',
    deviceChange: 'Cambiar',
  },
  ruler: {
    label: 'Ir a la sección',
    counter: 'Escena {n} de {total}',
    scenes: [
      { id: 'inicio', label: 'Mira tu sitio en varias pantallas a la vez.' },
      { id: 'um-clique', label: 'Un clic y la captura ya está lista para mostrar.' },
    ],
  },
  footer: {
    navLabel: 'Pie de página',
    product: {
      title: 'Producto',
      installTitle: 'Instalar en tu navegador',
      comingSoon: 'Llegando a las tiendas',
    },
    project: {
      title: 'Proyecto',
      github: 'Código en GitHub',
      license: 'Licencia MIT',
      issue: 'Reportar un problema',
    },
    privacy: 'Política de privacidad',
    umbrella: 'Neruz Extensions',
    umbrellaText:
      'Extensiones de navegador hechas por Bruno Lucas para quienes crean y muestran sitios. Page View es la primera.',
    studio: {
      title: 'Fonte Dev',
      text: 'Fonte Dev, de Bruno Lucas, crea sitios y experiencias digitales a medida, del primer movimiento al último detalle.',
      cta: 'Conoce Fonte Dev',
      ctaLabel: 'Conoce Fonte Dev (se abre en una pestaña nueva)',
    },
    credit: 'Desenvolvido por Fonte Dev · Bruno Lucas',
  },
  forno: {
    brand: 'Forno 27',
    nav: {
      home: 'Inicio',
      menu: 'Menú',
      about: 'Nosotros',
      contact: 'Contacto',
      toggle: 'Abrir menú',
    },
    hero: {
      title: 'Pan caliente desde temprano',
      subtitle: 'Fermentación lenta, horno de piedra y hornadas pequeñas todo el día.',
      cta: 'Ver el menú',
    },
    menu: {
      title: 'Recién horneado',
      more: 'Ver todo',
      items: [
        { name: 'Pan de masa madre', desc: 'Corteza crujiente, miga abierta.', price: '$1.23' },
        { name: 'Croissant de mantequilla', desc: 'Hojaldre en capas finas.', price: '$4.56' },
        { name: 'Pan de queso', desc: 'Clásico brasileño, recién horneado.', price: '$7.89' },
        {
          name: 'Bizcocho de naranja',
          desc: 'Glaseado ligero, rebanada generosa.',
          price: '$9.87',
        },
      ],
    },
    about: {
      title: 'Sobre nosotros',
      body: 'Forno 27 empezó con una receta familiar y un horno demasiado pequeño. Hoy el horno es más grande; la receta sigue igual.',
    },
    footerNote: 'Forno 27 es una panadería ficticia, creada para esta demostración.',
    url: 'forno27.example',
    regionLabel: 'Sitio de demostración ficticio: panadería Forno 27',
  },
};
