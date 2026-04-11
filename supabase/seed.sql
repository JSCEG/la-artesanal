insert into public.price_lists (code, name, commercial_profile)
values
    ('minorista', 'Lista Minorista', 'minorista'),
    ('mayorista', 'Lista Mayorista', 'mayorista')
on conflict (code) do nothing;

insert into public.products (name, category, description, sku, unit)
values
    ('Paleta Tamarindo', 'Paletas', 'Acido, dulce y muy antojable.', 'PAL-001', 'pieza'),
    ('Paleta Mango', 'Paletas', 'Mango natural con textura fresca.', 'PAL-002', 'pieza'),
    ('Paleta Fresa Crema', 'Paletas', 'Fresa suave con toque cremoso.', 'PAL-003', 'pieza'),
    ('Paleta Coco', 'Paletas', 'Coco rayado y base cremosa.', 'PAL-004', 'pieza'),
    ('Paleta Limon', 'Paletas', 'Citrica y refrescante.', 'PAL-005', 'pieza'),
    ('Paleta Jamaica', 'Paletas', 'Flor de jamaica con color intenso.', 'PAL-006', 'pieza'),
    ('Paleta Guayaba', 'Paletas', 'Sabor casero con fruta real.', 'PAL-007', 'pieza'),
    ('Paleta Rompope', 'Paletas', 'Cremosa y tradicional.', 'PAL-008', 'pieza'),
    ('Paleta Chicle', 'Paletas', 'Colorida y favorita de ninos.', 'PAL-009', 'pieza'),
    ('Paleta Mazapan', 'Paletas', 'Cacahuate dulce de sabor intenso.', 'PAL-010', 'pieza'),
    ('Paleta Pina Chile', 'Paletas', 'Fruta tropical con toque picosito.', 'PAL-011', 'pieza'),
    ('Paleta Frutos Rojos', 'Paletas', 'Mezcla vibrante y muy fresca.', 'PAL-012', 'pieza'),
    ('Nieve Limon', 'Nieves', 'Ligera, acida y super fresca.', 'NIE-001', 'vaso'),
    ('Nieve Fresa', 'Nieves', 'Fruta natural y color vivo.', 'NIE-002', 'vaso'),
    ('Nieve Mamey', 'Nieves', 'Cremosa y muy mexicana.', 'NIE-003', 'vaso'),
    ('Nieve Guanabana', 'Nieves', 'Suave y perfumada.', 'NIE-004', 'vaso'),
    ('Nieve Zarzamora', 'Nieves', 'Profunda y frutal.', 'NIE-005', 'vaso'),
    ('Nieve Maracuya', 'Nieves', 'Citrica con aroma tropical.', 'NIE-006', 'vaso'),
    ('Nieve Cafe de Olla', 'Nieves', 'Canela, piloncillo y cafe.', 'NIE-007', 'vaso'),
    ('Nieve Vainilla', 'Nieves', 'Base cremosa y elegante.', 'NIE-008', 'vaso'),
    ('Nieve Chocolate Abuelita', 'Nieves', 'Chocolate mexicano con especias.', 'NIE-009', 'vaso'),
    ('Nieve Nuez', 'Nieves', 'Textura suave con nuez troceada.', 'NIE-010', 'vaso'),
    ('Nieve Coco', 'Nieves', 'Tropical y cremosa.', 'NIE-011', 'vaso'),
    ('Nieve Mango', 'Nieves', 'Mango natural muy fresco.', 'NIE-012', 'vaso'),
    ('Litro Fresa', 'Litros', 'Ideal para familia o mesa de postres.', 'LIT-001', 'litro'),
    ('Litro Limon', 'Litros', 'Refrescante y rendidor.', 'LIT-002', 'litro'),
    ('Litro Vainilla', 'Litros', 'Cremoso y versatil.', 'LIT-003', 'litro'),
    ('Litro Chocolate', 'Litros', 'Intenso y muy pedido.', 'LIT-004', 'litro'),
    ('Litro Nuez', 'Litros', 'Perfil premium.', 'LIT-005', 'litro'),
    ('Litro Mamey', 'Litros', 'Tradicion total.', 'LIT-006', 'litro'),
    ('Cafe Americano', 'Cafe', 'Caliente, directo y aromatico.', 'CAF-001', 'taza'),
    ('Cafe de Olla', 'Cafe', 'Con piloncillo y canela.', 'CAF-002', 'taza'),
    ('Cafe Latte', 'Cafe', 'Espuma suave y sabor equilibrado.', 'CAF-003', 'taza'),
    ('Capuchino', 'Cafe', 'Cremoso y perfumado.', 'CAF-004', 'taza'),
    ('Chocolate Caliente', 'Cafe', 'Para acompanar temporada fria.', 'CAF-005', 'taza'),
    ('Affogato Artesanal', 'Cafe', 'Cafe con nieve de vainilla.', 'CAF-006', 'taza')
