# T5 · iteración 2 · alta de plantas y recuperación propia

Entrega local del 15 de noviembre de 2026 sobre frontend `7730675`. Sólo iteración 2; la procedencia M3 y la extensión del timeline quedan reservadas a la iteración 3 después de revisión coordinadora. Sin push, altas reales, cambios propios en backend, Supabase, Storage, variables de entorno, dependencias o lockfile.

## Fuentes y corte de backend

Se cotejaron DTO, controller, servicios y migración 102 sobre `69545ed`, más el cierre local backend `3cb82e4` y [contrato de integración del 15](../../Backend-r3foresta/docs/t5-integracion-backend-2026-11-15.md). Las rutas y payloads T5 101–108 se mantienen. El nuevo contrato exige ADMIN global actual para nueva alta, subida y consulta de fotos pendientes; recuperación de resultado propio y replay idéntico de un CONFIRMADO sólo necesitan la cuenta activa y la autoría original.

**109/110 no se aplicaron remotamente en esta entrega.** El informe backend los deja pendientes de corte: 109 cierra ADMIN en SQL y 110 añade procedencia administrativa. La UI ADMIN y los mocks no acreditan esa restricción en el destino; 101–108 todavía permiten GENERAL/VALIDADOR con M2 para nuevas altas. No reaplicar migraciones antiguas ni tratar el bucket privado como ausente. La aplicación 101–108 y el ensayo de 17 checks pertenecen al informe backend anterior y no se repitieron aquí.

## Comportamiento implementado

- Menú de tres puntos en encabezado de Vivero para ADMIN con «Recibir y validar material», «Material de origen y desecho» e «Incorporar plantas». El CTA ordinario de lote desde Recolección y los accesos/rutas vigentes de recepción de VALIDADOR, incluido Inicio sin M1, se conservan.
- `/app/vivero/incorporaciones` vive fuera del gate M2 y tiene excepción concreta de audiencia en `appAccess`. Nuevas operaciones requieren ADMIN verificado en la sesión y lectura actual de acceso. La recuperación propia monta sin rol interno ni permiso M2. Inicio interno y participante ofrecen una entrada si hay un intento conservado o un fallo al comprobarlo; una cuenta diferente no ve el intento anterior.
- Formulario por bloques con PlantSelector, selección/tarjeta de vivero, CantidadInputCard, FechaCard, ObservacionesCard, SectionCard, PhotoUploader y barra de acción existentes. No hay otro wizard ni librería. PlantSelector admite IDs string sin alterar los consumidores numéricos; se añadieron nombres accesibles a cantidad/fecha/observaciones compartidas.
- RECEPCION sólo COMPRA/DONACION; SALDO_INICIAL también PRODUCCION_PROPIA/DESCONOCIDA. Desconocida exige observaciones. Cantidad entera 1..2147483647, UNIDAD fija implícita; no se envía unidad ni se fabrican INICIO/EMBOLSADO. Fecha estricta DATE hoy−10..hoy, ambos extremos incluidos, en America/La_Paz. Tercero/referencia hasta 200, observaciones hasta 1000. Se registra el conteo actual y sus antecedentes, sin inventar compras/pérdidas anteriores.
- Entre 1 y 5 fotos originales JPEG/PNG/WebP/HEIC/HEIF de hasta 15 MiB; sin compresión/conversión. El formulario explica que no se suben facturas/documentos sensibles. Selección, subida, recuperación y confirmación son estados distintos. Antes del POST de alta, ConfirmDialog muestra especie, vivero, modalidad/procedencia, cantidad/unidad, fecha, responsable, evidencia y efecto. Cancelar el diálogo no escribe.
- La API específica usa Bearer capturado ligado al actor, `no-store`, cancelación y espera de 40 segundos que cubre cabeceras/body. No usa rutas `../`, endpoints genéricos de evidencia, headers de identidad/rol, tokens en DOM ni URLs públicas del bucket privado. Recibos y respuestas se validan en runtime con IDs exactos y cotejo de intención completa; los saldos del recibo son iniciales históricos, no actuales.

## Intento durable y recuperación

