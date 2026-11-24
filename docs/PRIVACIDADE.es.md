# Política de Privacidad (borrador técnico en español)

> BORRADOR. Revisar con un abogado antes de publicar (revisar com advogado). No constituye asesoría legal.
> Traducido de docs/PRIVACIDADE.md. Las afirmaciones deben ser idénticas en pt-BR, en y es. No citar leyes específicas además de las que valide el abogado.
> Los campos entre corchetes son pendientes de Bruno.

**Neruz Page View** · Última actualización: 23 de noviembre de 2026

## Resumen
Neruz Page View funciona en tu dispositivo. No tenemos un servidor propio para la extensión, no creamos cuentas y no recibimos los sitios que ves, su contenido ni las capturas que haces. La extensión envía estadísticas anónimas de uso a Google Analytics 4, que puedes desactivar (sección "Estadísticas anónimas de uso").

## A qué accede la extensión
Para funcionar, la extensión accede, en tu navegador y solo cuando tú lo pides, a:
- las páginas que abres para ver en varias pantallas, incluido el contenido que muestran, para reflejar el desplazamiento, los clics y lo que escribes, y para capturarlas;
- las direcciones que indicas (una por una, en lista, desde un sitemap o desde los enlaces internos de una página);
- tus ajustes (kits, favoritos, pantallas personalizadas, preferencias).

## Dónde quedan los datos
- Ajustes: en el almacenamiento local de tu navegador. Se quedan ahí hasta que los borres o quites la extensión.
- Capturas (imágenes, videos, mockups, informes): se generan en tu dispositivo y se guardan donde tú elijas. Los archivos temporales se descartan después de exportar o al cerrar la extensión.
- La extensión no nos envía nada de esto a nosotros ni a terceros. Lo único que sale son las estadísticas anónimas de uso descritas abajo.

Cuando ves un sitio, tu navegador hace solicitudes a ese sitio, igual que en una visita normal. El sitio visitado puede registrar el acceso según su propia política.

## Capturas y datos de terceros
Las capturas pueden mostrar información personal de otras personas que esté visible en pantalla (por ejemplo, nombres o correos en un panel). Tú decides qué capturar, guardar y compartir, y eres responsable de ese material. Te recomendamos revisar el contenido antes de compartirlo.

## Permisos del navegador
La extensión pide permisos amplios porque puedes ver cualquier sitio. Se usan solo para mostrar, reflejar y capturar las páginas que elijas. La extensión modifica temporalmente encabezados de seguridad únicamente en sus propias pantallas de visualización, para que los sitios puedan aparecer dentro de marcos, y quita ese cambio al cerrarse. No usamos estos permisos para recopilar el historial de navegación.

Solo dentro de las pantallas del Estudio, y únicamente en los sitios a los que hayas dado acceso, la extensión inyecta un pequeño script que ajusta la identificación del dispositivo simulado (cómo se presenta el navegador ante el sitio) y la preferencia de "reducir movimiento", para que el sitio se vea como se vería en ese dispositivo. Solo funciona cuando recibe, mediante el nombre de la propia pantalla, el código del dispositivo simulado (por ejemplo, el tamaño de pantalla elegido); sin ese código, no hace nada. Ese código no contiene datos personales, pero el sitio mostrado puede leerlo. El script no lee ni envía datos, no recibe ni manda mensajes y no usa funciones de la extensión. Se activa cuando abres el Estudio y se elimina cuando lo cierras, y no actúa en las pestañas normales del navegador.

## Estadísticas anónimas de uso
La extensión envía estadísticas anónimas de uso a Google Analytics 4 (Google LLC), en una propiedad de Fonte Dev. La finalidad es saber qué herramientas se usan, para priorizar mejoras.

Qué se envía:
- un identificador aleatorio, generado al instalar y guardado solo en tu navegador;
- un identificador de sesión;
- el nombre y la versión de la extensión;
- eventos de uso: instalación o actualización, apertura del popup, del Estudio o de las opciones, y qué herramienta o acción se usó, por categoría (por ejemplo, el tipo de captura o el formato de exportación).

Qué no se envía: la dirección o el dominio de las páginas que ves, su contenido, las capturas, textos copiados, nombre o correo. Google Analytics 4 no registra ni almacena direcciones IP.

El envío va directo de la extensión a Google. No usa cookies ni scripts remotos, y no pasa por un servidor nuestro. No se vende nada ni se usa para publicidad. Google trata los datos según su propia política y puede procesarlos fuera de Brasil.

Cómo controlarlo:
- Chrome, Edge, Opera y Brave: el envío viene activado. Para desactivarlo, abre las opciones de la extensión y desmarca "Enviar estadísticas anónimas de uso".
- Firefox: la extensión solo envía si aceptas el permiso opcional de datos técnicos y de interacción. Puedes activarlo o desactivarlo en las opciones de la extensión y en los ajustes de permisos de Firefox.

Base legal: interés legítimo de Fonte Dev en entender y mejorar el producto, con la opción de desactivarlo.

## Rastreo
La extensión no contiene anuncios, rastreadores de terceros ni código remoto. La única medición es la estadística anónima descrita arriba.

## Sitio web (landing page)
- El sitio tiene su propia política en https://pageview.neruz.tech/es/privacy/ . La medición del sitio (Google Analytics 4 y Meta Pixel) solo se carga si la aceptas en el aviso de cookies.
- El proveedor de alojamiento del sitio guarda registros técnicos de acceso (como dirección IP, fecha y página) por motivos de seguridad y operación, a cargo del proveedor de alojamiento (Hostinger).
- El sitio puede guardar en tu navegador tu preferencia de idioma, solo para funcionar como elegiste.
- Los enlaces a las tiendas de extensiones y a GitHub llevan a servicios de terceros, que tienen sus propias políticas.

## Código abierto
El código es abierto bajo licencia MIT en https://github.com/brunolucassf/neruz-page-view, así que puedes revisar cómo funciona la extensión.

## Tus derechos
No guardamos tu nombre, correo ni cuenta. Lo que existe es el identificador aleatorio de las estadísticas de uso, que por sí solo no dice quién eres. Puedes desactivar el envío en las opciones y borrar los datos locales en cualquier momento, quitando la extensión o limpiando sus datos en el navegador. Quitar la extensión borra el identificador guardado en tu navegador. Para dudas, o solicitudes relacionadas con los registros del sitio, escribe a contato@fontedev.com. Si estás en Brasil, también puedes acudir a la Autoridad Nacional de Protección de Datos (ANPD).

## Menores
La extensión es una herramienta de trabajo de uso general y no está dirigida a menores.

## Cambios
Esta actualización incluye las estadísticas anónimas de uso, que antes no existían. Si la extensión empieza a tratar datos de otra forma, actualizaremos esta política antes de que ocurra e indicaremos la fecha de actualización. Los cambios de este tipo también siguen las reglas de las tiendas.

## Responsable
Bruno Lucas (Fonte Dev) · contato@fontedev.com
Desarrollado por Fonte Dev · Bruno Lucas (https://fontedev.com)
