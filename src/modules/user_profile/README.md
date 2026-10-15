# Perfil de usuario y afiliación opcional

Actualizado el 14 de octubre de 2026 para PA-T-INT02-A. El perfil no modifica autoridad. El usuario ve el rol recibido del backend; afiliación no concede permisos.

## Flujo y contrato

AuthContext verifica la sesión leyendo el perfil propio legado con JWT Bearer. Un perfil mínimo requiere nombre no vacío; apellido, documento, wallet y afiliación no bloquean este recorrido. `/complete-profile` y `/app/edit-profile` usan `CompleteProfileScreen`, que carga la proyección v1 antes de habilitar guardar.

- `GET /api/v1/usuarios/me/perfil`: nombre, apellido opcional, afiliación, usuario_id decimal en cadena y rol_global informativo, en envelope `{data,observado_en}`.
- `PATCH /api/v1/usuarios/me/perfil`: nombre hasta 100 y apellido opcional hasta 30 caracteres Unicode NFC. No envía autoridad ni datos históricos.
- `GET /api/v1/participacion/organizaciones-seleccionables`: cualquier cuenta activa, VOLUNTARIO incluido. Solo `{organizacion_id,nombre}`, IDs exactos en cadena, búsqueda de 2..100 caracteres, límite 20 y cursor opaco. No crea ni edita catálogo.

Ejemplo de cambio con catálogo:

```json
{
  "nombre": "Ana",
  "apellido": null,
  "afiliacion": {
    "tipo": "ORGANIZACION_REGISTRADA",
    "organizacion_id": "9007199254740993"
  }
}
```

«Otra» usa `{tipo:"OTRA",nombre:"Nombre libre"}` (1..150 caracteres NFC). Sin afiliación se guarda `afiliacion:null`; omitir afiliación conserva lo anterior. No se envía nombre cliente para una selección de catálogo. Una afiliación previa a organización luego inactiva se conserva si no se edita.

## Archivos y estados

- `participacion.service.ts`: transporte v1 y validación runtime de envelope/IDs/tipos/campos. Sin caché de datos privados; rechaza respuestas tardías de una sesión que cambió.
- `CompleteProfileScreen.tsx`: composición por bloques de foto, nombre y afiliación; opciones de afiliación con radios, contadores Unicode, errores vinculados al campo y confirmación al cancelar cambios. Al editar, la navegación inferior se oculta para evitar abandonar el formulario desde ella.
- `hooks/useProfileForm.ts`: lectura/guardado, validación UX, seguimiento de cambios, guarda de doble envío y cancelación de lectura. Al cambiar de cuenta se descartan formulario/búsquedas; al fallar un guardado se conservan los datos.
- `components/AfiliacionSelector.tsx`: búsqueda por nombre con Enter sin enviar el perfil; paginación que conserva resultados ante error, selección por ID y estados loading/empty/error/retry. Las consultas anteriores se cancelan. Búsqueda NFC de 2..100 caracteres, sin truncado.
- `components/AvatarUpload.tsx`: botón accesible por teclado, validación, progreso/error/éxito en pantalla. La foto se guarda al subirla, independientemente del formulario; guardar/salir espera su finalización.
- `components/ProfileRoleBadge.tsx`: etiquetas de presentación para los cuatro roles contractuales, sin autoridad por defecto.
- `profile.service.ts`: lectura de sesión/foto y adaptador de `register-form`, con proyección explícita de campos históricos; excluye rol aun si un objeto legado manipulado lo contiene.
- `perfil.tsx`: lectura v1 para nombre/rol/afiliación, carga/error/reintento, confirmación tras guardar y datos históricos propios en un bloque desplegable. Los nombres de catálogo se muestran completos.

Después de guardar, el backend confirma el cambio y AuthContext vuelve a leer el perfil propio; el alias incorpora el nombre vigente de catálogo. No se inventa una persistencia exitosa desde el estado local.

Las rutas requieren Bearer; identidad ajena/ausente devuelve 401, cuenta inactiva 403, entrada inválida o organización no seleccionable 422. Los nombres no se truncan silenciosamente. El backend conserva la autoridad como fuente de verdad.

## Verificación y alcance

La integración inicial acreditó 21 archivos/295 pruebas. La mejora de UX añadió pruebas de perfil, formulario, selector, foto y navegación por audiencia. Comandos, resultados actuales y capturas en [QA de UI y UX](../../../docs/QA_PERFIL_PARTICIPACION_UX.md). Las respuestas del navegador son sintéticas; esa comprobación no acredita persistencia en la DB ni una ceremonia WebAuthn real.

[Informe de backend y QA real](../../../../Backend-r3foresta/docs/pa-int02a-continuacion-2026-10-14.md): passkey física en Brave, cuenta GENERAL, afiliación/recargas/negativos y autoridad conservada. VOLUNTARIO y BIGINT se verificaron en fixtures/HTTP simulados. La UX se publicó en Git en `cf130365`; eso no acredita despliegue ni habilita el piloto.
