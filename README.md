# La Artesanal

Base inicial para una plataforma web de ventas y operacion para `La Artesanal`, compatible con `Cloudflare Pages` y `Supabase`.

## Incluye

- Landing publica con branding artesanal basado en el nuevo logo.
- Catalogo publico con mas de 30 sabores.
- Precios por perfil comercial `mayorista` y `minorista`.
- Login preparado para `email/password` y `Google` con Supabase.
- Pedido rapido y formulario de contacto listos para persistir en Supabase.
- Panel admin demo con indicadores, mapa Leaflet y grafica.
- SQL de esquema y seed inicial en [`supabase/schema.sql`](/C:/Proyectos/67.-Paletas/supabase/schema.sql) y [`supabase/seed.sql`](/C:/Proyectos/67.-Paletas/supabase/seed.sql).

## Estructura

- [`index.html`](/C:/Proyectos/67.-Paletas/index.html): app principal.
- [`qr.html`](/C:/Proyectos/67.-Paletas/qr.html): landing para QR.
- [`css/styles.css`](/C:/Proyectos/67.-Paletas/css/styles.css): sistema visual y responsive.
- [`js/config.js`](/C:/Proyectos/67.-Paletas/js/config.js): configuracion local.
- [`js/catalog.js`](/C:/Proyectos/67.-Paletas/js/catalog.js): catalogo y datos demo.
- [`js/supabase.js`](/C:/Proyectos/67.-Paletas/js/supabase.js): cliente Supabase.
- [`js/app.js`](/C:/Proyectos/67.-Paletas/js/app.js): logica de UI.

## Activar Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta el contenido de [`supabase/schema.sql`](/C:/Proyectos/67.-Paletas/supabase/schema.sql).
3. Ejecuta luego [`supabase/seed.sql`](/C:/Proyectos/67.-Paletas/supabase/seed.sql).
4. Edita [`js/config.js`](/C:/Proyectos/67.-Paletas/js/config.js) con:
   - `supabaseUrl`
   - `supabaseAnonKey`
   - telefono, correo y WhatsApp reales
5. En Supabase Auth activa:
   - Email/Password
   - Google
6. Configura la URL del sitio y redirect URL al dominio donde quedara en Cloudflare Pages.

## Despliegue en Cloudflare Pages

No requiere build. Puedes publicar directamente este directorio como sitio estatico.

- Build command: vacio
- Build output directory: `/`

## Siguiente paso recomendado

- conectar el panel admin a tablas reales de pedidos, stock y pagos
- separar vistas por rol
- mover formularios a Edge Functions o Workers para correo y validaciones
