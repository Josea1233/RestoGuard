# RestoGuard

Sistema SaaS para restaurantes, bares, cafeterias y negocios gastronomicos. Esta primera version sigue la idea de INVGUARD: acceso privado, negocios separados, roles, beta controlada y panel Super Admin.

## Que incluye

- Dashboard operativo con ventas, pedidos, ocupacion y alertas.
- Operacion de mesas, barra, pedidos y caja.
- Vista de cocina/barra por estado de comanda.
- Inventario, compras y merma.
- Finanzas con caja, gastos y ganancia estimada.
- Analisis con recomendaciones de compra, merma y promociones.
- Admin para crear negocios, beta 30 dias, usuarios y estados.
- Modo demo local si no hay variables de Supabase.

## Desarrollo

```powershell
npm install
npm run dev
```

## Supabase

1. Crea un proyecto en Supabase.
2. Copia `.env.example` a `.env`.
3. Llena:

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_REQUIRE_AUTH=true
```

4. Ejecuta `supabase/restoguard.sql` en Supabase SQL Editor.
5. Crea tu usuario en Supabase Auth.
6. Haz tu cuenta Super Admin:

```sql
insert into public.app_admins (user_id, email)
select id, email
from auth.users
where lower(email) = lower('TU_CORREO_AQUI')
on conflict (user_id) do update set email = excluded.email;
```

## Flujo comercial recomendado

1. Consigues un restaurante, bar o cafeteria interesado.
2. Creas el usuario del cliente en Supabase Auth.
3. En RestoGuard entras como Super Admin.
4. Creas el negocio con beta de 30 dias.
5. Asignas usuarios por rol: ADMIN, CAJA, MOZO, COCINA o BARRA.
6. Si paga, cambias el negocio a ACTIVO; si no, a SUSPENDIDO.

## Scripts

```powershell
npm run lint
npm run build
npm run start
```
