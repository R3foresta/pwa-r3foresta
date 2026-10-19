# Guía de construcción frontend

Guía práctica del código actual. Arranque/comandos: [README](README.md). Reglas obligatorias: [AGENTS](AGENTS.md). Dominio: [índice y fuentes](DOMAIN_INDEX.md). Trabajo pendiente: [auditoría](FRONTEND_AUDIT.md).

## Arquitectura y puntos de entrada

| Responsabilidad | Dónde buscar |
| --- | --- |
| Rutas lazy y guards | `src/App.tsx`, `src/routes/` |
| Arranque/proveedores | `src/main.tsx`, `src/contexts/`, `src/layouts/AppLayout.tsx` |
| Features | `src/modules/<feature>/`: pantallas, componentes, hooks, contratos, mappers y utilidades |
| Transporte/casos de uso existentes | `src/api/`, `src/services/`; clientes v1 de perfil/participación dentro del módulo |
| UI compartida | `src/components/ui/`, `src/components/ConfirmDialog.tsx` |
| PWA | `src/pwa/`, `vite.config.ts`, `vercel.json` |

Seguir la estructura real del módulo: hay `screens/` y `pages/`, sin necesidad de renombrar carpetas para uniformarlas. Las rutas usan `React.lazy` con imports directos; Leaflet y sus estilos se cargan donde se usan. Las capas compartidas no deben incorporar reglas de una feature.

## Secuencia para un cambio

1. Leer `package.json`, la pantalla/contrato y sus consumidores; revisar el README del módulo si existe.
2. Si afecta dominio, abrir la fuente concreta del [índice](DOMAIN_INDEX.md). Si falta contrato, pedirlo; no inferir enums/endpoints nuevos.
3. Elegir el cambio mínimo y explicar el plan si abarca varios archivos.
4. Reutilizar UI, hooks y servicios existentes; mantener separados transporte, validación/mapeo y presentación.
5. Verificar el comportamiento afectado y los checks pertinentes. Registrar qué se ejecutó y qué sigue sin acreditar.

## Contratos y datos

- Conservar nombres de campos del backend y separar DTO de valores de formulario/view model cuando aporte claridad. Evitar `any`.
- Usar la configuración de URL existente. No colocar fetch en JSX ni crear otro cliente si el módulo ya resuelve el caso.
- Mantener la atomicidad del endpoint: no dividir un comando o una revisión de plan en varias escrituras.
- Cancelar/descartar respuestas obsoletas al cambiar filtros, persona, cuenta o desmontar. El spinner o botón deshabilitado no garantizan idempotencia.
- Mostrar `loading`, vacío válido, error recuperable y resultado confirmado por separado. Nunca convertir un error de lectura en «sin permisos» o saldo cero.
- Los datos calculados/snapshots son lectura. No recalcular saldo como verdad ni simular persistencia/cierre.
- Perfil y participación v1 validan respuestas en runtime; IDs/revisiones BIGINT son cadenas decimales. No convertirlos a `number`.
- Algunos clientes legados conservan headers de identidad/rol por compatibilidad. No copiarlos a rutas v1 ni retirarlos globalmente sin cotejar backend; esos headers no son fuente de autoridad.

## UI y formularios

UI en español, Tailwind y primitivas de `src/components/ui/`. Componentes enfocados; la pantalla compone y delega datos/validaciones a hooks/servicios. No introducir otra librería UI para resolver un caso cubierto.

- Formularios largos por bloques: datos base, cantidad/unidad, ubicación, evidencia, observaciones y resumen.
- Errores por campo cuando el contrato los ofrece; conservar propuestas ante rechazo o incertidumbre.
- Estados/saldos/restricciones visibles. Diferenciar material en proceso, plantas vivas, campos editables, calculados e historial.
- Antes de una operación definitiva, `ConfirmDialog`: persona/lote, ámbitos/evento, cantidad/unidad si aplica, fecha, responsable, evidencia y consecuencia. Cancelar el diálogo no escribe.
- El diálogo existente contiene foco, admite Escape y devuelve foco al cerrar. Reutilizarlo.
- En evidencias mostrar preview seguro y metadatos recibidos; `bucket`/`ruta_archivo` no son URLs públicas.
- Eventos/movimientos append-only: historial completo, sin editar/borrar; filtros sólo visuales.

## Sesión, rutas y capacidades