on conflict (sku) do nothing;

insert into public.product_prices (product_id, price_list_id, amount)
select
    p.id,
    l.id,
    case
        when l.code = 'minorista' then
            case p.sku
                when 'PAL-001' then 28 when 'PAL-002' then 28 when 'PAL-003' then 30 when 'PAL-004' then 30
                when 'PAL-005' then 27 when 'PAL-006' then 28 when 'PAL-007' then 29 when 'PAL-008' then 31
                when 'PAL-009' then 27 when 'PAL-010' then 31 when 'PAL-011' then 29 when 'PAL-012' then 30
                when 'NIE-001' then 48 when 'NIE-002' then 50 when 'NIE-003' then 52 when 'NIE-004' then 53
                when 'NIE-005' then 53 when 'NIE-006' then 54 when 'NIE-007' then 56 when 'NIE-008' then 50
                when 'NIE-009' then 56 when 'NIE-010' then 56 when 'NIE-011' then 52 when 'NIE-012' then 50
                when 'LIT-001' then 190 when 'LIT-002' then 182 when 'LIT-003' then 198 when 'LIT-004' then 205
                when 'LIT-005' then 210 when 'LIT-006' then 204
                when 'CAF-001' then 38 when 'CAF-002' then 44 when 'CAF-003' then 54
                when 'CAF-004' then 56 when 'CAF-005' then 55 when 'CAF-006' then 68
            end
        else
            case p.sku
                when 'PAL-001' then 19 when 'PAL-002' then 19 when 'PAL-003' then 21 when 'PAL-004' then 21
                when 'PAL-005' then 18 when 'PAL-006' then 19 when 'PAL-007' then 20 when 'PAL-008' then 22
                when 'PAL-009' then 18 when 'PAL-010' then 22 when 'PAL-011' then 20 when 'PAL-012' then 21
                when 'NIE-001' then 36 when 'NIE-002' then 37 when 'NIE-003' then 39 when 'NIE-004' then 40
                when 'NIE-005' then 40 when 'NIE-006' then 41 when 'NIE-007' then 42 when 'NIE-008' then 37
                when 'NIE-009' then 42 when 'NIE-010' then 43 when 'NIE-011' then 39 when 'NIE-012' then 37
                when 'LIT-001' then 156 when 'LIT-002' then 148 when 'LIT-003' then 160 when 'LIT-004' then 168
                when 'LIT-005' then 174 when 'LIT-006' then 166
                when 'CAF-001' then 30 when 'CAF-002' then 34 when 'CAF-003' then 42
                when 'CAF-004' then 44 when 'CAF-005' then 43 when 'CAF-006' then 54
            end
    end
from public.products p
cross join public.price_lists l
where not exists (
    select 1
    from public.product_prices pp
    where pp.product_id = p.id
      and pp.price_list_id = l.id
      and pp.valid_from = current_date
);

insert into public.branding_settings (brand_name, logo_url, qr_url, phone, email, address)
values (
    'La Artesanal',
    '/assets/logo-artesanal.png',
    '/qr.html',
    '+52 5512345678',
    'hola@laartesanal.mx',
    'Sucursal principal por definir'
)
on conflict do nothing;
