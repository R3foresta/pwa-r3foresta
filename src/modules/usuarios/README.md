# Usuarios y permisos

Ruta `/app/usuarios`, entrada en inicio/menú para ADMIN global verificado. Roles y DTO conservan los nombres del backend. `api/` valida lecturas/recibos; `commands/` conserva la intención por actor y comparte transporte/ciclo/locks con participación; `hooks/` cancela consultas obsoletas; `pages/` compone la selección y confirmación con UI existente. El pendiente propio sigue accesible después de perder ADMIN sin abrir el selector administrativo.

[Contrato](../../../../Backend-r3foresta/documentacion/frontend/modulos/usuarios.md#administración-de-roles-globales), [QA y publicación](../../../docs/QA_USUARIOS_ADMINISTRACION.md). Requiere migración091; no confundir verificación local con SQL remoto o despliegue.