`AuthContext` es la fuente de sesión; `useWebAuthn` delega en él. El arranque verifica perfil con Bearer antes de abrir privados. `r3foresta:user` y `auth_id` son datos auxiliares, nunca autoridad.

El perfil visible está ligado al token que lo verificó. Al cambiar token por login, otra pestaña o recuperar foco se oculta la cuenta anterior hasta verificar la nueva. Reconsultar el mismo token no desmonta formularios. Las respuestas tardías no restauran una sesión cerrada ni borran la nueva.

- `ProtectedRoute` verifica sesión y audiencia de navegación; el backend decide cada operación.
- `appAccess.ts` conserva la entrada interna de ADMIN/GENERAL/VALIDADOR. Ser administrador contextual no abre esos módulos.
- Perfil mínimo: nombre. Apellido, documento, wallet y afiliación no deben convertirse en requisitos nuevos de este recorrido.
- `AppLayout` aporta el provider compartido de capacidades. No reemplazar todas las facultades internas por este DTO limitado al recorrido participante.
- `src/modules/impacto/` implementa la consulta pública sin esperar sesión/capacidades; sólo sus acciones montan el provider existente para cuentas verificadas. Mis registros/detalle histórico usan Bearer sin exigir capacidad operativa. Rutas, filtros, paginación y preferencia por cuenta: [módulo Impacto](src/modules/impacto/README.md). Evidencia y límites: [QA INT05](docs/QA_IMPACTO_INT05.md).

## Plan de Plantación

Reutilizar `PlanMetaEspeciesForm`, `usePlanMetaEspeciesForm` y utilidades del módulo. Asistente y detalle conservan su propia carga, autorización, confirmación y persistencia.

- GET/PUT del plan requieren Bearer; no usan `x-auth-id`. Sin token no enviar petición. El detalle ofrece edición a ADMIN global en BORRADOR/ACTIVA.
- Una revisión usa un único PUT con `meta_total_arboles`, `metas`, `revision_esperada`; `plan_revision` procede de GET, incluido `0`. Sin versión no habilitar guardado ni hacer fallback por PATCH.
- Mantener la propuesta exacta al abrir/reconsultar. Cambiar meta o porcentajes usa `buildPlanMetasPayload`; el ajuste de cantidades es explícito. Cantidades/meta enteras positivas hasta `2147483647`; porcentajes en centésimas. Un 0% del borrador se omite del plan remoto; el editor requiere objetivos positivos y retirada explícita.
- 401 pide recuperar sesión, 403 bloquea edición sin inventar autorización y 404 indica recurso no disponible. Un 409 exige consultar y revisar otra vez.
- Red/5xx/confirmación incompleta: consultar antes de otra escritura, conservar propuesta, invalidar la comparación anterior y exigir confirmación nueva. No asumir que no guardó ni reintentar automáticamente.
- Antes de recuperar sesión, el borrador temporal de `sessionStorage` se vincula a subcampaña/`auth_id` verificado. No guarda token/versión para reenviar; sólo se restaura al mismo actor después de consultar el plan.
- Tras éxito actualizar detalle/plan/indicadores/contexto. Si falla esa lectura, informar actualización pendiente; no repetir el PUT confirmado.
- Meta orientativa: el avance puede superar 100%; sólo se limita el ancho de barra. Revisar plan no cambia stock, hechos, estado ni ejecuta el cierre.

Contrato/evidencia y límites: [QA del editor](docs/QA_EDITOR_PLAN_USO.md), `AUD-015` y `AUD-016`.

## Capacidades y comandos de participación

`src/modules/participacion/` centraliza acceso INT06 y registro inicial INT04. `api/participacion.transport.ts` comparte Bearer, `no-store`, cancelación y timeout de 40 s incluido el body; comandos y lecturas operativas verifican actor con capacidades del mismo token. El detalle histórico usa Bearer sin esa dependencia operativa y valida al actor en su respuesta. Multipart deja el boundary al navegador. [Detalle del módulo](src/modules/participacion/README.md).

