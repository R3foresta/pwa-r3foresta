# UI y UX de identidad y perfil — 14 de octubre de 2026

**Estado: COMPLETADO** — implementación frontend y verificación local de UI/UX finalizadas. Los pendientes de integración real, Impacto público y entregas posteriores conservan su alcance independiente.

## Alcance y fuentes

Mejora frontend del recorrido disponible de PA-T-INT02-A: acceso/alta con passkey, Inicio, navegación, perfil propio y afiliación. Se conservaron los cambios locales de integración recibidos, React/TypeScript/Vite/Tailwind, `src/modules`, servicios existentes y las primitivas `src/components/ui`. No se cambiaron Recolección, Vivero ni operaciones transaccionales de Plantación.

Fuentes: [continuación del backend](../../Backend-r3foresta/docs/pa-int02a-continuacion-2026-10-14.md), [encargo INT02-A](../../r3foresta-docs/specs/plantacion/participacion-aliada/inicio-pa-t-int02-a.md) y [contrato aceptado, §3–4](../../r3foresta-docs/specs/plantacion/participacion-aliada/contrato-identidad-permisos-backend-propuesta.md). Se contrastaron también `src/auth/internal-actor.guard.ts` y `src/auth/dto/register.dto.ts` del backend local: operaciones internas para ADMIN/GENERAL/VALIDADOR; email opcional en alta.

## Comportamiento revisado

- Alta explica la llave de acceso y el acceso actual de la cuenta; nombre de usuario obligatorio, correo opcional. Un correo vacío se omite, pues enviarlo como `""` incumpliría `IsEmail`.
- VOLUNTARIO dispone de Inicio y Mi perfil, sin montar el inventario ni ofrecer catálogos/operaciones que el guard actual rechaza. Un enlace interno directo muestra orientación, conservando la sesión. ADMIN/GENERAL/VALIDADOR conservan su navegación; el servidor decide cada operación.
- Login vuelve al destino privado permitido, incluidos consulta/hash. La afiliación no participa en esa decisión. `appAccess.ts` representa la audiencia interna actual, no permisos contextuales futuros.
- Inicio interno conserva fotos/accesos e inventario ADMIN real, pero retira métricas/actividad/fechas ficticias y botones sin acción. CO₂ se presenta como próximo y no ofrece actualización.
- Perfil muestra la identidad y afiliación v1; datos anteriores propios en sección separada. Rol con etiqueta en español, sin edición; afiliación sin catálogo, Otra o ausencia distinguidas.
- Formulario con bloques, opciones radio, límites 100/30/150 Unicode NFC sin truncar y errores por campo. PATCH conserva afiliación si no se toca; al volver a catálogo después de cambiar la opción exige seleccionar de nuevo, evitando reseleccionar una organización guardada luego inactiva.
- Buscar con Enter no guarda el perfil. Catálogo con selección visible, vacío, error, reintento, paginación y resultados anteriores conservados si falla una página.
- Foto opcional con progreso/error/éxito en pantalla y control accesible por teclado. Su guardado es inmediato; el formulario espera su finalización antes de guardar/salir. Cancelar cambios de nombre/afiliación ofrece seguir editando.

## Verificación ejecutada

- `TMPDIR=/private/tmp npm run test`: 27 archivos, 339 pruebas aprobadas en la pasada final completa de UX.
- `npm run lint`: aprobado.
- `TMPDIR=/private/tmp npm run build`: aprobado, incluye `tsc -b`, Vite y service worker PWA. No existe script `typecheck` separado.
- `git diff --check`: aprobado.

TMPDIR se redirigió a una carpeta permitida porque Vitest/Workbox usaban `~/.tmp`, fuera del sandbox. La primera ejecución de build completó TypeScript/Vite y falló al generar el service worker por ese permiso; la ejecución con TMPDIR completó la PWA.

## Navegador y presentación

Se ejecutó Chromium headless sobre Vite local, router/proveedores/componentes/services reales y respuestas HTTP interceptadas con datos sintéticos. Sin cuentas reales, tokens reales, biometría ni escrituras en backend/Supabase. [Resultado y solicitudes](qa/pa-perfil-ux/resultados.json).

