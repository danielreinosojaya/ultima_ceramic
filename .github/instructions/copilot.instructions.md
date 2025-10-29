---
applyTo: '**'
---
# Instrucciones para GitHub Copilot - Ultima Ceramic

## 🎯 Comportamiento Esperado

- **Respuestas directas**: Sin explicaciones innecesarias. Ve directo al grano.
- **Acción sobre palabras**: Usa herramientas de edición en lugar de mostrar código en bloques.
- **Verificación automática**: Siempre ejecuta `npm run build` después de cambios para confirmar.
- **Sin documentación extra**: No crees archivos .md de resumen a menos que se pida explícitamente.
- **Contexto mínimo**: Lee solo los archivos necesarios, no todo el workspace.

## 📚 Stack Tecnológico del Proyecto

### Frontend
- **React 18+** con TypeScript estricto
- **Vite 6.3.5** como build tool
- **Tailwind CSS** para estilos
- **Heroicons** para iconografía

### Backend
- **Vercel Serverless Functions** (`/api/*`)
- **PostgreSQL** vía Vercel Postgres (librería `@vercel/postgres`)
- **API RESTful** con parámetro `?action=` para routing

### Estado & Datos
- **Context API**: `AdminDataContext` para estado global del admin panel
- **Cache manual**: Sistema de 5 minutos con invalidación explícita
- **DataService**: Capa de abstracción en `/services/dataService.ts`

### Arquitectura de Datos
```
/api/data.ts → SQL → toCamelCase() → dataService.ts → Context → Components
```

## 🏗️ Estructura del Proyecto

```
/api/                    # Serverless functions (backend)
  ├── classes.ts         # Endpoint clases disponibles
  ├── data.ts            # Endpoint principal CRUD
  ├── giftcards.ts       # Gestión gift cards
  └── emailService.ts    # Envío emails

/components/             # Componentes React
  ├── admin/             # Panel administración
  ├── giftcard/          # UI gift cards
  └── icons/             # Componentes SVG

/services/               # Lógica de negocio frontend
  └── dataService.ts     # Abstracción API calls

/context/                # Providers React
  ├── AdminDataContext.tsx    # Estado global admin
  └── LanguageContext.tsx     # i18n

/utils/                  # Utilidades
  └── formatters.ts      # formatDate, formatCurrency, etc.

/types/                  # TypeScript interfaces
  └── types.ts           # Tipos compartidos
```

## 🔧 Flujo de Trabajo Estándar

### Para Bug Fixes
1. **Identifica** el archivo exacto y líneas afectadas
2. **Lee contexto** mínimo necesario (no todo el archivo)
3. **Aplica fix** con `replace_string_in_file`
4. **Verifica** con `npm run build`
5. **Confirma** éxito o reporta error

### Para Nuevas Features
1. **Analiza** componentes existentes similares
2. **Identifica** archivos a modificar (backend + frontend + types)
3. **Implementa** cambios en orden: types → backend → service → UI
4. **Verifica** cada capa con build
5. **Prueba** integración completa

### Para Refactors
1. **Usa** `semantic_search` para encontrar todas las referencias
2. **Lista** archivos impactados
3. **Modifica** en orden de dependencias (de bajo a alto nivel)
4. **Verifica** después de cada cambio mayor

## 📐 Convenciones de Código

### TypeScript
```typescript
// ✅ BIEN: Interfaces explícitas
interface CustomerDetailViewProps {
    customer: Customer;
    onBack: () => void;
    onDataChange: () => void;
}

// ❌ MAL: Props implícitos o any
function Component(props: any) { }
```

### Naming
- **camelCase**: variables, funciones (`handleDeleteCustomer`, `rescheduleBookingSlot`)
- **PascalCase**: componentes, interfaces (`CustomerDetailView`, `Booking`)
- **UPPER_SNAKE_CASE**: constantes (`MAX_CAPACITY`, `DEFAULT_TIMEOUT`)

### React Patterns
```typescript
// ✅ BIEN: Functional components con hooks
function MyComponent({ prop }: Props) {
    const [state, setState] = useState(initial);
    
    useEffect(() => {
        // side effects
    }, [dependencies]);
    
    return <div>...</div>;
}

// ❌ MAL: Class components
class MyComponent extends React.Component { }
```

### Estado Local
```typescript
// ✅ BIEN: Estado consolidado cuando relacionado
const [state, setState] = useState({
    activeTab: 'info',
    editMode: false,
    selectedItem: null
});

// Actualización con spread
setState(prev => ({ ...prev, activeTab: 'schedule' }));
```

### API Calls
```typescript
// ✅ BIEN: Usar dataService
const result = await dataService.rescheduleBookingSlot(id, oldSlot, newSlot);

// ❌ MAL: Fetch directo desde componentes
const res = await fetch('/api/data?action=...');
```

## 🔍 Debugging Guidelines

### Para errores TypeScript
1. Verifica que imports estén correctos
2. Confirma que interfaces coincidan con uso real
3. Revisa que no haya código fuera del scope del componente
4. Valida que haya solo UN `export default` al final

### Para problemas de datos
1. **Backend**: Verifica que endpoint retorne datos en formato correcto
2. **Cache**: Invalida cache con `invalidateBookingsCache()` o `refreshCritical()`
3. **Context**: Confirma que context se actualice después de mutations
4. **UI**: Asegura que componente use datos frescos del context

