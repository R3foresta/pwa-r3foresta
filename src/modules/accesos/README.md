# Accesos de Recolección y Vivero

Contratos T1/T2 separados de Participación: [M1](../../../../Backend-r3foresta/docs/t1-acceso-recoleccion.md), [M2 vigente](../../../../Backend-r3foresta/docs/t2-acceso-viveros.md). No ampliar el DTO cerrado de capacidades M3.

- `accesos.api.ts` y `accesos.contract.ts`: lecturas propias/ADMIN, historia y recibos de cada dominio; Bearer, cancelación y timeout del transporte existente. IDs/revisiones decimales exactos, con `BigInt` sólo para comprobar orden/incrementos.
- `OperationalAccessProvider`: lecturas propias independientes por cuenta/token. Un error de M1 no concede ni retira M2. Las fronteras de cuenta descartan formularios/respuestas anteriores; un refresco explícito invalida datos operativos. No refrescar al abrir/cerrar el selector de fotos desmontando el formulario.
- `accessPolicy.ts`: capacidades por operación/vivero. M1 mantiene lo propio; revisión documental exige capacidad del vivero y otra autoría. DESECHO nunca se obtiene por autoría. Los Numbers inseguros se rechazan.
- `OperationalAccessGate`: URL directa antes de montar los flujos. Las acciones por objeto comprueban además su vivero; backend decide en cada request/RPC. M3 y las rutas públicas conservan sus guards.
- `moduleCommandStore.ts` / `useModuleCommand`: intención inmutable guardada antes del POST; slot/lock por actor y dominio (`M1`/`M2`), separados del rol y de Participación. Reutilizan `CommandLifecycle` y Web Locks. No se borran pendientes al salir ni caducan por tiempo.

503/timeout/202/recibo incompatible conservan UUID e intención. Sólo un terminal validado libera el slot. Un 409 durable obliga a cerrar resultado, releer y confirmar una intención nueva. Recuperar usa la ruta del dominio y sólo la cuenta original, sin requerir conservar ADMIN. Un recibo histórico no acredita efectividad actual; después se refrescan las lecturas propias.

La administración vive en [Usuarios y permisos](../usuarios/README.md). Operación/orígenes/evidencias en [Vivero](../vivero/README.md). [QA y límites T3](../../../docs/QA_T3_ACCESOS.md).