- Consumir `useParticipacionCapabilities()` dentro del provider de `AppLayout`, sin otro cliente/provider paralelo. Completar paginación antes de publicar selección; distinguir carga, vacío, error y sesión vencida.
- C04–C09: una selección de hasta 100 IDs actuales, revisiones consultadas y confirmación explícita. Cambiar persona/acción/selección/tratamiento invalida revisión, incluso al volver a una selección anterior.
- `useAccessCommand`: un UUID por confirmación, guardado antes del POST con actor/operación/payload. `localStorage` por actor, sin tokens/nombres/búsquedas/fotos. Web Locks coordina pestañas; fallo de almacenamiento, falta de soporte o pendiente incierto bloquean nuevas confirmaciones.
- Timeout/5xx/recibo inválido/GET 202 o 404 tras envío final mantienen resultado no confirmado. Recuperar o reenviar usa exactamente UUID/payload/revisiones originales. Logout/recarga no autorizan otra clave. Inicial admite la excepción 503 `RECHAZADO` durable por `EVALUADOR_NO_DISPONIBLE`, sólo tras validar el recibo completo; una pausa/503 fuera de recibo conserva incertidumbre.
- Sólo un terminal validado acredita éxito/rechazo y permite liberar el intento. El recibo es histórico: después se consultan capacidades/miembros y nuevas revisiones.
- Inicio debe ofrecer recuperar un pendiente propio aunque se pierda la capacidad de gestión; otra cuenta no lo muestra ni recupera.
- `CommandLifecycle`/Web Locks son primitivas compartidas. `useRegistroCommand` adapta `RegistrationCommandController`: preparación/cargas, payload final inmutable y conciliación, reutilizando identidad y exclusión de INT06.
- `registrationDraftStore.ts` guarda campos/fotos/UUID/terminal en IndexedDB privado por actor y subcampaña, sin tokens ni URLs firmadas. Confirmar la transacción local antes de preparar/PUT/POST; fallo de almacenamiento o conflicto entre pestañas bloquea otra escritura. No es outbox offline ni caché pública.
- Registro inicial: `/api/v1/subcampanias/:id/contexto-registro` y participantes seleccionables; preparar/cargar con la misma identidad antes de `POST /plantaciones/iniciales`. PREPARADO/202 sin POST final permite reanudar captura; no acredita guardado. Congelar payload antes del POST; mientras sea incierto bloquear edición/intención nueva. Después de rechazo terminal y revisión explícita, otra intención genera UUID nuevos de comando/carga y vuelve a subir las fotos conservadas. Descartar clausura preparación antes de liberar bytes; no limpiar evidencias por un fallo de red.
- La captura mantiene tres pasos y confirmación final: GPS/manual, fotos propias, cantidades por especie, fecha de servidor, observaciones y participantes opcionales del ámbito. No calcular FIFO/LIFO ni enviar lotes/asignaciones; metas orientativas y saldo elegible del servidor. El detalle propio muestra snapshots y observaciones sólo del autor; fotos elegibles usan `/api/v1/impact/imagenes/:id` sin Bearer.
- Las entradas internas de inicial dirigen al formulario v1; reposición conserva su contrato interno autorizado con `es_reposicion:true`, origen del mismo ámbito y fotos con ámbito explícito. No heredar reposición por permiso contextual. Evidencia/pendientes: [informe INT04](docs/QA_REGISTRO_PARTICIPANTE_INT04.md) e [informe INT05](docs/QA_IMPACTO_INT05.md); esta guía no acredita QA completo, entorno externo ni piloto INT08.

## PWA y verificación

El SW se genera con Workbox en `npm run build`; no versionar `public/sw.js`. Precachear shell/assets no equivale a una outbox. No añadir caché pública de API/recibos ni sync offline sin su contrato.

`registerPwa.ts` controla actualización del shell; el estado de instalación se comparte por `PwaInstallContext`. No duplicar listeners de instalación. Cerrar la sugerencia conserva el acceso del menú; reconciliar instalación después de desinstalar. `sw.js`, HTML y manifest deben revalidarse; sólo assets con hash son inmutables.

```bash
npm run test
npm run lint
npm run build
```

El build incluye TypeScript; no hay script `typecheck`. Los tests coexisten con código en `src/**/*.test.ts(x)` y normalmente simulan servicios/HTTP. Añadir pruebas de comportamiento cuando el cambio lo requiera, no pruebas espejo para texto/estilos reversibles.

Para QA real, seguir el [índice de evidencia](docs/README.md) y el runner correspondiente. Registrar revisión, entorno, actor, peticiones, persistencia y límites. Una captura no demuestra atomicidad, un mock no demuestra autorización y un push no demuestra despliegue. Revisar estado, restricciones, cancelación, error, cuenta cambiada y respuesta perdida según el flujo.