El esquema `IntentoIncorporacion` versión 1 se guarda por actor en IndexedDB `r3foresta-vivero-t5`. Conserva UUID, base, etiquetas de revisión, File originales, referencias de evidencia y fase **local**; no inventa estados backend PREPARADO/RECHAZADO. Un fallo de almacenamiento o Web Locks impide efectos nuevos. El GET del resultado propio sigue permitido sin Web Locks; en ese caso sólo se muestra el recibo, sin modificar almacenamiento ni habilitar escrituras.

1. Al preparar, se toma un Web Lock por actor, comprueba el slot de esa cuenta y guarda UUID/intención/bytes antes de la primera subida. El UUID no se sustituye por timeout ni por respuesta ilegible. Dos pestañas no preparan intenciones nuevas simultáneas para el mismo slot.
2. Antes del multipart se conserva `FOTOS_POR_CONSULTAR`. Una respuesta perdida mantiene los bytes y el contexto. La recuperación consulta primero el resultado del alta; sólo si no confirmó y hay ADMIN actual consulta las pendientes del mismo UUID/vivero. No vuelve a subir automáticamente.
3. Si se recupera exactamente el conjunto esperado, sus IDs se fijan y el resumen queda listo para confirmación. La firma/TTL y metadatos recibidos se muestran sólo en memoria; fechas/pesos ausentes permanecen no disponibles. Los originales locales pueden previsualizarse después de recarga. Las URLs blob se liberan al desmontar/quitar fotos.
4. Sólo tras confirmación explícita se conserva `ALTA_POR_CONSULTAR` con cuerpo/IDs exactos antes del POST. A partir de ese punto no se libera/cambia el UUID, base, archivos o evidencias por un rechazo, conflicto, ausencia o incertidumbre. La recuperación de SIN_RESULTADO no acredita rollback: exige consulta y, con ADMIN actual, reenvío expreso del mismo cuerpo/clave; vuelve a consultar justo antes del replay.
5. Un recibo CONFIRMADO se coteja con la intención original, se muestra como éxito y se persiste sin firmas ni bytes innecesarios. Si falla la persistencia posterior, el éxito conocido permanece visible incluso al releer el intento local; no se repite el alta. Una confirmación propia sigue recuperable tras perder ADMIN/M2. Sólo reconocer un confirmado libera su slot para otro ingreso.
6. Antes de cualquier posible POST de alta puede descartarse expresamente **sólo la preparación local** para corregirla. Se advierte que esto no borra fotos remotas. Después del posible POST esa acción desaparece y el store la rechaza. No hay DELETE/cancelación remota de fotos T5 ni limpieza ficticia.

La señal entre pestañas sólo conserva una revisión numérica, sin intención/fotos/Bearer/firmas. CAS de revisión bajo Web Lock impide sobrescribir otro intento. Cambiar cuenta, token o permisos desmonta la vista/controlador, cancela lecturas y descarta respuestas tardías, conservando el intento durable de la cuenta original.

## Límites deliberados y aceptación pendiente

- La subida de fotos no es idempotente en backend: una repetición puede crear otros objetos. Si una consulta no recupera pendientes, la UI advierte que no demuestra rollback y ofrece repetir **expresamente las mismas fotos**, consultando otra vez primero. Un conjunto recuperado incompatible no se adopta ni se convierte en otra intención. No hay endpoint para certificar que no quedaron huérfanas ni para borrarlas.
- Un rechazo HTTP400/422 con body válido se comunica como explícito, distinto de timeout/503/409/body ilegible. No se persiste un terminal de rechazo. El intento que pudo llegar al alta queda congelado; no se implementa un motor de correcciones/anulación fuera del contrato aprobado.
- Los intentos preparados cuya fecha envejece fuera de ventana no llegan al POST nuevo. El operador puede descartar únicamente esa preparación local. Una intención cuyo alta ya pudo enviarse conserva fecha/body para consultar/replay histórico; no se reescribe con la fecha actual.
- El catálogo se carga por todas las páginas del endpoint existente, manteniendo IDs seguros/exactos; no se interpreta una sola página como búsqueda global. Fallo, carga y vacío están diferenciados; no se consultan catálogos internos en la recuperación sin ADMIN.
- Recuperación durable cubre el mismo dispositivo con almacenamiento conservado. Borrar datos del navegador elimina esa copia; no se inventa una lista backend de solicitudes propias ni una sincronización entre dispositivos.
- Se intentó revisar el navegador local, pero el inventario informó que el acceso no está disponible para este chat. No se acredita UI visual autenticada, tamaño móvil, IndexedDB/Web Locks nativos, decodificación HEIC ni operaciones reales. Los ensayos automatizados usan HTTP/Storage inyectados y datos sintéticos. Sin reinicios de servicios ajenos ni extracción de credenciales.
- Se aplicó la revisión `vercel:react-best-practices` a los TSX: efectos con cleanup, catálogo independiente en paralelo, ruta lazy, estados ligados al ámbito, entradas nativas accesibles y UI compartida. No se agregaron librerías.

