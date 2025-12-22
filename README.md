# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Estrucutra de la DB
::: mermaid
erDiagram
    %% =====================================================
    %% R3Foresta - BD Oficial (vFinal)
    %% Postgres/Supabase aligned
    %% =====================================================

    USUARIO {
        bigint id PK
	      string username "UNIQUE"
        string nombre
        string doc_identidad "UNIQUE, opcional"
        string wallet_address "UNIQUE, opcional; formato: 0x + 40 hex"
        string organizacion "texto (si luego es catálogo se migra)"
        string contacto "opcional; formato: +########"
        string rol "DEFAULT=GENERAL; {RECOLECTOR|VIVERO|VOLUNTARIO|GENERAL}"
        datetime created_at
    }

    UBICACION {
        bigint id PK
        string pais
        string departamento
        string provincia
        string comunidad
        string zona
        decimal latitud "OBLIGATORIO [-90..90] (6 decimales)"
        decimal longitud "OBLIGATORIO [-180..180] (6 decimales)"
        datetime created_at
    }

    VIVERO {
        bigint id PK
        string codigo "UNIQUE; ej: VIV-001 (autogenerado)"
        string nombre "UNIQUE (case-insensitive)"
        bigint ubicacion_id FK "UNIQUE (1:1 con UBICACION)"
        datetime created_at
    }

    PLANTA {
        bigint id PK
        string especie
        string nombre_cientifico
        string variedad
        string tipo_planta "Árbol/Arbusto/.../Otro"
        string tipo_planta_otro "OBLIGATORIO si tipo_planta=Otro"
        string fuente "tipo_material_origen {SEMILLA|ESQUEJE}"
        datetime created_at
    }

    METODO_RECOLECCION {
        bigint id PK
        string nombre "UNIQUE (case-insensitive)"
        string descripcion
    }

    RECOLECCION {
        bigint id PK
        date fecha "OBLIGATORIO; [hoy-45d .. hoy]"
        string nombre_cientifico "si no hay planta_id"
        string nombre_comercial "si no hay planta_id"
        decimal cantidad "OBLIGATORIO > 0"
        string unidad "UNIDAD/UNIDADES para ESQUEJE; KG/G/GR para SEMILLA"
        string tipo_material "tipo_material_origen {SEMILLA|ESQUEJE}"
        string estado "DEFAULT=ALMACENADO; {USADO|ALMACENADO|DESECHADO}"
        boolean especie_nueva "DEFAULT=false"
        string observaciones "max 1000 chars"
        bigint usuario_id FK
        bigint ubicacion_id FK
        bigint vivero_id FK "opcional"
        bigint metodo_id FK
        bigint planta_id FK "opcional (si no existe en catálogo)"
        datetime created_at
    }

    RECOLECCION_FOTO {
        bigint id PK
        bigint recoleccion_id FK
        string url
        int peso_bytes "max 5MB"
        string formato "JPG/JPEG/PNG"
        datetime created_at
        %% Regla negocio: mínimo 2 fotos por recolección (validar en backend)
    }

    LOTE_PLANTACION {
        bigint id PK
        bigint planta_id FK
        bigint vivero_id FK
        bigint responsable_id FK "creador/responsable"
        date fecha_inicio
        int cantidad_inicio
        int cantidad_embolsadas "DEFAULT=0"
        int cantidad_sombra "DEFAULT=0"
        int cantidad_lista_plantar "DEFAULT=0"
        date fecha_embolsado
        date fecha_sombra
        date fecha_salida
        decimal altura_prom_sombra
        decimal altura_prom_salida
        string estado "DEFAULT=INICIO; {INICIO|EMBOLSADO|SOMBRA|LISTA_PLANTAR|SALIDA_VIVERO}"
        datetime created_at
        datetime updated_at
        bigint updated_by FK "obligatorio en UPDATE (para historial)"
    }

    LOTE_PLANTACION_RECOLECCION {
        bigint lote_id PK, FK
        bigint recoleccion_id PK, FK
        %% PK compuesta (lote_id, recoleccion_id)
    }

    LOTE_PLANTACION_HISTORIAL {
        bigint id PK
        bigint lote_id FK
        int nro_cambio "UNIQUE por lote (lote_id, nro_cambio)"
        datetime fecha_cambio "DEFAULT=now()"
        bigint responsable_id FK
        string accion "{INICIO|EMBOLSADO|SOMBRA|LISTA_PLANTAR|SALIDA|AJUSTE}"
        string estado "{INICIO|EMBOLSADO|SOMBRA|LISTA_PLANTAR|SALIDA_VIVERO}"

        int cantidad_inicio
        int cantidad_embolsadas
        int cantidad_sombra
        int cantidad_lista_plantar

        date fecha_inicio
        date fecha_embolsado
        date fecha_sombra
        date fecha_salida

        decimal altura_prom_sombra
        decimal altura_prom_salida

        string notas "max 2000 chars"
        %% Se llena automáticamente en INSERT/UPDATE del LOTE_PLANTACION (triggers)
    }

    %% =====================================================
    %% Relaciones
    %% =====================================================

    UBICACION ||--o{ VIVERO : tiene
    UBICACION ||--o{ RECOLECCION : ocurre_en

    USUARIO ||--o{ RECOLECCION : recolecta
    USUARIO ||--o{ LOTE_PLANTACION : crea
    USUARIO ||--o{ LOTE_PLANTACION_HISTORIAL : registra
    USUARIO ||--o{ LOTE_PLANTACION : actualiza "via updated_by"

    VIVERO ||--o{ RECOLECCION : almacena
    VIVERO ||--o{ LOTE_PLANTACION : se_realiza_en

    PLANTA ||--o{ RECOLECCION : corresponde_a
    PLANTA ||--o{ LOTE_PLANTACION : se_siembra

    METODO_RECOLECCION ||--o{ RECOLECCION : se_usa_en

    RECOLECCION ||--o{ RECOLECCION_FOTO : tiene

    LOTE_PLANTACION ||--o{ LOTE_PLANTACION_RECOLECCION : usa
    RECOLECCION ||--o{ LOTE_PLANTACION_RECOLECCION : proviene_de

    LOTE_PLANTACION ||--o{ LOTE_PLANTACION_HISTORIAL : versiona
:::