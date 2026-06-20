# SDC Smart Panel Extremo V3

Sistema privado para SD Comayagua: inventario, catálogo, cotizaciones, ventas, recibos, clientes y administración de productos.

## Cambios V3

- Se quitaron los datos del cliente en Cotizar.
- La cotización ahora solo pide la ubicación: Comayagua o Fuera de Comayagua.
- En Comayagua muestra solo el total de productos, sin envío.
- Fuera de Comayagua muestra dos opciones:
  - Depósito / envío normal = productos + Lps. 110.
  - Pagar al recibir = productos + Lps. 110 + 10% sobre la suma de productos + envío.
- Se agregó botón **Actualizar Firebase** en Admin.
- Las categorías del catálogo ya no aparecen abiertas de un solo. Ahora se muestran al tocar el botón **Categorías** y se cierran al seleccionar una.
- Mejoras visuales en móvil para que el catálogo no obligue a bajar demasiado antes de ver productos.

## Uso

Abre `index.html` o sube la carpeta completa a GitHub Pages.

Los cambios locales se guardan en el navegador con localStorage. El botón de Firebase intenta subir el inventario usando `js/sdc-firebase.js`; si no actualiza, revisa conexión, permisos/reglas de Firestore o configuración de Firebase.
