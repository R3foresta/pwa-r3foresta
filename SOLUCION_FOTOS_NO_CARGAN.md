# 🖼️ SOLUCIÓN: Fotos no se cargan en el frontend

## 🔍 Problema identificado
Las imágenes muestran el texto alternativo (ej: "Foto 25", "Foto 26") pero no se renderizan las imágenes reales desde Supabase.

---

## ✅ Soluciones por orden de prioridad

### 1️⃣ **VERIFICAR LAS URLs EN LA CONSOLA DEL NAVEGADOR**

Abre la consola del navegador (F12) y busca los logs:
```
📸 Fotos recibidas del backend: [...]
🔗 Primera URL de foto: https://...
```

Si ves `❌ Error cargando imagen:` significa que hay un problema con la URL.

Haz clic en "Ver URL" debajo de cada foto para ver la URL completa que está intentando cargar.

---

### 2️⃣ **PROBLEMA: URLs de Supabase Storage privadas**

**Diagnóstico:** Si las URLs de Supabase son del tipo:
```
https://xxxxxxxxxxx.supabase.co/storage/v1/object/private/fotos/...
```

**Causa:** El bucket de Supabase está configurado como **privado** y las URLs necesitan un token de acceso.

**Solución A - Hacer el bucket público (RECOMENDADO):**

En Supabase Dashboard:
1. Ve a **Storage** → Click en tu bucket de fotos
2. Settings → **Make bucket public**
3. Confirmar

Las URLs cambiarán a:
```
https://xxxxxxxxxxx.supabase.co/storage/v1/object/public/fotos/...
```

**Solución B - Generar URLs firmadas en el backend:**

Si quieres mantener el bucket privado, el backend debe generar **signed URLs** temporales:

```typescript
// En el backend (NestJS)
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class RecoleccionService {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Usar SERVICE_ROLE_KEY, NO anon key
  );

  async findOne(id: number) {
    // ... obtener recolección con fotos

    // Generar URLs firmadas (válidas por 1 hora)
    const fotosConUrlFirmada = await Promise.all(
      recoleccion.fotos.map(async (foto) => {
        const { data, error } = await this.supabase.storage
          .from('fotos')
          .createSignedUrl(foto.ruta_archivo, 3600); // 3600 segundos = 1 hora
        
        if (error) {
          console.error('Error generando URL firmada:', error);
          return foto;
        }
        
        return {
          ...foto,
          url: data.signedUrl // ✅ URL temporal con acceso
        };
      })
    );

    return {
      ...recoleccion,
      fotos: fotosConUrlFirmada
    };
  }
}
```

---

### 3️⃣ **PROBLEMA: CORS (Cross-Origin Resource Sharing)**

**Diagnóstico:** En la consola ves errores como:
```
Access to image from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solución en Supabase:**
1. Ve a **Settings** → **API**
2. En **CORS Configuration**, agrega tus dominios:
   ```
   http://localhost:5173
   http://localhost:3000
   https://tu-dominio-vercel.vercel.app
   ```

---

### 4️⃣ **PROBLEMA: El backend no devuelve las URLs correctas**

**Verificar que el backend devuelva este formato:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "fotos": [
      {
        "id": 25,
        "recoleccion_id": 1,
        "url": "https://xxxxx.supabase.co/storage/v1/object/public/fotos/archivo.jpg",
        "peso_bytes": 16384,
        "formato": "JPEG",
        "created_at": "2025-12-21T10:00:00.000Z"
      }
    ]
  }
}
```

**Campo crítico:** `url` debe ser una URL completa y accesible.

---

### 5️⃣ **DEBUGGING: Probar la URL manualmente**

1. Copia una de las URLs de foto desde la consola
2. Pégala directamente en el navegador
3. Si la imagen NO se abre → El problema está en el backend/Supabase
4. Si la imagen SÍ se abre → El problema es en el frontend (CORS o permisos)

---

## 📋 Checklist de solución

- [ ] **Verificar URLs en consola del navegador**
  - Revisar logs: `📸 Fotos recibidas del backend`
  - Ver si hay `❌ Error cargando imagen`
  
- [ ] **Probar URL directamente en navegador**
  - Copiar URL de foto
  - Pegarla en nueva pestaña
  - ¿Se abre la imagen? SÍ/NO
  
- [ ] **Configurar bucket público en Supabase**
  - Storage → Bucket → Settings
  - ✅ Make bucket public
  
- [ ] **O implementar signed URLs** (si bucket privado)
  - Usar `createSignedUrl()` en backend
  - Agregar `SUPABASE_SERVICE_ROLE_KEY` a .env
  
- [ ] **Verificar CORS en Supabase**
  - Settings → API → CORS
  - Agregar dominios permitidos
  
- [ ] **Verificar estructura de respuesta del backend**
  - Campo `url` debe existir
  - URL debe ser completa (no relativa)
  
- [ ] **Reiniciar backend después de cambios**

---

## 🧪 Ejemplo de respuesta correcta del backend

```bash
curl -X GET "http://localhost:3000/api/recolecciones/1" \
  -H "Authorization: Bearer tu-token-jwt"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fecha": "2025-12-21",
    "cantidad": 10,
    "fotos": [
      {
        "id": 25,
        "url": "https://tu-proyecto.supabase.co/storage/v1/object/public/fotos/recoleccion_1_foto_1.jpg",
        "formato": "JPEG",
        "peso_bytes": 16384
      },
      {
        "id": 26,
        "url": "https://tu-proyecto.supabase.co/storage/v1/object/public/fotos/recoleccion_1_foto_2.jpg",
        "formato": "JPEG",
        "peso_bytes": 11264
      }
    ]
  }
}
```

---

## 🔧 Cambios realizados en el frontend

✅ **Agregado en `CollectionDetailScreen.tsx`:**
- Log de fotos recibidas para debugging
- Manejo de errores de carga de imágenes (`onError`)
- Icono de error si la imagen no carga
- Botón "Ver URL" para inspeccionar cada URL

✅ **También aplica para `CollectionCard.tsx`** (lista de recolecciones)

---

## 📌 Próximos pasos

1. **Abre la consola del navegador (F12)**
2. **Navega a una recolección con fotos**
3. **Busca los logs con 📸 y 🔗**
4. **Copia la URL de una foto**
5. **Prueba abrirla en el navegador**
6. **Según el resultado, aplica la solución correspondiente**

---

**Fecha:** 21 de diciembre de 2025  
**Estado:** ⏳ En diagnóstico
