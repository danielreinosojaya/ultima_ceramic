# 🚨 REPORTE DE INCIDENTE DE SEGURIDAD
**Fecha:** 30 de enero, 2026  
**Severidad:** CRÍTICA  
**Estado:** Remediación Parcial Completada

---

## 📋 Resumen Ejecutivo

Se detectó exposición de credenciales de PostgreSQL (Neon DB) en repositorio público de GitHub a través de alertas de GitGuardian.

**Credenciales expuestas:**
- ✅ PostgreSQL connection string (Neon DB)
- ✅ Resend API Key

**Archivos comprometidos:**
1. `fix-valentine-columns.ts`
2. `test-valentine-direct.ts`
3. `test-valentine-real-complete.ts`

---

## ✅ Acciones Completadas

### 1. Eliminación de archivos del repositorio ✓
```bash
git rm fix-valentine-columns.ts test-valentine-direct.ts test-valentine-real-complete.ts
git commit -m "security: remove files with exposed credentials"
```

### 2. Limpieza del historial Git ✓
```bash
brew install git-filter-repo
git-filter-repo --path fix-valentine-columns.ts --invert-paths --force
git-filter-repo --path test-valentine-direct.ts --invert-paths --force
git-filter-repo --path test-valentine-real-complete.ts --invert-paths --force
git push --force origin gif
```

**Resultado:** 581 commits reescritos, historial completamente limpio.

### 3. Prevención de futuros leaks ✓
Actualizado `.gitignore`:
```gitignore
# Test & script files (pueden contener credenciales hardcodeadas)
/test-*.ts
/fix-*.ts
/diagnostic-*.ts
/verify-*.ts
/cleanup-*.ts
/create-table.ts
/test-*.js
```

---

## ⚠️ ACCIONES PENDIENTES URGENTES

### 🔴 1. Rotar credenciales de Neon DB (INMEDIATO)

La contraseña expuesta fue: `npg_u3IwbrHza6iW`

**Pasos a seguir:**

#### A. Ir a Neon Dashboard
1. Acceder a https://console.neon.tech/
2. Seleccionar proyecto `ultima_ceramic`
3. Ir a Settings → General → Reset password

#### B. Generar nueva contraseña
1. Click en "Reset password" para `neondb_owner`
2. Guardar nueva contraseña en 1Password/gestor de contraseñas
3. Copiar nueva connection string

#### C. Actualizar en Vercel
1. Ir a https://vercel.com/danielreinosojaya/ultima-ceramic/settings/environment-variables
2. Editar variable `POSTGRES_URL`
3. Pegar nueva connection string
4. Aplicar a todos los environments (Production, Preview, Development)
5. Click "Save"
6. **IMPORTANTE:** Redeploy la aplicación después de cambiar variables

#### D. Actualizar localmente
1. Editar `.env.local` (NUNCA commitear este archivo)
2. Actualizar `POSTGRES_URL=postgresql://neondb_owner:NUEVA_PASSWORD@ep-solitary-pine-adetktsg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`
3. Verificar que `.env*.local` esté en `.gitignore`

### 🔴 2. Rotar Resend API Key (INMEDIATO)

La API key expuesta fue: `re_WaNRU4c6_PXcwwTJHrb88nD1zSx2QeMdo`

**Pasos a seguir:**

#### A. Ir a Resend Dashboard
1. Acceder a https://resend.com/api-keys
2. Identificar key expuesta
3. Click en "Delete" para revocar key comprometida

#### B. Crear nueva API key
1. Click "Create API Key"
2. Nombre: `Ceramicalma Production - Jan 2026`
3. Permisos: Sending access
4. Click "Create"
5. **IMPORTANTE:** Copiar inmediatamente (solo se muestra una vez)
6. Guardar en 1Password/gestor de contraseñas

#### C. Actualizar en Vercel
1. Ir a https://vercel.com/danielreinosojaya/ultima-ceramic/settings/environment-variables
2. Editar variable `RESEND_API_KEY`
3. Pegar nueva API key
4. Aplicar a todos los environments
5. Click "Save"
6. **IMPORTANTE:** Redeploy la aplicación

