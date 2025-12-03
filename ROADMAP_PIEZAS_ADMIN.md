# Roadmap Técnico: Sistema de Piezas y Experiencias Grupales

## 🎯 Objetivo Final
Admin puede:
1. ✅ Gestionar catálogo de piezas (CRUD + fotos)
2. ✅ Crear experiencias grupales manualmente (fecha, participantes, técnicas)
3. ✅ Ver ocupación de capacidad por técnica
4. ✅ Calcular precio total automático

Clientes pueden:
1. ✅ Ver piezas disponibles en wizard
2. ✅ Elegir piezas al reservar experiencia grupal
3. ✅ Ver precio final antes de confirmar

---

## 📋 FASE 1: Tabla de Piezas en Base de Datos

### 1.1 Crear tabla `pieces`

**Ubicación:** `/api/db.ts` - función `initializeDatabase()`

```sql
CREATE TABLE IF NOT EXISTS pieces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2),
  image_url VARCHAR(500),
  difficulty VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  category VARCHAR(100), -- 'bowl', 'plate', 'mug', 'vase', 'other'
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Tareas:**
- [ ] Editar `/api/db.ts`
- [ ] Agregar CREATE TABLE statement
- [ ] Seed con 5-10 piezas de ejemplo

---

## 📋 FASE 2: Endpoints Backend para Piezas

### 2.1 Endpoint GET - Obtener todas las piezas

**Ruta:** POST `/api/data?action=getPieces`

```typescript
// api/data.ts