### Para problemas de build
1. Ejecuta `npm run build` para ver errores reales
2. No confíes solo en errores del editor
3. Verifica imports de archivos que existan
4. Confirma que tipos exportados sean accesibles

## ⚡ Comandos de Control (User Shortcuts)

Cuando el usuario diga:

- **"Proceder"** → Implementa lo propuesto inmediatamente sin más explicaciones
- **"Build"** / **"Verifica"** → Ejecuta `npm run build`
- **"Commit y push"** → Guarda cambios con mensaje descriptivo y push
- **"Fix"** → Analiza, identifica problema, implementa solución, verifica
- **"Menos charla"** → Reduce explicaciones al mínimo
- **"Dame contexto"** → Lee archivos relevantes antes de responder
- **"Hazlo"** → Ejecuta la última acción propuesta

## 🚨 Anti-Patterns (Evitar)

### ❌ No hagas esto:
```typescript
// Múltiples exports default
export default function A() {}
export default function B() {}  // ERROR

// Código fuera del componente (sin const/function)
const MyComponent = () => {};
useState(); // ERROR: Hook fuera de componente
```

### ❌ No des vueltas:
```
Usuario: "Tengo un error en CustomerDetailView"

MAL: "Entiendo tu problema. Para ayudarte necesito que me compartas 
más información. ¿Podrías decirme qué error específico estás viendo? 
También sería útil saber en qué contexto ocurre..."

BIEN: *Lee CustomerDetailView.tsx directamente* 
"Encontré 3 errores TypeScript en líneas 45, 78, 120. Procediendo a corregir."
*Aplica fixes*
*Ejecuta build*
"✅ Resuelto. 0 errores."
```

## 📋 Patterns Comunes del Proyecto

### Cache Invalidation
```typescript
// Invalidar cache específico
invalidateBookingsCache();
invalidateCustomersCache();

// Forzar refresh ignorando cache
adminData.refreshCritical();
```

### Modales
```typescript
// State del modal
const [modalOpen, setModalOpen] = useState(false);

// Abrir
<button onClick={() => setModalOpen(true)}>Abrir</button>

// Modal
{modalOpen && (
    <Modal onClose={() => setModalOpen(false)} />
)}
```

### Backend Response Pattern
```typescript
// ✅ Siempre retornar objeto consistente
return new Response(JSON.stringify({
    success: true,
    data: toCamelCase(result),
    error: null
}));

// En caso de error
return new Response(JSON.stringify({
    success: false,
    data: null,
    error: 'Descripción del error'
}), { status: 400 });
```

### Formateo de Datos
```typescript
// Siempre usar utilidades
import { formatDate, formatCurrency } from '../../utils/formatters';

// Fechas
formatDate(slot.date) // "28 de octubre, 2025"

// Moneda
formatCurrency(payment.amount) // "$50.00"
```

## 🎯 Casos de Uso Frecuentes

### "Agregar nuevo campo a Customer"
1. Actualiza `types.ts` → interface `Customer`
2. Modifica `/api/data.ts` → SQL queries relevantes
3. Actualiza `CustomerDetailView.tsx` → UI para mostrar/editar
4. Verifica con build

### "Crear nuevo endpoint"
1. Agrega case en `/api/data.ts`
2. Implementa SQL query con manejo de errores
3. Retorna con `toCamelCase()`
4. Crea función en `dataService.ts`
5. Usa desde componente
6. Verifica con build

### "Fix propagación de datos"
1. **Backend**: Confirma que retorne datos actualizados
2. **Service**: Invalida cache después de mutation
3. **Context**: Usa `refreshCritical()` si es cambio crítico
4. **UI**: Espera 300-500ms para propagación

### "Reagendar clase"
```typescript
// 1. Llamar service
await dataService.rescheduleBookingSlot(bookingId, oldSlot, newSlot);

// 2. Invalidar cache
invalidateBookingsCache();

// 3. Refresh context
adminData.refreshCritical();

// 4. Esperar propagación
await new Promise(resolve => setTimeout(resolve, 500));
```

## 💡 Tips de Eficiencia

1. **Lee archivos en paralelo** cuando sea posible:
   ```
   read_file(types.ts) + read_file(component.tsx) + read_file(service.ts)
   ```

2. **Usa grep_search para overview** en lugar de leer archivo completo

3. **Busca referencias antes de cambiar interfaces**:
   ```
   list_code_usages(symbolName: "Customer")
   ```

4. **Para cambios estructurales, reescribe el archivo completo** en lugar de patches

5. **Verifica build ANTES de commit**

## 🔒 Reglas Estrictas

1. **NUNCA** modifiques la base de datos directamente sin pasar por el endpoint
2. **SIEMPRE** usa `toCamelCase()` al retornar datos del backend
3. **SIEMPRE** invalida cache después de mutations (POST/PUT/DELETE)
4. **NUNCA** uses `any` en TypeScript a menos que sea absolutamente necesario
5. **SIEMPRE** maneja errores con try/catch en operaciones async
6. **NUNCA** crees componentes de clase, solo funcionales
7. **SIEMPRE** verifica con build antes de confirmar que algo funciona

---

**Versión**: 1.0  
**Última actualización**: Octubre 2025  
**Mantenido por**: Daniel Reinoso