#### D. Actualizar localmente
1. Editar `.env.local`
2. Actualizar `RESEND_API_KEY=re_NUEVA_KEY`
3. Verificar funcionamiento con test local

---

## 🔒 Mejores Prácticas Implementadas

### ✅ Variables de entorno
```typescript
// ✅ CORRECTO: Usar variables de entorno
const connectionString = process.env.POSTGRES_URL;

// ❌ INCORRECTO: Hardcodear credenciales
const connectionString = 'postgresql://user:pass@host/db';
```

### ✅ Archivos de test
Los scripts de test ahora DEBEN cargar credenciales desde `.env.local`:
```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar .env.local
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        process.env[match[1].trim()] = match[2].trim();
    }
});
```

### ✅ .gitignore actualizado
Todos los archivos de test y scripts están excluidos del repositorio para prevenir futuros leaks.

---

## 📊 Análisis de Impacto

### Exposición temporal
- **Inicio:** Commit `c6edb87` (29 enero 2026)
- **Detección:** GitGuardian alert (30 enero 2026)
- **Remediación:** 30 enero 2026
- **Duración:** ~24 horas

### Posible acceso no autorizado
- ⚠️ Las credenciales estuvieron públicas por ~24 horas
- ⚠️ Cualquiera con acceso al repositorio pudo verlas
- ⚠️ GitGuardian las detectó, otros scanners también pudieron hacerlo

### Datos potencialmente comprometidos
- ✅ Base de datos completa de Ceramicalma
- ✅ Capacidad de enviar emails desde `cmassuh@ceramicalma.com`
- ❌ No hay evidencia de acceso no autorizado hasta ahora

---

## 🔍 Monitoreo Post-Incidente

### Verificar logs de Neon DB
1. Ir a Neon Dashboard → Monitoring
2. Revisar conexiones inusuales en últimas 24h
3. Buscar IPs desconocidas o queries sospechosas

### Verificar logs de Resend
1. Ir a Resend Dashboard → Logs
2. Revisar emails enviados en últimas 24h
3. Confirmar que solo sean transaccionales legítimos

### Verificar integridad de datos
```sql
-- Verificar últimas modificaciones
SELECT table_name, COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar registros recientes sospechosos
SELECT * FROM valentine_registrations 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 📝 Checklist de Remediación

- [x] Eliminar archivos con credenciales del repo
- [x] Limpiar historial Git completamente
- [x] Force push de rama limpia a GitHub
- [x] Actualizar .gitignore para prevenir futuros leaks
- [x] Documentar incidente y pasos de remediación
- [ ] **PENDIENTE:** Rotar contraseña de Neon DB
- [ ] **PENDIENTE:** Rotar Resend API key
- [ ] **PENDIENTE:** Actualizar variables en Vercel
- [ ] **PENDIENTE:** Redeploy aplicación en Vercel
- [ ] **PENDIENTE:** Verificar logs de acceso a BD
- [ ] **PENDIENTE:** Verificar logs de envío de emails
- [ ] **PENDIENTE:** Confirmar que aplicación funciona con nuevas credenciales

---

## 🎓 Lecciones Aprendidas

1. **NUNCA hardcodear credenciales en código**
   - Usar siempre variables de entorno
   - `.env.local` NUNCA debe commitearse

2. **Scripts de test deben cargar .env.local**
   - No copiar/pegar credenciales "solo para testing"
   - Un test temporal puede convertirse en permanent leak

3. **GitGuardian es tu amigo**
   - Actuar inmediatamente ante alertas
   - No ignorar warnings de seguridad

4. **git-filter-repo es esencial**
   - `git rm` NO es suficiente
   - El historial debe limpiarse completamente

5. **.gitignore preventivo**
   - Excluir patrones de archivos riesgosos
   - Scripts, tests, y archivos temporales fuera del repo

---

## 📞 Contactos

**Equipo de Seguridad:**
- Daniel Reinoso (desarrollador)

**Servicios Afectados:**
- Neon DB: https://console.neon.tech/
- Resend: https://resend.com/
- Vercel: https://vercel.com/

---

**Última actualización:** 30 enero 2026, 5:39 PM  
**Próxima revisión:** Después de rotar credenciales
