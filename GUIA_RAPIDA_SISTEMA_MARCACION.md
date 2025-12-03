# 📱 GUÍA RÁPIDA - Sistema de Marcación de Horarios

## Para Empleados

### ✅ Marcar Entrada

1. Ingresa tu código personal (ej: EMP001)
2. Haz clic en el botón **"✅ Entrada"**
3. El sistema solicitará tu ubicación (si está configurado)
4. Verás confirmación: "Entrada registrada correctamente a las 07:46 a.m."

### 🚪 Marcar Salida

1. Haz clic en el botón **"🚪 Salida"** (solo disponible después de marcar entrada)
2. El sistema solicitará tu ubicación
3. Verás confirmación con horas trabajadas: "Salida registrada correctamente a las 04:30 p.m. Horas trabajadas: 8.75h"

### 📊 Ver tu Estado Hoy

En la sección "📍 Hoy" verás:
- **Entrada:** Hora exacta de entrada
- **Salida:** Hora exacta de salida (si ya marcaste)
- **Horas trabajadas:** Total de horas del día

---

## Para Administradores

### 📈 Dashboard Principal

**Acceso:** Panel Admin → Pestaña "📈 Dashboard"

#### Información Mostrada:

| Métrica | Descripción |
|---------|------------|
| 👥 Total Empleados | Cantidad de empleados activos |
| ✅ Presentes Hoy | Empleados que marcaron entrada |
| ❌ Ausentes | Empleados sin marcar entrada |
| ⏰ Tardanzas | Empleados que llegaron tarde |
| 📊 Promedio de horas | Promedio de horas trabajadas hoy |

#### Tabla de Empleados:

Muestra estado actual de cada empleado:

```
Empleado    | Código | Entrada      | Salida       | Horas        | Estado
------------|--------|--------------|--------------|--------------|----------
Juan Pérez  | EMP001 | 07:46 a.m.   | 04:30 p.m.   | 8.75h        | ✅ Presente
María López | EMP002 | 08:15 a.m.   | -            | ⏳ 7.50h (7h 30m) | ⏳ En progreso
Carlos Ruiz | EMP003 | -            | -            | -            | ❌ Ausente
```

**Indicadores:**
- ✅ Presente: Entrada y salida registradas
- ⏳ En progreso: Entrada registrada, sin salida (muestra horas en tiempo real)
- ⏰ Tardanza: Llegó después de la hora esperada
- ❌ Ausente: No marcó entrada

### 👥 Gestión de Empleados

**Acceso:** Panel Admin → Pestaña "👥 Empleados"

#### Crear Nuevo Empleado:

1. Haz clic en "➕ Nuevo Empleado"
2. Completa los datos:
   - **Código:** EMP001, EMP002, etc (único)
   - **Nombre:** Nombre completo
   - **Email:** (opcional)
   - **Puesto:** Cargo del empleado
3. Haz clic en "✅ Crear"

#### Acciones por Empleado:

- **⏱️ Horarios:** Configura horarios de entrada/salida esperados
- **📋 Historial:** Ver todas las marcaciones del empleado
- **🗑️ Eliminar:** Desactivar o eliminar empleado

### 📋 Historial de Empleado

**Acceso:** Panel Admin → Pestaña "👥 Empleados" → Seleccionar empleado → "📋 Historial"

Muestra todas las marcaciones del mes actual:

```
Fecha      | Entrada      | Salida       | Horas  | Acciones
-----------|--------------|--------------|--------|----------
27 nov     | 07:46 a.m.   | 04:30 p.m.   | 8.75h  | ✏️ Editar 🗑️ Eliminar
26 nov     | 08:15 a.m.   | 05:00 p.m.   | 8.75h  | ✏️ Editar 🗑️ Eliminar
25 nov     | -            | -            | -      | ✏️ Editar 🗑️ Eliminar
```

#### Editar Marcación:

1. Haz clic en "✏️ Editar"
2. Modifica entrada, salida o notas
3. Haz clic en "💾 Guardar"

#### Eliminar Marcación:

1. Haz clic en "🗑️ Eliminar"
2. Confirma la eliminación
3. Se registra en auditoría automáticamente

### 📊 Reportes Mensuales

**Acceso:** Panel Admin → Pestaña "📊 Reportes"

#### Generar Reporte:

1. Selecciona **Año** y **Mes**
2. Haz clic en "Generar Reporte"
3. Se muestra resumen y detalles por empleado

#### Información del Resumen:

```
📊 Resumen - Noviembre 2025
├─ 👥 Empleados: 15
├─ 📊 Horas totales: 1,240.5h
├─ 📅 Días trabajados: 300
└─ ⏰ Tardanzas: 12
```

#### Detalles por Empleado:

Haz clic en un empleado para expandir y ver:

