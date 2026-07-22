# R3Foresta PWA

Frontend operativo de R3Foresta para trazabilidad de material biológico desde la recolección hasta el vivero y la plantación.

La aplicación está construida con React, TypeScript, Vite, React Router y Tailwind CSS. La estructura principal es feature-first:

```txt
src/
  api/                 # llamadas HTTP de bajo nivel
  services/            # casos de uso, parseo y mapeos
  modules/
    auth/
    recolecciones/
    vivero/
    plantacion/
    comunidades/
    organizaciones/
    plantas/
  components/          # componentes compartidos
  contexts/            # sesión y proveedores globales
  utils/               # validaciones y utilidades transversales
```

## Requisitos

- Node.js compatible con Vite 7.
- npm.
- Backend de R3Foresta accesible desde la URL configurada.

## Configuración local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea `.env.local` a partir de `.env.example` y configura:

   ```env
   VITE_API_URL=http://localhost:3000
   ```

   La aplicación agrega `/api` a esta URL para consumir el backend.

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo con Vite. |
| `npm run build` | TypeScript + bundle de producción. |
| `npm run lint` | ESLint sobre el workspace activo. |
| `npm run preview` | Servir localmente el bundle generado. |

Actualmente no hay scripts independientes de `test` o `typecheck`; `npm run build` sí ejecuta la comprobación de TypeScript mediante `tsc -b`.

## Flujos implementados

- Recolección: creación de borradores, ubicación, resumen, evidencias, validación y detalle del lote.
- Vivero: inicio de lote, Embolsado, Adaptabilidad, Merma, Despacho manual, Descarte pre-embolsado, timeline y evidencias.
- Integración Vivero → Plantación: asignación física con evidencia, devolución física y saldos separados.
- Plantación: campañas, subcampañas, equipo, polígono, activación/cancelación y registro inicial de plantación en campo con GPS, evidencias y consumo de asignaciones.
- Catálogos operativos: comunidades, organizaciones y plantas.

La ruta de registro de plantación inicial es:

```txt
/app/planting/subcampanias/:id/plantaciones/new
```

## Reglas de dominio importantes

- Los eventos de Vivero son append-only; no se editan ni eliminan desde la UI.
- `EMBOLSADO` registra plantas vivas observadas. No se convierte automáticamente gramos en plantas.
- `INICIO` representa material en proceso y no crea plantas vivas.
- El saldo vivo y los cierres automáticos son responsabilidad del backend.
- Las operaciones críticas requieren evidencia según el contrato vigente.
- La asignación a Plantación es física; Plantación consume asignaciones y no genera un despacho automático adicional.

Las reglas completas viven en el repositorio documental de R3Foresta. En este repo, consultar [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md), [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md), [DOMAIN_INDEX.md](DOMAIN_INDEX.md) y [AGENTS.md](AGENTS.md).

## Verificación antes de cerrar cambios

Ejecuta al menos:

```bash
npm run lint
npm run build
```

Si el cambio toca un flujo de dominio, valida también el contrato correspondiente en `r3foresta-docs` y documenta cualquier verificación que no haya sido posible ejecutar.