## Verificación

Node `v24.19.0`, npm del lockfile existente. No existe typecheck separado: build incluye `tsc -b`.

Verificación final sobre el código entregado:

| Comando | Resultado |
| --- | --- |
| `npm run test -- src/modules/vivero/incorporacion --maxWorkers=2` | 5 archivos / 63 pruebas aprobadas. |
| `npm run test -- --maxWorkers=2` | 106 archivos / 1.467 pruebas aprobadas, 103,12 s. |
| `npm run lint` | Aprobado, sin errores. |
| `npm run build` | TypeScript, Vite y PWA aprobados; 164 entradas de precache. Aviso conocido del chunk MapLibre de 1.066,75 kB. |
| `git diff --check` | Aprobado, sin errores de whitespace. |

Las 63 pruebas nuevas cubren contrato y DTO, transporte, persistencia y concurrencia, recuperación sin Web Locks, fecha preparada envejecida, aislamiento de cuenta/sesión, respuestas perdidas, confirmación explícita, rechazo de fotos separado del alta y éxito remoto con fallo local posterior. Son pruebas con datos sintéticos e interfaces inyectadas; no sustituyen la aceptación pendiente descrita arriba.

La primera compilación identificó constructores con parameter properties incompatibles con `erasableSyntaxOnly`; se cambiaron por campos explícitos. Lint encontró un efecto de preview que actualizaba estado sincrónicamente y expiración calculada durante render: se movieron URLs a efectos DOM con cleanup y expiración al momento de lectura. Una prueba de tamaño de foto redefinía una propiedad no configurable y otra usaba una consulta de input ambigua; se corrigieron. No se presentan esas ejecuciones iniciales como aprobadas.

## Reserva de iteración 3

No se integró `procedencia-propia`/`procedencia-administrativa`, la ficha de registro de Plantación, vínculos M2→M3 ni la nueva paginación/completitud del timeline. El backend `3cb82e4` documenta el contrato de esa entrega; debe revisarse e implementarse en un commit separado tras aprobar esta iteración. Impacto público conserva su audiencia y su contrato.

## Archivos de esta entrega

```text
DOMAIN_INDEX.md
FRONTEND_AUDIT.md
FRONTEND_GUIDE.md
docs/README.md
docs/QA_T5_ITERACION_2.md
src/App.tsx
src/modules/home/HomeScreen.tsx
src/modules/home/ParticipantHomeScreen.tsx
src/modules/plantas/components/PlantSelector.tsx
src/modules/vivero/README.md
src/modules/vivero/components/ViveroAdminMenu.tsx
src/modules/vivero/components/event/CantidadInputCard.tsx
src/modules/vivero/components/event/FechaCard.tsx
src/modules/vivero/components/event/ObservacionesCard.tsx
src/modules/vivero/incorporacion/IncorporacionEntry.tsx
src/modules/vivero/incorporacion/IncorporacionForm.tsx
src/modules/vivero/incorporacion/IncorporacionResumen.tsx
src/modules/vivero/incorporacion/IncorporacionScreen.test.tsx
src/modules/vivero/incorporacion/IncorporacionScreen.tsx
src/modules/vivero/incorporacion/incorporacion.api.test.ts
src/modules/vivero/incorporacion/incorporacion.api.ts
src/modules/vivero/incorporacion/incorporacion.contract.test.ts
src/modules/vivero/incorporacion/incorporacion.contract.ts
src/modules/vivero/incorporacion/incorporacion.store.test.ts
src/modules/vivero/incorporacion/incorporacion.store.ts
src/modules/vivero/incorporacion/useIncorporacionCatalogos.ts
src/modules/vivero/incorporacion/useIncorporacionCommand.test.tsx
src/modules/vivero/incorporacion/useIncorporacionCommand.ts
src/modules/vivero/screens/ViveroScreen.tsx
src/utils/appAccess.ts
```
