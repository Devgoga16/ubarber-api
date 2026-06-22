# ubarber-api

## Arrancar en local
1. `cp .env.example .env` y completa `MONGO_URI` (Mongo local o Atlas) y `JWT_SECRET`.
2. `npm install`
3. `npm run dev` — levanta en `http://localhost:4000`, healthcheck en `GET /api/health`.

## Crear el primer Super Admin
```
npm run seed:admin -- correo@ejemplo.com unaPasswordSegura "Nombre Apellido"
```

## Flujo para probar todo el MVP end-to-end
1. Login como super admin: `POST /api/auth/login`.
2. Crear un Plan: `POST /api/admin/plans`.
3. Crear un Negocio (crea Business + Owner + Subscription en trial): `POST /api/admin/businesses`.
4. Login como Owner del negocio creado.
5. Crear sede: `POST /api/business/locations`.
6. Crear servicio: `POST /api/business/services`.
7. Crear barbero: `POST /api/business/barbers`.
8. Crear cliente: `POST /api/business/clients`.
9. Crear cita: `POST /api/business/appointments`.

## Notas
- Todas las rutas de `/api/business/*` están bloqueadas si la suscripción del negocio no está en `trial` o `active` (ver `subscriptionGate`).
- El Super Admin gestiona suscripciones manualmente: cambiar plan, cambiar estado, registrar pago — bajo `/api/admin/businesses/:businessId/subscription/*`.