Viewports 390×844 y 1440×1000; 11 capturas, cero errores de ejecución de página ni llamadas privadas inesperadas. Se comprobaron ausencia de desbordamiento horizontal, Inicio VOLUNTARIO sin APIs internas, ID `"9007199254740993"` exacto, Enter, vacío/error/reintento, PATCH/confirmación/recarga, cancelación conservando el texto y bloqueo de ruta interna antes de cargar sus datos. Se revisó también el Inicio interno sin métricas ficticias. Las capturas se inspeccionaron visualmente.

| Pantalla | Evidencia |
|---|---|
| Inicio de voluntariado | [Móvil](qa/pa-perfil-ux/inicio-voluntario-mobile.png) |
| Inicio del equipo operativo | [Móvil](qa/pa-perfil-ux/inicio-equipo-mobile.png) |
| Edición de perfil | [Móvil](qa/pa-perfil-ux/editar-perfil-mobile.png), [escritorio](qa/pa-perfil-ux/editar-perfil-desktop.png) |
| Selección de catálogo | [Selección](qa/pa-perfil-ux/catalogo-mobile.png), [vacío](qa/pa-perfil-ux/catalogo-vacio-mobile.png), [error](qa/pa-perfil-ux/catalogo-error-mobile.png) |
| Mi perfil confirmado | [Móvil](qa/pa-perfil-ux/mi-perfil-mobile.png), [escritorio](qa/pa-perfil-ux/mi-perfil-desktop.png) |
| Acceso interno sin facultad | [Estado de acceso](qa/pa-perfil-ux/acceso-interno-voluntario.png) |
| Alta sin correo obligatorio | [Móvil](qa/pa-perfil-ux/registro-mobile.png) |

## Límites y continuidad

La comprobación actual acredita frontend y contrato HTTP sintético. El informe del backend describe una prueba integrada previa; esta mejora visual no repitió la ceremonia física, la persistencia real ni la subida de foto real. El usuario autorizó el cierre mediante commit y push directamente a main el 14 de octubre de 2026. La publicación Git no acredita el despliegue ni habilita el piloto.

Esta PWA todavía no tiene cliente, rutas ni pantallas de Impacto público. El mapa actual lee Recolección interna; no puede convertirse en público retirando el guard. Su integración requiere las proyecciones públicas y los enlaces definitivos, fuera de `ProtectedRoute` y sin depender del perfil. Se registra como `AUD-020`.

Los permisos contextuales/capacidades y registro participante de entregas posteriores permanecen fuera de INT02-A. El nuevo Inicio no promete que estén habilitados.

## Archivos de esta mejora

| Bloque | Archivos |
|---|---|
| Acceso/alta | `src/modules/auth/LoginScreen.tsx`, `LoginScreen.test.tsx`, `src/layouts/AuthLayout.tsx`, `src/services/webauthn.service.ts`, `webauthn.service.test.ts` |
| Inicio | `src/modules/home/HomeScreen.tsx`, `ParticipantHomeScreen.tsx`, `src/data/home.ts` |
| Navegación | `src/components/BottomNav.tsx`, `MenuLateral.tsx`, `src/data/navigation.ts`, `src/utils/appAccess.ts`, `src/routes/ProtectedRoute.tsx`, `GuestRoute.tsx`, `participantAccess.test.tsx` |
| Perfil | `src/modules/user_profile/CompleteProfileScreen.tsx`, `CompleteProfileScreen.test.tsx`, `perfil.tsx`, `perfil.test.tsx`, `hooks/useProfileForm.ts` |
| Componentes de perfil | `src/modules/user_profile/components/AfiliacionSelector.tsx`, `AfiliacionSelector.test.tsx`, `AvatarUpload.tsx`, `AvatarUpload.test.tsx`, `ProfileRoleBadge.tsx` |
| Documentación/evidencia | `src/modules/user_profile/README.md`, `FRONTEND_AUDIT.md`, este informe y `docs/qa/pa-perfil-ux/` |

Se preservaron las modificaciones previas de integración en `participacion.service.ts`, `participacion.service.test.ts`, `profile.service.ts` y `types.ts`; no se reescribió el contrato de datos ni se introdujeron dependencias.
