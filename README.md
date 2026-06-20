# SDC Smart Panel Extremo V5

Sistema privado para SD Comayagua con inventario, catálogo, cotización, ventas, recibos, clientes y administración.

## Cambios V5

- Los botones de cotización ya no abren WhatsApp directamente: ahora copian el mensaje para pegarlo donde corresponda.
- En Comayagua se agregó un campo para escribir el precio del envío local. Ese valor se suma al total del producto sin comisión.
- El mensaje para Comayagua ya no dice que el envío es gratis; muestra productos y, si se escribe, el envío local.
- Para clientes fuera de Comayagua se mantiene:
  - Envío normal: productos + Lps. 110.
  - Pagar al recibir: productos + Lps. 110 + 10% sobre productos + envío.
  - Ambas opciones en un solo mensaje.
- Se cambió el cierre de las cotizaciones por una nota más adecuada sobre producto y envío cotizado.
- El botón WHATSAPP del modal de producto ahora copia el mensaje del producto, no redirige.

## Uso

Abrir `index.html` o subir la carpeta completa a GitHub Pages.


## V6
- Corregido el salto de pantalla al escribir precio del envío local.
- Totales del mensaje más legibles con cantidades, precios y subtotales en negrita.
- Total de Comayagua en renglón separado.
- Los mensajes nuevos ya no usan frases de disponibilidad; solo muestran producto, envío y total.
