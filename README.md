# R3foresta PWA

Frontend de trazabilidad de Recolección, Vivero y Plantación. React 19 + TypeScript + Vite 7 + React Router 6 + Tailwind 3; npm y `package-lock.json`.

## Empezar

Usar Node 24.15 o posterior de la rama 24 (compatible con las dependencias actuales de Vitest/jsdom).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Configurar `VITE_API_URL` con el origen del backend, sin `/api` ni barra final; ejemplo: `http://localhost:3000`. Los clientes agregan `/api` o `/api/v1` según el contrato. Hace falta un backend accesible y, para operaciones privadas, una cuenta autorizada con passkey. Todo `VITE_*` es público: nunca poner secretos o claves administrativas.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Vite local. |
| `npm run test` | Vitest + Testing Library en jsdom. |
| `npm run lint` | ESLint. |
| `npm run build` | TypeScript (`tsc -b`), Vite y service worker PWA. |
| `npm run preview` | Sirve el build local; no inicia backend. |

No existe script `typecheck`. Si el entorno restringe su carpeta temporal, anteponer `TMPDIR=/private/tmp` a tests/build.

## Leer sólo lo necesario

| Necesidad | Fuente |
| --- | --- |
| Reglas de trabajo del agente | [AGENTS.md](AGENTS.md) |
| Ubicar código y mantener patrones | [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) |
| Regla de negocio o contrato | [DOMAIN_INDEX.md](DOMAIN_INDEX.md) → fuentes oficiales |
| Saber qué falta y cómo cerrarlo | [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md) |
| Revisar pruebas/capturas o antecedentes | [Índice de evidencia](docs/README.md) |

La documentación de dominio y el estado global de entregas viven en [r3foresta-docs](../r3foresta-docs/README.md), con su [tablero de Participación Aliada](../r3foresta-docs/specs/plantacion/participacion-aliada/implementacion/README.md). Si no están los repositorios hermanos, consultar [la documentación remota](https://github.com/R3foresta/r3foresta-docs); no inventar endpoints.

## Mapa del código

- `src/App.tsx`: rutas lazy; `src/main.tsx`: proveedores globales y arranque PWA.
- `src/modules/`: pantallas, componentes, hooks, contratos y adaptadores por feature. Conviven `screens/` y `pages/`; seguir el módulo existente.
- `src/api/` y `src/services/`: transporte/casos de uso existentes. Participación y perfil v1 tienen sus clientes dentro del módulo.
- `src/components/ui/` y `ConfirmDialog.tsx`: primitivas y confirmación accesible; reutilizar antes de crear estilos/componentes nuevos.
- `src/contexts/AuthContext.tsx`: sesión verificada; `src/utils/appAccess.ts`: navegación interna, no autoridad final.
- `src/pwa/`, `vite.config.ts`, `vercel.json`: actualización, build y hosting del shell.

## Alcance actual y límites

| Área | Qué existe |
| --- | --- |
| Recolección | Borrador, evidencia, corrección de rechazados, validación y stock de origen. |
| Vivero | Inicio, eventos, timeline, evidencias y operaciones físicas hacia Plantación. [Módulo](src/modules/vivero/README.md). |
| Plantación interna | Campañas/subcampañas, equipo logístico, plan, polígono, cierre y registro interno existente. |
| Identidad/perfil | Passkey, perfil propio y afiliación opcional. [Módulo](src/modules/user_profile/README.md). |
| Acceso contextual | `/app/participacion/accesos`: C04–C09, capacidades, selección múltiple y recuperación. [Módulo](src/modules/participacion/README.md). |

**INT06 FE01–FE05 verificadas localmente; FE06 parcial.** [Evidencia](docs/QA_GESTION_ACCESOS_INT06.md): 445 tests en el corte de esa entrega, 28 comprobaciones de navegador y cotejo DB. Esto no acredita despliegue ni piloto. El registro participante v1, Impacto público/Mis registros y la regresión compartida INT02-D siguen pendientes. El mapa actual es interno; no hacerlo público quitando su guard.

El service worker precachea el shell; no hay sincronización offline ni caché de API. Enviar operaciones/fotos necesita red. La idempotencia de C04–C09 no demuestra idempotencia de los eventos físicos de Vivero.

## Antes de publicar un cambio

Ejecutar los checks pertinentes de `package.json` y revisar el flujo afectado. Separar tests simulados, navegador con backend sintético y QA externo real. Registrar limitaciones y deuda en la auditoría; usar las evidencias fechadas como resultados de su revisión, no como un certificado del árbol actual.
