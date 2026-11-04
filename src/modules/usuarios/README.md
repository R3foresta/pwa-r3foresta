# Usuarios y permisos

Ruta `/app/usuarios`, entrada en inicio/menú para ADMIN global verificado. Roles y DTO conservan los nombres del backend. `api/` valida lecturas/recibos; `commands/` conserva la intención por actor y comparte transporte/ciclo/locks con participación; `hooks/` cancela consultas obsoletas; `pages/` compone la selección y confirmación con UI existente. El pendiente propio sigue accesible después de perder ADMIN sin abrir el selector administrativo.

La UI muestra una sola tarea: `UsuariosSelector` para buscar, `UsuarioRoleForm` con únicamente la cuenta elegida, o `RoleCommandStatus` durante envío/recuperación y resultado. «Cambiar usuario» conserva filtros y páginas, limpia motivo/revisión y devuelve foco a búsqueda. Al seleccionar, el foco pasa al título del formulario sin abrir el teclado. La navegación inferior se oculta en esta ruta para evitar acciones superpuestas; el encabezado regresa a Inicio. La confirmación sigue consultando autoridad antes de enviar.

[Contrato](../../../../Backend-r3foresta/documentacion/frontend/modulos/usuarios.md#administración-de-roles-globales), [QA y publicación](../../../docs/QA_USUARIOS_ADMINISTRACION.md). Requiere migración091; no confundir verificación local con SQL remoto o despliegue.
