# UX-05 — Registrar y volver sin perder contexto

## Acuerdo

Desde el detalle se entra al asistente existente. Tras guardar se vuelve a la misma subcampaña manteniendo filtros y contexto; los borradores pendientes se conservan. Un registro confirmado no se vuelve a presentar como borrador para enviarlo otra vez.

## Recorrido

1. En el detalle, consultar autoridad y disponibilidad para registrar.
2. Entrar a Registrar plantación con cuenta y subcampaña inequívocas.
3. Conservar los tres pasos existentes: fotos/ubicación, especies/cantidades y participantes/resumen.
4. Confirmar mediante el flujo existente de evidencia y comando atómico.
5. Solo ante resultado confirmado, volver al detalle de origen y mostrar una confirmación con acceso al registro real.
6. Actualizar lecturas de avance y disponibilidad. Si fallan, mostrar actualización pendiente sin repetir la escritura.

## Contexto conservado

| Contexto | Al regresar |
| --- | --- |
| Campaña y subcampaña | Mismas del origen; nunca otra zona por defecto silencioso |
| Pestaña, filtros y selección | Restaurar si siguen siendo válidos |
| Inicio en tarjetas o mapa | Mantener al volver posteriormente al inicio |
| Posición de mapa/lista | Restaurar cuando sea viable; si la selección ya no existe, explicar el cambio |
| Borrador no enviado | Conservar por cuenta y subcampaña con almacenamiento existente |
| Registro confirmado | Conservar comprobante e historia; liberar bytes según lifecycle vigente |

Guardar contexto de navegación no significa copiar fotos, tokens o respuestas privadas a la URL. Validar destinos internos de regreso; no aceptar URLs externas arbitrarias.

## Salidas y excepciones

- Salir antes del envío: conservar borrador y volver al detalle; el descarte explícito mantiene su clausura y confirmación actuales.
- Resultado incierto después de enviar: permanecer en recuperación, con el mismo comando/payload; no mostrar éxito ni abrir una nueva intención.
- Sesión vencida: recuperar la cuenta original. Otra cuenta no accede al borrador.
- Permiso retirado: no iniciar nuevos registros; mantener recuperación de pendientes propios e historial permitido.
- Sin stock confirmado: permitir consultar el detalle y explicar la indisponibilidad.
- Fallo al consultar stock: permitir reintento; no confundir con saldo cero.
- Enlace antiguo con campaña y subcampaña: resolver hacia el nuevo detalle compatible tras validar ámbito; sin acceso o recurso disponible, ofrecer explicación y regreso.
- Entrada directa al formulario sin origen: después de confirmar, usar el detalle autorizado de esa subcampaña; si no es accesible, ofrecer comprobante propio e inicio. No enviar a otra zona.

## Aceptación

- UX05-CA01: registrar desde una zona devuelve a esa misma zona con pestaña/filtros conservados.
- UX05-CA02: una respuesta de guardado incierta no dispara navegación de éxito.
- UX05-CA03: éxito con fallo de refresco muestra comprobante y reintento de lectura, sin repetir POST.
- UX05-CA04: salir y retomar conserva un borrador de la misma cuenta/ámbito.
- UX05-CA05: cambiar de cuenta no muestra fotos ni campos del actor anterior.
- UX05-CA06: retirar acceso no borra pendientes ni historial propio permitido.
- UX05-CA07: enlaces anteriores y retorno del navegador conservan destino o explican su indisponibilidad.

Reutilizar la recuperación y almacenamiento existentes. Adaptar los validadores de retorno junto con las rutas; no añadir una segunda lógica de comandos.
