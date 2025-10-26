# 🔧 Fix: "Cannot read properties of undefined (reading 'startsWith')"

## Problema
Error en runtime: `Error: Cannot read properties of undefined (reading 'startsWith')`

## Causa Raíz
El módulo `@vercel/postgres` requiere que una variable de entorno de base de datos esté configurada **antes** de inicializar. Sin esta configuración, el cliente SQL intenta validar una conexión `undefined`, lo que causa el error.

## ✅ Solución (3 pasos)

### 1. Crear archivo `.env.local`
```bash
cp .env.example .env.local
```

### 2. Configurar URL de PostgreSQL
Edita `.env.local` y agrega tu conexión de base de datos:

```env
# Opción recomendada
POSTGRES_URL=postgres://user:password@host:5432/database

# O cualquiera de estas alternativas:
# DATABASE_URL=postgres://user:password@host:5432/database
# POSTGRES_PRISMA_URL=postgres://user:password@host:5432/database
```

**¿No tienes base de datos PostgreSQL?**
- Opción 1: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (recomendado para deploy en Vercel)
- Opción 2: [Neon](https://neon.tech/) (gratis, serverless PostgreSQL)
- Opción 3: [Supabase](https://supabase.com/) (gratis con límites generosos)
- Opción 4: PostgreSQL local con Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`

### 3. Reiniciar el servidor de desarrollo
```bash
# Si usas npm run dev
npm run dev

# Si usas Vercel Dev
npm run dev:vercel
```

## 🎯 Verificación

Si la configuración es correcta, verás en la consola:
```
✅ Database connection configured
Database connectivity test passed in XXms
```

Si algo falla, verás:
```
⚠️  WARNING: No database URL found in environment variables
```

## 📋 Checklist de Troubleshooting

- [ ] Archivo `.env.local` existe en la raíz del proyecto
- [ ] Una de estas variables está configurada: `POSTGRES_URL`, `DATABASE_URL`, o `POSTGRES_PRISMA_URL`
- [ ] La URL de conexión tiene formato válido: `postgres://user:password@host:port/database`
- [ ] El servidor de desarrollo fue reiniciado después de cambiar `.env.local`
- [ ] La base de datos PostgreSQL está accesible desde tu máquina

## 🚀 Cambios Realizados

1. **`api/db.ts`**: Ahora muestra WARNING en lugar de lanzar error fatal cuando no hay DB configurada
2. **`.env.example`**: Archivo de ejemplo con todas las configuraciones necesarias
3. **`.env.local`**: Archivo local (ignorado por git) para tu configuración personal

## ⚠️ Nota para Deployment en Vercel

En Vercel, configura las variables de entorno en:
```
Project Settings → Environment Variables
```

Agrega `POSTGRES_URL` con tu connection string de Vercel Postgres o tu proveedor de DB.
