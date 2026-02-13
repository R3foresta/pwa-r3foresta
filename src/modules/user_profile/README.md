# Módulo de Perfil de Usuario

Este módulo maneja el flujo de "Completar Perfil" después del registro/login con WebAuthn.

## Estructura

```
src/modules/user_profile/
├── types.ts                    # Tipos para perfil y formulario
├── profile.service.ts          # Servicio para API de backend
├── CompleteProfileScreen.tsx   # Pantalla de completar perfil
└── index.ts                    # Exportaciones del módulo
```

## Flujo Completo

### 1. Autenticación
- Usuario se registra/loguea con WebAuthn
- El backend retorna un objeto `User` que puede tener campos de perfil null/undefined

### 2. Detección de Perfil Incompleto
- `ProfileService.isProfileComplete()` verifica si `doc_identidad`, `apellido` y `nombre` están presentes
- Si faltan datos: redirección automática a `/complete-profile`
- Si están completos: redirección normal a `/app/home`

### 3. Pantalla de Completar Perfil
- Formulario obligatorio con campos requeridos y opcionales
- Validaciones en tiempo real
- Integración con backend mediante `ProfileService.completeProfile()`

### 4. Integración con Backend

#### Endpoint: `POST /api/users/register-form`
- **Auth**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "nombre": "Juan",
  "apellido": "Perez", 
  "doc_identidad": "12345678",
  "wallet_address": "0x123...", 
  "organizacion": "Mi Empresa",
  "contacto": "+51987654321",
  "rol": "GENERAL"
}
```

#### Respuestas:
- **201/200**: Perfil completado exitosamente
- **409 Conflict**: Documento o wallet ya registrados
- **400 Bad Request**: Datos inválidos

### 5. Manejo de Estado
- `AuthContext` actualizado con `isProfileComplete`
- `ProtectedRoute` verifica perfil completo antes de acceso
- Redirección automática según estado del perfil

## Validaciones

### Campos Obligatorios
- **Nombre**: No vacío
- **Apellido**: No vacío, máximo 30 caracteres  
- **Documento de Identidad**: No vacío

### Campos Opcionales con Validación
- **Wallet Address**: Formato Ethereum `^0x[0-9a-fA-F]{40}$`
- **Contacto**: Formato internacional `^\+\d{7,15}$`

## Rutas

- `/complete-profile` - Pantalla de completar perfil (acceso especial)
- Todas las rutas protegidas verifican perfil completo automáticamente

## Estados de Usuario

1. **No autenticado** → `/auth/login`
2. **Autenticado + Perfil incompleto** → `/complete-profile`  
3. **Autenticado + Perfil completo** → `/app/home`

## Integración

El módulo se integra automáticamente con:
- ✅ AuthContext (gestión de estado)
- ✅ Rutas protegidas (verificación automática)
- ✅ WebAuthn Service (actualización post-auth)
- ✅ Backend API (persistencia de datos)

## Puntos Clave

- **Una sola vez por usuario**: Una vez completado, no vuelve a mostrar la pantalla
- **Obligatorio**: No se puede acceder al resto de la app sin completar  
- **Persistente**: Los datos se guardan en backend y actualizan el contexto local
- **Validaciones robustas**: Tanto frontend como backend 
- **Manejo de errores**: Feedback específico para conflictos y validaciones