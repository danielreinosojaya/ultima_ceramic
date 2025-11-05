# Control de Asistencia - Guía de Acceso

## � Primer Acceso - Inicialización de Base de Datos

**IMPORTANTE: Ejecutar UNA SOLA VEZ antes de usar el módulo**

Abrir en navegador (copiar y pegar en la barra de direcciones):
```
http://localhost:3000/api/setup?token=setup_ceramic_2025
```

Deberías ver:
```json
{
  "success": true,
  "message": "Base de datos inicializada correctamente",
  "timestamp": "2025-11-01T..."
}
```

Si ya ves este mensaje con `"success": true`, **ya no necesitas volver a ejecutarlo**.

---

## �📋 Acceso al Panel de Administración

### URL Recomendada
```
/?module=timecards
```

Este acceso usa automáticamente el código admin por defecto: `ADMIN2025`

### URL Alternativa (con código explícito)
```
/?admin=true&code=ADMIN2025&module=timecards
```

## 🔐 Credenciales por Defecto

| Campo | Valor |
|-------|-------|
| Código Admin | `ADMIN2025` |
| Estado | Activo ✅ |

---

## 🚀 Funcionalidades del Panel

### Dashboard
- 📊 Estadísticas en tiempo real
- 👥 Total de empleados
- ✅ Presentes hoy
- ❌ Ausentes
- ⏰ Tardanzas
- 📈 Promedio de horas trabajadas

### Gestión de Empleados
- ➕ Crear nuevos empleados
- 👥 Listar todos los empleados
- 📋 Ver historial de marcaciones

### Reportes
- 📥 Descargar en formato CSV
- 📊 Datos filtrados por rango de fechas
- 📈 Análisis de productividad

## 🔄 Actualizaciones Automáticas

- Dashboard se actualiza automáticamente cada 60 segundos
- Sin recargas forzadas que causen saltos visuales
- Limpeza de intervalos al desmontar componente

## ⚙️ Parámetros de Configuración

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `module` | `timecards` | Activa el módulo de control de asistencia |
| `code` | `ADMIN2025` | Código de administrador (opcional, usa defecto si no se especifica) |
| `admin` | `true` | Activa modo administrador (opcional para timecards) |

## 🔧 Troubleshooting

### Error: "Base de datos no inicializada"
**Solución**: Ejecuta el endpoint de setup primero
```
http://localhost:3000/api/setup?token=setup_ceramic_2025
```

### Error: "Código admin inválido"
**Solución**: Asegúrate de estar usando `ADMIN2025` o ejecuta setup

### Error: "El código de empleado ya existe"
**Solución**: Usa un código diferente (EMP001, EMP002, etc)


