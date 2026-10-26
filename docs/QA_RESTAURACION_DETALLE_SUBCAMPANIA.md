# Restauración del detalle y acceso participante

Fecha: 25 de octubre de 2026. Verificación local, sin escrituras de plantación contra backend.

## Resultado implementado

- Se recuperó del detalle interno original la composición del encabezado fotográfico, plantados/meta, porcentaje, barra y pestañas redondas. Se conservaron resumen, logística, indicadores y herramientas internas existentes; la tarjeta de especies comparte su diseño original con la vista participante.
- `/app/planting/subcampanias/:id` es la entrada común. El ID 99 es referencia visual, no destino fijo. Un enlace antiguo con subcampaña 51 lleva a 51 después de verificar campaña/ámbito.
- Los roles internos conservan el detalle interno. Plantador y administrador contextual cargan una composición participante solamente tras verificar actor, capacidades completas y ámbito exacto. No se montan ni consultan servicios del detalle interno para esos perfiles.
- Participar conserva el inicio de tarjetas y mapa, elimina su detalle independiente y redirige sus enlaces antiguos. Regreso al inicio conserva selección/modo cuando existe estado del mismo actor; cambiar cuenta limpia ese contexto.
- Resumen contiene registro autorizado y disponibilidad, metas por especie e historial público; Equipo permite miembros/gestión al administrador contextual; Mapa conserva el alcance de la zona y el retorno desde una plantación pública. Compartir utiliza exclusivamente la ruta pública.
- El formulario admite retornos locales al detalle común, además del formato antiguo, al conservar/salir o tras descarte confirmado. No cambia comandos, evidencias, saldos ni atomicidad del registro.

## Verificación

- `npm run test`: 53 archivos, 791 pruebas aprobadas. Incluye carga inicial de sesión, cambio de cuenta, rol por ámbito, ruta exacta sin ampliar el módulo interno, IDs BIGINT, enlaces antiguos, retorno desde registro e historial, y ausencia/error de datos.
- La primera ejecución completa detectó dos rutas faltantes en el arnés de pruebas del formulario y un timeout en la prueba de hidratación. Se corrigieron las rutas del arnés; 60 pruebas enfocadas y después toda la suite pasaron. No se aumentaron timeouts para ocultar el fallo.
- `npm run lint`: aprobado.
- `npm run build`: aprobado (`tsc -b`, Vite y generación PWA). Vite mantiene la advertencia de chunks mayores de 1000 kB; no impide generar la aplicación.
- `git diff --check`: aprobado.
- No existe script `typecheck` independiente; el build ejecuta `tsc -b`.
- Se revisaron componentes, acceso, cancelación y límites de cuenta con la checklist React. Sin dependencias nuevas para esta restauración.

## Límites y pendientes

- No se completó inspección visual en navegador: la herramienta respondió que el uso del navegador local está desactivado en Work. Los archivos temporales de vista sintética se retiraron. No se acredita aceptación visual autenticada en móvil ni escritorio.
- El contrato actual no expone equipo al plantador, fotos de miembros ni fechas de la subcampaña en su lectura participante. Se informa indisponibilidad; no se inventan campos ni se usa un endpoint interno como respaldo.
- El avance/historial dependen de la proyección pública; el contexto autorizado aporta plan, saldo y polígono cuando permite registrar. Un ámbito no público sin ese contexto conserva sus limitaciones de lectura. B01/B02 siguen abiertos.
- La imagen del encabezado es el recurso decorativo original, no evidencia de la subcampaña.
- No se acredita toda UX-03–UX-05 ni flujo de asignaciones B03. Esta entrega corrige estructura, entrada, permisos y retornos compatibles solicitados.
- La suite usa servicios simulados; no acredita autorización del backend real, despliegue ni escritura transaccional real.

## Archivos principales

- `src/modules/plantacion/screens/SubcampaniaDetailRoute.tsx` y su prueba: separación de audiencia antes de cargar detalle.
- `src/modules/plantacion/screens/DetalleSubcampanaScreen.tsx`: diseño original reutilizado, resto de pantalla conservado.
- `src/modules/plantacion/components/SubcampaniaDetailHeader.tsx`, `SubcampaniaDetailTabs.tsx`, `SubcampaniaSpeciesCard.tsx`: presentación común original.
- `src/modules/participacion/components/ParticipacionSubcampaniaDetail.tsx`, `ParticipacionDetalleEquipo.tsx`, `ParticipacionDetalleHistorial.tsx`, `PlantadorWorkspace.tsx`: composición y navegación participante.
- `src/modules/participacion/utils/detailNavigation.ts`, `hooks/useParticipacionAccountNavigation.ts`: retornos permitidos y separación por cuenta.
- `src/App.tsx`, `src/utils/appAccess.ts`, `src/layouts/AppLayout.tsx`, `src/components/BottomNav.tsx`: integración de ruta y navegación.
- `src/modules/participacion/registro/pages/RegistrarParticipanteScreen.tsx`: retorno compatible desde captura.
- Pruebas de inicio, detalle, guard, navegación y formulario; guía, auditoría y specs actualizadas.
