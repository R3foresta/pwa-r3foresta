# Lectura del equipo para PLANTADOR

## Necesidad

Una cuenta VOLUNTARIO con permiso contextual vigente `PLANTADOR` debe poder consultar la pestaña Equipo de su subcampaña. Es una lectura de miembros, sin facultad para incorporar, retirar o cambiar permisos de otra persona. ADMIN global y `ADMINISTRADOR_SUBCAMPANIA` conservan su acceso actual.

## Contrato y cambio aplicado

`GET /api/v1/subcampanias/:id/miembros-participacion` entrega la proyección paginada que usa la PWA. La función original `pa_miembros_participacion_leer` llamaba a `pa_lecturas_ambitos_validar(..., 'GESTIONAR')`, que rechazaba a `PLANTADOR` con 403. El backend hermano incorpora la migración aditiva `087_pa_miembros_plantador_lectura.sql` para corregir esta autorización. La migración ya está aplicada en el proyecto Supabase configurado y su RPC respondió 200 para un plantador vigente.

La migración amplía **solo la autorización de este GET** para admitir un permiso `PLANTADOR` vigente en la subcampaña solicitada. Conserva la validación del actor JWT activo, el alcance por subcampaña, la paginación, la respuesta mínima vigente y el rechazo de cuentas retiradas o ámbitos ajenos. La lectura no concede capacidades de gestión ni acceso a `personas/buscar`, `accesos/revisar` o comandos C04–C09. No usar el endpoint legado `/api/subcampanias/:id/equipo` como sustituto.

## Verificación

- PLANTADOR vigente en A: 200 con miembros de A; lectura de B ajena: 403 sin datos.
- VOLUNTARIO sin permiso, permiso revocado, cuenta inactiva o JWT inválido: rechazo; un comprobante histórico propio no reabre el equipo.
- Administrador contextual de A y ADMIN global: misma lectura que antes; acciones de gestión sin cambios.
- Ningún POST/DELETE de accesos, búsqueda privada ni revisión se autoriza por este cambio.
- OpenAPI, documentación del contrato y pruebas SQL/HTTP del backend están actualizados; el preview aislado pasó 37/37 comprobaciones HTTP.
- Verificación remota de solo lectura: la RPC respondió 200 para un VOLUNTARIO/PLANTADOR activo en su ámbito, 403 en uno ajeno, 403 en búsqueda privada y 401 con identidad inválida. No se mostraron datos personales en la comprobación.
- La persona usuaria comprobó en `localhost:5173` con una sesión VOLUNTARIO/PLANTADOR que la pestaña Equipo muestra personas y no ofrece controles para modificarlas. El frontend local servido contenía el componente actualizado y el backend local respondió en salud.
- Esta comprobación acredita el entorno local con Supabase configurado; no acredita una publicación externa de la PWA.
