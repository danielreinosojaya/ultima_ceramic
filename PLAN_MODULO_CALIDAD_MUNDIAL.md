# Plan Maestro: Módulo Marcación 10/10 (Clase Mundial)

**Estado Actual:** ⭐⭐⭐⭐ (4/5) - Funcional pero requiere maduración
**Meta:** ⭐⭐⭐⭐⭐ (5/5) - Estándar corporativo internacional

---

## 1. VALIDACIONES ROBUSTAS (Sin implementar)

### 1.1 Prevención de Duplicados
```
PROBLEMA: Usuario marca entrada 2 veces en 1 minuto
SOLUCIÓN: 
- Bloqueo de 5 min después de clock in/out
- Error: "Ya marcaste entrada hace 2 minutos"
- Unique constraint: (employee_id, date, time_in) en rango de 5 min
```

### 1.2 Horarios Permitidos
```
PROBLEMA: Empleado marca a las 11:59 PM o 12:01 AM
SOLUCIÓN:
- Configurar horarios permitidos por empleado/turno
- Validar que marcación esté dentro de ventana ±30 min
- Log: "Marcación fuera de horario programado (permitida por admin)"
```

### 1.3 Límites Diarios
```
PROBLEMA: Empleado marca salida después de 24 horas
SOLUCIÓN:
- Máximo 12h de trabajo por día (configurable)
- Máximo 60h por semana
- Alerta: "Has trabajado 10h, considerar descanso"
```

### 1.4 Continuidad de Registro
```
PROBLEMA: Empleado marca salida sin entrada
SOLUCIÓN:
- Validar que exista time_in antes de permitir time_out
- Validar que time_out > time_in (no permitir viajes temporales)
- Validar diferencia máxima de 24h entre entrada y salida
```

---

## 2. SEGURIDAD & AUDITORÍA (Crítico)

### 2.1 Tabla de Auditoría Completa
```sql
CREATE TABLE timecard_audit_log (
  id SERIAL PRIMARY KEY,
  timecard_id INTEGER,
  employee_id INTEGER,
  action VARCHAR(50), -- 'clock_in', 'clock_out', 'admin_edit', 'admin_delete'
  old_values JSONB,   -- { time_in: "...", time_out: "..." }
  new_values JSONB,
  admin_code VARCHAR(20),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP,
  
  CONSTRAINT fk_audit_timecard FOREIGN KEY (timecard_id) REFERENCES timecards(id)
)
```

### 2.2 Prevención de Manipulación
```
- NO permitir editar time_in/time_out directamente en frontend
- Solo admin puede editar, con registro de cambio
- Hash de timestamp original para detectar manipulación
- Validación: hash(time_in_original) == hash_almacenado
```

### 2.3 Códigos de Acceso Seguros
```
PROBLEMA: Código hardcodeado "ADMIN2025"
SOLUCIÓN:
- Generar códigos únicos por admin
- Expiración de códigos cada 30 días
- Límite de intentos fallidos (3 intentos = bloqueo 15 min)
- Logs: "Admin XYZ accedió a panel a las 14:30"
```

### 2.4 Rate Limiting
```
- Máx 5 clock in/out por minuto por usuario
- Máx 100 requests por minuto al API
- Detectar patrones de ataque automatizado
```

---

## 3. MANEJO DE ERRORES & TOLERANCIA A FALLOS

### 3.1 Sincronización de Datos
```
PROBLEMA: Usuario offline, pierde marcación
SOLUCIÓN:
- Service Worker guarda localmente
- Sincronización automática cuando vuelve online
- Cola de reintentos con backoff exponencial
```

### 3.2 Recuperación de Fallos
```
PROBLEMA: PostgreSQL cae, ¿qué pasa?
SOLUCIÓN:
- Retry automático con exponential backoff (100ms, 500ms, 2s)
- Fallback a SQLite local (si disponible)
- Notificar admin si falla después de 3 reintentos
- Message: "Sistema temporal offline, intenta de nuevo"
```

### 3.3 Conflictos de Datos
```
PROBLEMA: Timestamp duplicado por error de red
SOLUCIÓN:
- Deduplicar por (employee_id, date, time_in) exacto
- Si existe, retornar el registro existente (idempotente)
- Log: "Marcación duplicada detectada, usando registro existente"
```

---

## 4. EXPERIENCIA DE USUARIO (UX)

### 4.1 Confirmación Visual Robusta
```
ACTUAL:
- Toast simple "Entrada registrada"

MEJORADO:
- Pantalla de confirmación con:
  * Nombre del empleado (verificación visual)
  * Hora exacta registrada (02:30:15 p.m.)
  * Código QR para validación futura
  * Botón "Confirmar" para doble validación
  * Tiempo de espera: 5 segundos
```

### 4.2 Retroalimentación Haptic
```
- Vibración al marcar entrada ✅
- Vibración diferente al marcar salida ❌
- Vibración de error (patrón diferente)
- Sonido opcional de confirmación
```

### 4.3 Estados Visuales Claros
```
EN PROGRESO:
- Spinner animado
- Mensaje "Procesando tu marcación..."

ÉXITO:
- Icono ✓ verde
- Transición smooth a "salida disponible"

ERROR:
- Icono ✗ rojo
- Mensaje específico del error
- Botón "Reintentar"
```

### 4.4 Accesibilidad
```
- Modo alto contraste para AdminPanel
- Tamaños de fuente ajustables (WCAG AA)
- Navegación completa con teclado
- Etiquetas ARIA para screen readers
```

---

## 5. REPORTING & ANALYTICS

