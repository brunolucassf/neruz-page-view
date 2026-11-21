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
    title: 'Dos clics y la captura ya está lista para mostrar.',
    subtitle:
      'Haz clic en el ícono y el Estudio se abre con la página que estás viendo; con "Captura con marco" activado, Capturar te da la página completa dentro de un marco de dispositivo. El modo Experiencia espera a que aparezcan las animaciones antes de capturar, para que nada salga a medias.',
    before: 'Antes: captura normal',
    after: 'Después: página completa, con marco',
    compareLabel: 'Comparar antes y después',
    backgroundLabel: 'Color de fondo de la captura',
    backgrounds: ['Fondo grafito', 'Fondo claro', 'Fondo terracota'],
  },
  studioArt: {
    title: 'Estudio',
    captureTitle: 'Captura',
    modeLabel: 'Modo',
    modes: ['Rápido', 'Experiencia', 'Momentos'],
    framedLabel: 'Captura con marco',
    captureLabel: 'Capturar',
  },
  sceneDevices: {
    stepLabel: 'Pantallas',
    title: 'Haz scroll en una pantalla. Todas te siguen.',
    subtitle:
      'El scroll, los clics, la navegación y lo que escribes se repiten en todas las pantallas. Empieza con el kit Esenciales de 12 tamaños o arma el tuyo entre unos 45 dispositivos. Gira, cambia el tamaño arrastrando y revisa los anchos con la regla. Funciona con localhost.',
    note: 'Las pantallas se simulan por tamaño en tu navegador: el iPhone aquí es tu navegador con el tamaño del iPhone, no Safari.',
    names: ['Celular', 'Plegable', 'Tablet', 'Portátil', 'Monitor'],
  },
  sceneAuto: {
    stepLabel: 'Video',
    title: 'La página se desplaza sola. Tú solo presionas Grabar.',
    subtitle:
      'La extensión detecta las secciones de la página y hace una pausa en cada una. Elige la pantalla, ajusta la velocidad y guarda en vertical 1080×1920, el formato de Reels y Shorts, o en 16:9.',
    note: 'MP4, WebM o GIF · Cursor opcional · En Firefox, el navegador te pregunta qué pestaña grabar antes de empezar.',
    recording: 'Grabando {time}',
    sections: ['Inicio', 'Menú', 'Acerca de', 'Pie'],
  },
  sceneFolder: {
    stepLabel: 'Varias páginas',
    title: 'Todo el sitio, en una sola carpeta.',
    subtitle:
      'Pega una lista de direcciones, usa el sitemap o deja que la extensión siga los enlaces internos. Las páginas se capturan una tras otra y, al final, descargas un ZIP ordenado con un informe de lo que se hizo.',
    note: 'Ves el límite de páginas antes de empezar, sigues el progreso y puedes cancelar cuando quieras. El informe solo trae hechos: qué se capturó, qué se omitió y por qué.',
    urlListLabel: 'Lista de páginas',
    exampleTag: 'ejemplo',
    counter: 'Página {n} de {total}',
    folderName: 'forno27.zip',
    reportTitle: 'Informe',
    reportLines: [
      '4 páginas capturadas',
      '0 páginas omitidas',
      'Pantalla: Celular · 390 px',
      'Scroll horizontal: ninguno',
    ],
    pages: [
      {
        title: 'Forno 27',
        line: 'Pan caliente, hornadas pequeñas, cada día.',
        url: 'forno27.example',
      },
      {
        title: 'Menú',
        line: 'Panes, hojaldres y bizcochos que salen durante el día.',
        url: 'forno27.example/menu',
      },
      {
        title: 'Nosotros',
        line: 'Una receta familiar, ahora en un horno más grande.',
        url: 'forno27.example/nosotros',
      },
      {
        title: 'Contacto',
        line: 'Panadería de demostración: sin dirección ni teléfono.',
        url: 'forno27.example/contacto',
      },
    ],
    visualLabel:
      'Ejemplo con una panadería ficticia: cuatro páginas se capturan una tras otra y van a un ZIP, junto con el informe.',
  },
  sceneLocal: {
    stepLabel: 'Privacidad',
    title: 'Todo pasa en tu computadora.',
    subtitle:
      'La extensión no tiene servidor, no pide registro y no recopila datos. Tus capturas y videos se crean en el navegador y van solo adonde tú los guardes.',
    note: 'Las capturas pueden mostrar lo que haya en pantalla, como correos o paneles con sesión iniciada. Conviene revisarlas antes de compartir.',
    privacyLink: 'Leer la política de privacidad',
    codeLink: 'Ver los permisos en el código',
    whenLabel: 'Cuándo se pide',
    laptopLabel:
      'Ilustración: la ventana, el celular y la tira de capturas de las escenas anteriores quedan dentro del contorno de una laptop.',
    cards: [
      {
        permission: 'storage',
        title: 'Guardar tus preferencias',
        what: 'Guarda kits, favoritos y ajustes en tu propio navegador.',
        when: 'Al instalar',
      },
      {
        permission: 'activeTab + scripting',
        title: 'Usar la pestaña que estás viendo',
        what: 'Al hacer clic en el ícono, la extensión accede solo a la pestaña actual para la captura o para seguir el scroll.',
        when: 'Al instalar, se usa solo cuando haces clic',
      },
      {
        permission: 'acceso por sitio · opcional',
        title: 'Mostrar un sitio en las pantallas',
        what: 'Das permiso sitio por sitio y puedes quitarlo cuando quieras en Ajustes.',
        when: 'En el momento, solo para el sitio que abras',
      },
      {
        permission: 'declarativeNetRequestWithHostAccess',
        title: 'Abrir sitios que bloquean la vista',
        what: 'Muchos sitios no aceptan aparecer dentro de otra página. La extensión lo ajusta solo en sus pantallas, solo en los sitios que permitiste, y lo deshace al cerrar.',
        when: 'Al instalar, actúa solo en sitios permitidos',
      },
      {
        permission: 'offscreen',
        title: 'Armar videos sin trabarse',
        what: 'Una página invisible de la propia extensión arma videos e imágenes mientras sigues usando la ventana.',
        when: 'Al instalar',
      },
      {
        permission: 'tabCapture · opcional',
        title: 'Grabar la pestaña',
        what: 'Necesario para grabar video. Un indicador queda visible todo el tiempo.',
        when: 'Solo en la primera grabación',
      },
      {
        permission: 'clipboardWrite · opcional',
        title: 'Copiar la imagen',
        what: 'Pone la captura en el portapapeles para que la pegues donde quieras.',
        when: 'Solo cuando usas Copiar',
      },
    ],
  },
  sceneOpen: {
    stepLabel: 'Código abierto',
    title: 'Gratis, de código abierto y abierto a quien quiera ayudar.',
    subtitle:
      'Neruz Page View usa la licencia MIT: puedes leer cada línea, reportar un error, sugerir una mejora o adaptarlo a lo que necesites. No hay versión de pago ni plan Pro.',
    ask: 'Si te sirve, una estrella en GitHub ayuda a que más personas lo encuentren.',
    umbrella: 'Es la primera extensión de Neruz Extensions. Vienen más en camino.',
    contribute: 'Cómo contribuir',
    license: 'Licencia MIT',
    codeLabel: 'Fragmento del código SVG que dibuja el símbolo de Neruz Page View',
    outlineWord: 'Neruz Extensions',
  },
  sceneFinal: {
    stepLabel: 'Instalar',
    title: 'Pruébala en el próximo sitio que abras.',
    subtitle:
      'Gratis, sin registro y sin recopilar datos. Si no es para ti, la quitas como cualquier otra extensión.',
    windowTitle: 'Neruz Page View',
    widthLabel: 'Ancho de la ventana',
  },
  ruler: {
    label: 'Ir a la sección',
    counter: 'Escena {n} de {total}',
    scenes: [
      { id: 'inicio', label: 'Mira tu sitio en varias pantallas a la vez.' },
      { id: 'um-clique', label: 'Dos clics y la captura ya está lista para mostrar.' },
      { id: 'role-uma-tela', label: 'Haz scroll en una pantalla. Todas te siguen.' },
      { id: 'pagina-rola-sozinha', label: 'La página se desplaza sola. Tú solo presionas Grabar.' },
      { id: 'site-numa-pasta', label: 'Todo el sitio, en una sola carpeta.' },
      { id: 'tudo-no-computador', label: 'Todo pasa en tu computadora.' },
      { id: 'codigo-aberto', label: 'Gratis, de código abierto y abierto a quien quiera ayudar.' },
      { id: 'instalar', label: 'Pruébala en el próximo sitio que abras.' },
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
    contact: {
      line: 'Panadería de demostración: sin dirección ni teléfono.',
      cards: [
        'Pan caliente, hornadas pequeñas, cada día.',
        'Panes, hojaldres y bizcochos que salen durante el día.',
        'Una receta familiar, ahora en un horno más grande.',
      ],
    },
    footerNote: 'Forno 27 es una panadería ficticia, creada para esta demostración.',
    url: 'forno27.example',
    regionLabel: 'Sitio de demostración ficticio: panadería Forno 27',
  },
};
