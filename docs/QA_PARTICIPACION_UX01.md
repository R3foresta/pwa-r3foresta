# UX-01 — Evidencia local del inicio de participación

Fecha: 24 de octubre de 2026. Implementación local sobre un workspace que ya contenía cambios de otras tareas. No acredita despliegue, autorización en backend ni aceptación del conjunto UX-01–UX-05.

## Resultado

- `/participar` muestra tarjetas de subcampañas agrupadas por campaña; activas primero y otros estados en su propia sección. Conserva el orden del servidor dentro de cada grupo.
- Estado y rol proceden de capacidades completas. ADMIN global conserva también ámbitos sin acciones de escritura. No se deduce pertenencia desde Impacto ni logística.
- Una tarjeta entra directamente al detalle operativo existente. Con una sola subcampaña tampoco hay selección automática. El detalle compartido UX-02 sigue pendiente.
- El inicio no consulta stock ni equipos. El mapa se solicita al abrirlo, representa sólo zonas autorizadas con geometría pública y no incluye registros individuales.
- El mapa ocupa la pantalla mediante diálogo nativo, respeta áreas seguras, tiene selector accesible y ficha con entrada explícita. Escape y «Ver tarjetas» permiten salir; se restaura el foco.
- Se conservan selección y modo al regresar desde el detalle y selección al usar Atrás del navegador. Se mantiene la URL de detalle existente; la continuidad ampliada del registro corresponde a UX-05.
- Cambiar de cuenta desmonta lecturas anteriores y descarta selección privada. Las respuestas tardías no reponen datos de la cuenta anterior.
- Error de capacidades, carga y vacío confirmado son estados distintos. Historial y recuperación propia siguen disponibles sin capacidad operativa.
- Un enlace cuyo ámbito no está disponible informa el problema sin abrir otra subcampaña.

## Contratos cotejados

El [contrato de identidad/permisos](../../r3foresta-docs/specs/plantacion/participacion-aliada/contrato-identidad-permisos-backend-propuesta.md), sección de capacidades, incluye permiso vigente o todos los ámbitos no eliminados para ADMIN global. No se filtra esa respuesta por acciones de escritura.

El cliente validado `ImpactoService.consultar` y `useImpactoConsulta` conservan la proyección completa de subcampañas; el cursor pagina registros. El nuevo hook pide una página por campaña, limita a cuatro peticiones simultáneas y cancela al desmontar. No se modificó el transporte ni se agregaron endpoints. Un 404 público se representa como ausencia de ubicación disponible; errores de consulta admiten reintento. Las zonas faltantes siguen accesibles en tarjetas/lista.

Esto no resuelve B02 para geometría no pública ni usa el contexto de registro de todas las zonas como directorio geográfico.

## Pruebas de comportamiento

`src/modules/home/ParticipantHomeScreen.test.tsx` cubre:

- UX01-CA01/02: tres zonas en dos campañas, entrada directa, una sola zona sin redirección y roles/estados diferentes.
- UX01-CA03/04: mapa con el mismo conjunto autorizado, sin puntos individuales; selección/entrada/regreso y geometría ausente.
- UX01-CA05: paginación completa de capacidades, carga, error/reintento, vacío y recuperación sin ámbitos.
- UX01-CA06: cambio de cuenta, selección de una zona compartida, cancelación y respuestas tardías; también hidratación inicial de un enlace directo.
- UX01-CA07: selector accesible, cierre del diálogo y retorno de foco. El cierre nativo con Escape se comprobó además en navegador.
- Regresión del detalle: stock cero/error/reconsulta, cambio rápido de zona, meta orientativa, paginación pública y registro permitido aunque falle Impacto.

Los servicios se simulan en las pruebas: estos resultados no acreditan permisos de un backend desplegado.

## Revisión visual

Navegador integrado local, viewport móvil de 319 × 924 px:

1. `/participar` real en estado visitante: orientación, autenticación e Impacto accesibles.
2. Muestra temporal con componentes reales y datos sintéticos: tarjetas agrupadas, roles contextual/global, estados activo/completado.
3. Mapa real MapLibre con dos polígonos sintéticos y una zona sin geometría: mapa completo, atribución, controles, selección y ficha con acción visible.
4. Escape cierra el diálogo y devuelve foco a «Ver mapa».

La muestra temporal fue retirada después de la revisión. No se iniciaron sesiones ni se enviaron registros. Esta revisión no sustituye QA autenticado de los tres perfiles, escritorio, gestos/dispositivo real o integración con backend.

## Verificación de código

- `npm run test`: **51 archivos / 765 pruebas aprobadas**.
- `npm run lint`: aprobado, sin errores.
- `npm run build`: aprobado; incluye `tsc -b`, Vite y generación PWA.
- `git diff --check`: aprobado.

No hay script independiente `typecheck`. El build conserva el aviso conocido del chunk diferido de MapLibre: aproximadamente 1.077 MB minificado / 296 kB gzip. No se agregaron dependencias en esta implementación.

## Archivos de esta implementación

- `src/modules/home/ParticipantHomeScreen.tsx` y `ParticipantHomeScreen.test.tsx`.
- `src/modules/participacion/components/PlantadorWorkspace.tsx`, `plantadorPresentation.ts`, `ParticipacionInicioCards.tsx` y `ParticipacionInicioMap.tsx`.
- `src/modules/participacion/hooks/useParticipacionInicioMap.ts`.
- `src/modules/impacto/components/ImpactoMap.tsx` y `ImpactoMapPanel.tsx` (modo de altura completa).
- `FRONTEND_GUIDE.md`, `FRONTEND_AUDIT.md`, `src/modules/participacion/README.md`, índice/spec UX-01 y este informe.

## Pendientes

- UX-02: detalle compartido; se reutiliza el detalle operativo actual para ofrecer una entrada funcional durante esta etapa.
- B02: lectura autorizada de geometría/resumen para ámbitos no públicos. No se declara resuelta mediante mocks.
- UX-05: continuidad ampliada a través de registro/historial. La vuelta de esos flujos conserva los parámetros anteriores, sin ampliar todavía su contrato de navegación.
- QA autenticado, aceptación humana, escritorio y dispositivo real. Continúa AUD-023 y el aviso conocido del tamaño del chunk diferido de MapLibre.