### 5.1 Dashboard de Reportes
```
- Asistencia diaria: % presentes, % ausentes, % tardanzas
- Horas trabajadas por período (semanal, mensual)
- Empleados con anomalías (jornadas > 12h, < 2h)
- Patrones de tardanza
- Exportación a Excel/PDF certificado
```

### 5.2 Alertas Automáticas
```
- Empleado no marcó salida (12h pasadas)
- Empleado trabajó > 11h (recomendación de descanso)
- Patrón sospechoso detectado (entradas simultáneas de múltiples IPs)
- Cambios no autorizados en registros históricos
```

### 5.3 Compliance & Auditoría
```
- Reporte de quién editó qué y cuándo
- Trail completo de cambios (antes/después)
- Certificación legal: "Reporte generado por sistema X.Y"
- Cumple regulaciones laborales (Ecuador, IESS)
```

---

## 6. INTEGRACIONES EXTERNAS

### 6.1 Nómina Automática
```
- Export de horas trabajadas → Sistema de nómina
- Cálculo automático de extras (> 8h/día)
- Integración con API de payroll
```

### 6.2 Notificaciones
```
- Email a admin: "Empleado ausente 2 días seguidos"
- SMS al empleado: "Recordatorio: marca entrada"
- Webhook: POST a sistema externo con cambios
```

### 6.3 Biometría (Futuro)
```
- Huella dactilar en lugar de código
- Reconocimiento facial (cumplimiento GDPR)
- QR dinámico que cambia cada hora
```

---

## 7. TESTING & VALIDACIÓN

### 7.1 Tests Unitarios
```typescript
✓ validateClockIn() - Validar entrada válida
✓ validateClockOut() - Validar salida > entrada
✓ calculateHours() - Cálculo exacto de horas
✓ detectDuplicate() - Detectar marcaciones duplicadas
✓ checkBusinessHours() - Validar horarios permitidos
```

### 7.2 Tests E2E
```
✓ Usuario marca entrada → Se guarda en BD
✓ Usuario marca salida → Horas calculadas correctamente
✓ Admin edita registro → Log de auditoría creado
✓ Sincronización offline → Datos se recuperan online
✓ Error de red → Reintentos automáticos funcionan
```

### 7.3 Tests de Carga
```
- 1,000 empleados marcando simultáneamente
- 10,000 registros históricos consultados
- 100 admins viendo dashboard en tiempo real
- Latencia máxima: 200ms
```

### 7.4 Tests de Seguridad
```
✓ SQL Injection: Validar inputs
✓ CSRF Protection: Tokens validados
✓ Rate Limiting: ¿Bloquea después de 5 intentos?
✓ Timestamp Manipulation: ¿Se detecta cambio?
```

---

## 8. PERFORMANCE & ESCALABILIDAD

### 8.1 Optimizaciones
```
- Índices en (employee_id, date) para queries rápidas
- Caché de 5 min en AdminPanel
- Lazy load de históricos (paginar)
- Compresión GZIP de responses
```

### 8.2 Monitoreo
```
- Dashboard en tiempo real de:
  * Requests por segundo
  * Latencia promedio
  * Errores por minuto
  * Uptime %
- Alertas si latencia > 500ms
```

---

## 9. PLAN DE IMPLEMENTACIÓN (Secuencial)

### FASE 1: Seguridad Base (1 semana) ⚠️ CRÍTICO
- [ ] Tabla de auditoría completa
- [ ] Logs de quién cambió qué
- [ ] Códigos admin seguros (no hardcoded)
- [ ] Rate limiting
- [ ] Validación de time_out > time_in

### FASE 2: Validaciones (1 semana) ⚠️ CRÍTICO
- [ ] Prevención de duplicados (5 min)
- [ ] Horarios permitidos
- [ ] Límites diarios (12h max)
- [ ] Tests unitarios

### FASE 3: UX Mejorada (3-4 días)
- [ ] Pantalla de confirmación
- [ ] Haptic feedback
- [ ] Estados visuales claros
- [ ] Modo offline

### FASE 4: Reporting (1 semana)
- [ ] Dashboard de reportes
- [ ] Alertas automáticas
- [ ] Exportación a Excel
- [ ] Compliance

### FASE 5: Testing & Performance (1 semana)
- [ ] Tests E2E
- [ ] Tests de carga
- [ ] Optimizaciones
- [ ] Monitoreo

---

## 10. MÉTRICAS DE ÉXITO (10/10)

| Métrica | Meta |
|---------|------|
| Uptime | 99.9% |
| Latencia p95 | < 200ms |
| Tasa de errores | < 0.1% |
| Cobertura de tests | > 90% |
| Audit trail completitud | 100% |
| Detectabilidad de anomalías | > 95% |
| Satisfacción de admin | 4.8/5 |
| Seguridad (OWASP A1-A10) | 0 vulnerabilidades |

---

## 11. DEUDA TÉCNICA ACTUAL

| Deuda | Severidad | Impacto |
|-------|-----------|--------|
| Código admin hardcodeado | 🔴 CRÍTICA | Seguridad comprometida |
| Sin auditoría de cambios | 🔴 CRÍTICA | Imposible trazar cambios |
| Sin validación de duplicados | 🟠 ALTA | Datos inconsistentes |
| Timezone conversión manual | 🟠 ALTA | Errores intermitentes |
| Sin tests | 🟡 MEDIA | Regressions silenciosas |
| Sin monitoreo | 🟡 MEDIA | Downtime no detectado |

---

## SIGUIENTE PASO INMEDIATO

**Implementar Fase 1 (Seguridad Base)** - Máxima prioridad
1. Crear tabla `timecard_audit_log` 
2. Migrar auditoría de cambios
3. Implementar códigos admin dinámicos
4. Agregar validación time_out > time_in

**Estimado:** 3-4 días con testing

