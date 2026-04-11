create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'operador', 'caja', 'cliente');
create type public.commercial_profile as enum ('mayorista', 'minorista');
create type public.order_status as enum ('nuevo', 'confirmado', 'en_surtido', 'parcial', 'entregado', 'cancelado');
create type public.payment_method as enum ('efectivo', 'transferencia', 'tarjeta');

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    phone text,
    role public.app_role not null default 'cliente',
    commercial_profile public.commercial_profile not null default 'minorista',
    organization_name text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.price_lists (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    commercial_profile public.commercial_profile not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.products (
    id bigint generated always as identity primary key,
    name text not null,
    category text not null,
    description text,
    sku text unique,
    unit text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.product_prices (
    id uuid primary key default gen_random_uuid(),
    product_id bigint not null references public.products(id) on delete cascade,
    price_list_id uuid not null references public.price_lists(id) on delete cascade,
    amount numeric(10,2) not null check (amount >= 0),
    currency text not null default 'MXN',
    active boolean not null default true,
    valid_from date not null default current_date,
    unique (product_id, price_list_id, valid_from)
);

create table if not exists public.inventory_locations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    location_type text not null,
    address text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    created_at timestamptz not null default now()
);

create table if not exists public.inventory_stock (
    id uuid primary key default gen_random_uuid(),
    location_id uuid not null references public.inventory_locations(id) on delete cascade,
    product_id bigint not null references public.products(id) on delete cascade,
    stock numeric(10,2) not null default 0,
    minimum_stock numeric(10,2) not null default 0,
    unique (location_id, product_id)
);

create table if not exists public.wholesale_orders (
    id uuid primary key default gen_random_uuid(),
    customer_name text not null,
    phone text not null,
    email text,
    commercial_profile public.commercial_profile not null default 'mayorista',
    status public.order_status not null default 'nuevo',
    notes text,
    items jsonb not null default '[]'::jsonb,
    created_by uuid references public.profiles(id),
    created_at timestamptz not null default now()
);

create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    order_id uuid references public.wholesale_orders(id) on delete set null,
    profile_id uuid references public.profiles(id) on delete set null,
    amount numeric(10,2) not null check (amount >= 0),
    method public.payment_method not null,
    reference text,
    received_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    business_name text,
    email text not null,
    message text not null,
    source text not null default 'web',
    created_at timestamptz not null default now()
);

create table if not exists public.branding_settings (
    id uuid primary key default gen_random_uuid(),
    brand_name text not null default 'La Artesanal',
    logo_url text,
    qr_url text,
    phone text,
    email text,
    address text,
    primary_color text default '#b1306b',
    secondary_color text default '#2d6680',
    accent_color text default '#5b3822',
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.price_lists enable row level security;
alter table public.products enable row level security;
alter table public.product_prices enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.wholesale_orders enable row level security;
alter table public.payments enable row level security;
alter table public.contact_messages enable row level security;
alter table public.branding_settings enable row level security;

create policy "Public can read catalog" on public.products
for select using (is_active = true);

create policy "Public can read active price lists" on public.price_lists
for select using (is_active = true);

create policy "Authenticated can read prices" on public.product_prices
for select to authenticated using (active = true);

create policy "Users can read own profile" on public.profiles
for select to authenticated using (auth.uid() = id);

create policy "Users can insert own order" on public.wholesale_orders
for insert to anon, authenticated with check (true);

create policy "Users can send contact messages" on public.contact_messages
for insert to anon, authenticated with check (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, role, commercial_profile)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
        coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'cliente'),
        coalesce((new.raw_user_meta_data ->> 'commercial_profile')::public.commercial_profile, 'minorista')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