- **Horas totales:** Total de horas del mes
- **Días trabajados:** Cantidad de días con entrada
- **Días ausentes:** Días sin marcar entrada
- **Tardanzas:** Cantidad de llegadas tarde
- **Promedio/día:** Horas promedio por día trabajado
- **Productividad:** Indicador visual (Excelente/Bueno/Regular/Bajo)

#### Indicador de Productividad:

```
████████░░ Excelente (≥90% de 8h/día)
██████░░░░ Bueno (≥75% de 8h/día)
████░░░░░░ Regular (≥60% de 8h/día)
██░░░░░░░░ Bajo (<60% de 8h/día)
```

#### Descargar Reporte:

1. Haz clic en "📥 Descargar CSV"
2. Se descarga archivo con todos los datos
3. Puedes abrir en Excel para análisis adicional

### ⏰ Tardanzas

**Acceso:** Panel Admin → Pestaña "⏰ Tardanzas"

Muestra empleados que llegaron tarde:

```
Empleado    | Fecha  | Horario Esperado | Horario Real | Retraso | Tipo
------------|--------|------------------|--------------|---------|--------
Juan Pérez  | 27 nov | 08:00 a.m.       | 08:15 a.m.   | 15 min  | Leve
María López | 26 nov | 08:00 a.m.       | 08:45 a.m.   | 45 min  | Grave
```

**Tipos de Tardanza:**
- 🟢 Leve: ≤15 minutos
- 🟡 Normal: 16-30 minutos
- 🔴 Grave: >30 minutos

### 📍 Ubicaciones (Geofences)

**Acceso:** Panel Admin → Pestaña "📍 Ubicaciones"

Configura ubicaciones permitidas para marcar entrada:

#### Crear Geofence:

1. Haz clic en "➕ Nuevo Geofence"
2. Ingresa:
   - **Nombre:** Ej: "Oficina Principal"
   - **Latitud/Longitud:** Coordenadas del lugar
   - **Radio:** Distancia permitida en metros (ej: 200m)
3. Haz clic en "✅ Crear"

#### Validación:

- Si empleado está dentro del radio → ✅ Permite marcar
- Si empleado está fuera del radio → ❌ Rechaza con distancia

---

## 🎯 Casos de Uso Comunes

### Caso 1: Empleado Olvida Marcar Salida

1. Ir a "👥 Empleados" → Seleccionar empleado → "📋 Historial"
2. Buscar el día en cuestión
3. Haz clic en "✏️ Editar"
4. Ingresa hora de salida correcta
5. Haz clic en "💾 Guardar"

### Caso 2: Verificar Horas de Empleado Específico

1. Ir a "👥 Empleados"
2. Haz clic en "📋 Historial" del empleado
3. Se muestra historial del mes actual
4. Puedes ver todas las marcaciones y horas

### Caso 3: Generar Reporte para Nómina

1. Ir a "📊 Reportes"
2. Seleccionar mes y año
3. Haz clic en "Generar Reporte"
4. Haz clic en "📥 Descargar CSV"
5. Abre en Excel y usa para cálculo de nómina

### Caso 4: Identificar Empleados con Bajo Rendimiento

1. Ir a "📊 Reportes"
2. Generar reporte del mes
3. Buscar empleados con indicador "Bajo" en productividad
4. Revisar detalles de horas trabajadas

---

## ⚙️ Configuración Recomendada

### Horarios Esperados:

- **Entrada:** 08:00 a.m.
- **Salida:** 05:00 p.m.
- **Período de gracia:** 10 minutos

### Geofence:

- **Radio:** 200-500 metros (según tamaño de oficina)
- **Ubicación:** Centro de la oficina

### Polling del Dashboard:

- Automático cada 30 segundos si hay empleados activos
- Automático cada 5 minutos si no hay actividad

---

## 🆘 Solución de Problemas

### Problema: Horas Mostradas como "-h"

**Solución:** 
- Si empleado está en progreso, verá "⏳ X.XXh (XhYYm)"
- Si no hay datos, verá "-"
- Recarga la página si no se actualiza

### Problema: Empleado No Puede Marcar Entrada

**Posibles Causas:**
1. Empleado no existe → Crear en "👥 Empleados"
2. Empleado está inactivo → Reactivar
3. Está fuera del geofence → Acercarse a la ubicación permitida
4. Ya marcó entrada → Debe marcar salida primero

### Problema: Horas Incorrectas en Reporte

**Solución:**
1. Verificar entrada y salida en historial
2. Editar si es necesario
3. Recargar reporte

---

## 📞 Contacto y Soporte

Para problemas técnicos o preguntas:
- Contacta al administrador del sistema
- Verifica que tu navegador esté actualizado
- Limpia caché si hay problemas de visualización

---

**Última actualización:** 27 de Noviembre de 2025
**Versión:** 2.0 (Con mejoras de visibilidad de horas)
