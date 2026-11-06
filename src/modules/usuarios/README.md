# Usuarios y permisos

`/app/usuarios` reutiliza el selector ADMIN, búsqueda y paginación. La cuenta elegida presenta **rol global**, **acceso M1** y **viveros M2**. «Cambiar usuario» conserva filtros/páginas y devuelve foco a búsqueda; la confirmación identifica cuenta, operación, motivo y vivero cuando aplica. La navegación inferior permanece oculta.

Cada sección usa su endpoint y revisión: `revision_autoridad` para rol, `revision_acceso` M1 y la revisión M2 del conjunto de viveros del usuario. No hay guardado conjunto ni un flag global M2. GENERAL/VALIDADOR activos reciben vigencias; ADMIN deriva autoridad global. Retirar vigencias conservadas de ADMIN/VOLUNTARIO/inactivos está permitido por contrato. El directorio lista activas; la consulta por ID usa `/usuarios/:id/autoridad` para localizar una cuenta inactiva conocida sin inventar filtros.

`api/`, `commands/` y `hooks/` conservan el flujo de rol. [Accesos M1/M2](../accesos/README.md) tiene contratos/slots independientes, compartiendo transporte, ciclo y locks. `UsuarioModuleAccess` consulta efectivo/explícito, vigencias y motivos de historia paginada, y relee antes de abrir confirmación. Errores/403/401 se distinguen del vacío y bloquean la gestión afectada. Las nuevas capacidades no se extraen del DTO cerrado de Participación.

Timeout/503/202 mantienen la intención original. Un rechazo durable exige otra lectura y confirmación con UUID nuevo. Al resolver se refrescan capacidades; una cuenta que perdió ADMIN recupera su recibo propio sin directorio. Cuenta/token nuevos desmontan datos y formularios anteriores. Inicio/menú ofrecen recuperar únicamente los pendientes del actor actual de rol/M1/M2.

[Contrato del rol](../../../../Backend-r3foresta/documentacion/frontend/modulos/usuarios.md#administración-de-roles-globales), [T3 y QA local](../../../docs/QA_T3_ACCESOS.md), [evidencia histórica del selector/rol](../../../docs/QA_USUARIOS_ADMINISTRACION.md). Requiere backend T1/T2 local más las proyecciones exactas documentadas en T3; SQL aplicado, revisión humana y despliegue son estados separados.
