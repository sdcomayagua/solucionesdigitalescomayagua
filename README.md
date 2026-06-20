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
- Se quitó la frase “consulta disponibilidad antes de confirmar” y se cambió por una nota más adecuada: precio sujeto al producto y tipo de envío cotizado.
- El botón WHATSAPP del modal de producto ahora copia el mensaje del producto, no redirige.

## Uso

Abrir `index.html` o subir la carpeta completa a GitHub Pages.