case 'getPieces': {
  try {
    const { rows: pieces } = await sql`
      SELECT * FROM pieces 
      WHERE is_active = true 
      ORDER BY sort_order ASC, created_at DESC
    `;
    return res.status(200).json({
      success: true,
      pieces: pieces.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        basePrice: p.base_price,
        imageUrl: p.image_url,
        difficulty: p.difficulty,
        category: p.category,
        isActive: p.is_active
      }))
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pieces' 
    });
  }
}
```

**Tareas:**
- [ ] Agregar caso en `handleAction()`
- [ ] Hacer query a tabla `pieces`
- [ ] Retornar con camelCase
- [ ] Manejar errores

---

### 2.2 Endpoint POST - Crear pieza

**Ruta:** POST `/api/data?action=addPiece`

```typescript
case 'addPiece': {
  const { name, description, basePrice, imageUrl, difficulty, category } = req.body;
  
  if (!name || !basePrice) {
    return res.status(400).json({ error: 'name and basePrice required' });
  }
  
  try {
    const { rows: [piece] } = await sql`
      INSERT INTO pieces (name, description, base_price, image_url, difficulty, category, is_active)
      VALUES (${name}, ${description}, ${basePrice}, ${imageUrl}, ${difficulty}, ${category}, true)
      RETURNING *
    `;
    
    return res.status(200).json({
      success: true,
      piece: toCamelCase(piece)
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create piece' 
    });
  }
}
```

**Tareas:**
- [ ] Agregar validación de campos
- [ ] Insertar en BD
- [ ] Retornar pieza creada

---

### 2.3 Endpoint PUT - Editar pieza

**Ruta:** POST `/api/data?action=updatePiece`

```typescript
case 'updatePiece': {
  const { id, name, description, basePrice, imageUrl, difficulty, category, isActive } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }
  
  try {
    const { rows: [piece] } = await sql`
      UPDATE pieces 
      SET 
        name = ${name || null},
        description = ${description || null},
        base_price = ${basePrice || null},
        image_url = ${imageUrl || null},
        difficulty = ${difficulty || null},
        category = ${category || null},
        is_active = ${isActive !== undefined ? isActive : true},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    return res.status(200).json({
      success: true,
      piece: toCamelCase(piece)
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update piece' 
    });
  }
}
```

**Tareas:**
- [ ] Validar que pieza existe
- [ ] Actualizar campos
- [ ] Retornar pieza actualizada

---

### 2.4 Endpoint DELETE - Eliminar pieza

**Ruta:** POST `/api/data?action=deletePiece`

```typescript
case 'deletePiece': {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }
  
  try {
    await sql`DELETE FROM pieces WHERE id = ${id}`;
    
    return res.status(200).json({
      success: true,
      message: 'Piece deleted'
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete piece' 
    });
  }
}
```

**Tareas:**
- [ ] Agregar soft delete (is_active = false) en lugar de DELETE
- [ ] O agregar validación para no eliminar piezas con bookings

---

## 📋 FASE 3: Funciones en dataService.ts

### 3.1 Funciones de Piezas

```typescript
// services/dataService.ts

export const getPieces = async (): Promise<Piece[]> => {
  const result = await getData('pieces');
  return result || [];
};

export const addPiece = async (piece: Omit<Piece, 'id'>): Promise<Piece> => {
  const result = await postAction('addPiece', piece);
  if (result.success && result.piece) {
    return result.piece;
  }
  throw new Error(result.error || 'Failed to add piece');
};

export const updatePiece = async (id: string, updates: Partial<Piece>): Promise<Piece> => {
  const result = await postAction('updatePiece', { id, ...updates });
  if (result.success && result.piece) {
    return result.piece;
  }
  throw new Error(result.error || 'Failed to update piece');
};

export const deletePiece = async (id: string): Promise<boolean> => {
  const result = await postAction('deletePiece', { id });
  return result.success;
};
```

**Tareas:**
- [ ] Agregar a `dataService.ts`
- [ ] Cachear getPieces (5 min TTL)
- [ ] Invalidar cache en add/update/delete

---

## 📋 FASE 4: Componentes Admin React

### 4.1 Crear `PiecesManager.tsx`

**Ubicación:** `/components/admin/PiecesManager.tsx`

```typescript
interface PiecesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

export const PiecesManager: React.FC<PiecesManagerProps> = ({ isOpen, onClose, onDataChange }) => {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPieces();
    }
  }, [isOpen]);

  const loadPieces = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getPieces();
      setPieces(data);
    } catch (error) {
      console.error('Error loading pieces:', error);
    }
    setIsLoading(false);
  };

  const handleSavePiece = async (pieceData: any) => {
    try {
      if (selectedPiece?.id) {
        await dataService.updatePiece(selectedPiece.id, pieceData);
      } else {
        await dataService.addPiece(pieceData);
      }
      setShowModal(false);
      setSelectedPiece(null);
      loadPieces();
      onDataChange?.();
    } catch (error) {
      alert('Error al guardar pieza');
    }
  };

  const handleDeletePiece = async (pieceId: string) => {
    if (window.confirm('¿Eliminar esta pieza?')) {
      try {
        await dataService.deletePiece(pieceId);
        loadPieces();
        onDataChange?.();
      } catch (error) {
        alert('Error al eliminar pieza');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">📦 Catálogo de Piezas</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <button 
          onClick={() => {
            setSelectedPiece(null);
            setShowModal(true);
          }}
          className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + Agregar Nueva Pieza
        </button>

        {isLoading ? (
          <p>Cargando...</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Nombre</th>
                <th className="border p-2 text-left">Precio</th>
                <th className="border p-2 text-left">Dificultad</th>
                <th className="border p-2 text-left">Categoría</th>
                <th className="border p-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map(piece => (
                <tr key={piece.id} className="border-b hover:bg-gray-50">
                  <td className="border p-2">{piece.name}</td>
                  <td className="border p-2">${piece.basePrice}</td>
                  <td className="border p-2">{piece.difficulty}</td>
                  <td className="border p-2">{piece.category}</td>
                  <td className="border p-2 text-center space-x-2">
                    <button 
                      onClick={() => {
                        setSelectedPiece(piece);
                        setShowModal(true);
                      }}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeletePiece(piece.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <PieceModal 
            piece={selectedPiece}
            onSave={handleSavePiece}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
};
```

### 4.2 Crear `PieceModal.tsx`

**Ubicación:** `/components/admin/PieceModal.tsx`

```typescript
interface PieceModalProps {
  piece?: Piece | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

export const PieceModal: React.FC<PieceModalProps> = ({ piece, onSave, onClose }) => {
  const [formData, setFormData] = useState(piece || {
    name: '',
    description: '',
    basePrice: 0,
    imageUrl: '',
    difficulty: 'beginner',
    category: 'bowl'
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Upload a storage (Vercel Blob, S3, etc)
      // Por ahora solo guardar URL
      setFormData(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">{piece?.id ? 'Editar' : 'Nueva'} Pieza</h3>
        
        <div className="space-y-4">
          <input 
            type="text" 
            name="name" 
            placeholder="Nombre de pieza" 
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
          
          <textarea 
            name="description" 
            placeholder="Descripción" 
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
          
          <input 
            type="number" 
            name="basePrice" 
            placeholder="Precio ($)" 
            value={formData.basePrice}
            onChange={handleChange}
            step="0.01"
            className="w-full px-3 py-2 border rounded-lg"
          />
          
          <select 
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          
          <select 
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="bowl">Bowl</option>
            <option value="plate">Plate</option>
            <option value="mug">Mug</option>
            <option value="vase">Vase</option>
            <option value="other">Other</option>
          </select>
          
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            className="w-full"
          />
          
          {formData.imageUrl && (
            <img src={formData.imageUrl} alt="preview" className="w-full h-32 object-cover rounded-lg" />
          )}
        </div>
        
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Tareas:**
- [ ] Crear ambos componentes
- [ ] Agregar a AdminConsole.tsx como nueva pestaña
- [ ] Testear CRUD completo

---

## 📋 FASE 5: Actualizar AdminConsole.tsx

```typescript
const [activeTab, setActiveTab] = useState<'customers' | 'bookings' | 'schedule' | 'deliveries' | 'pieces' | 'giftcards' | 'invoices'>('customers');

// ... en return:

<div className="flex gap-2 mb-4 border-b">
  <button 
    onClick={() => setActiveTab('customers')}
    className={activeTab === 'customers' ? 'font-bold border-b-2' : ''}
  >
    Clientes
  </button>
  {/* ... otros tabs ... */}
  <button 
    onClick={() => setActiveTab('pieces')}
    className={activeTab === 'pieces' ? 'font-bold border-b-2' : ''}
  >
    📦 Piezas
  </button>
</div>

{activeTab === 'pieces' && (
  <PiecesManager 
    isOpen={true}
    onClose={() => setActiveTab('customers')}
    onDataChange={() => onDataChange?.()}
  />
)}
```

**Tareas:**
- [ ] Agregar pestaña "Piezas"
- [ ] Mostrar PiecesManager cuando activo

---

## 🧪 Checklist de Testing

- [ ] Crear pieza con todos los campos
- [ ] Editar pieza existente
- [ ] Eliminar pieza
- [ ] Upload de imagen funciona
- [ ] Listado muestra precios correctos
- [ ] Filtros por categoría/dificultad (FASE 6)
- [ ] getPieces en endpoint devuelve datos correctos
- [ ] Cache de piezas se invalida al editar

---

## ⏱️ Tiempo Estimado

| Fase | Componente | Tiempo |
|---|---|---|
| 1 | BD - Tabla pieces | 15 min |
| 2 | Endpoints API | 45 min |
| 3 | dataService functions | 20 min |
| 4 | React components | 60 min |
| 5 | AdminConsole integration | 15 min |
| - | **TOTAL FASE 1** | **~2.5 horas** |

---

## 📝 Notas Importantes

1. **Image Upload:** Actualmente solo guarda URL. Para producción necesitas:
   - Vercel Blob
   - AWS S3
   - Cloudinary
   - O sola local `/public/pieces/`

2. **Caché:** getPieces debería cachearse 5 minutos

3. **Validaciones:** Agregar validaciones en frontend y backend

4. **Soft Delete:** Mejor usar `is_active = false` que eliminar físicamente

5. **Sort Order:** Agregar campo `sort_order` para ordenar manualmente

---

**Próxima Fase:** Experiencia Grupal Manual en Admin (FASE 6+)

