# Sistema de Upload de Fotos para Entregas

## 📸 Estado Actual

### ✅ Implementado:
- **Frontend**: Conversión de imágenes a Base64 (Data URLs)
- **Almacenamiento**: Directamente en PostgreSQL como JSONB
- **Interfaz**: Upload múltiple con preview y eliminación

### ⚠️ Limitaciones Actuales:

**1. Tamaño de Base de Datos**
- Las imágenes Base64 ocupan ~33% más espacio que binario
- Una foto de 2MB → ~2.66MB en Base64
- Límite práctico: ~5-10 fotos por entrega

**2. Performance**
- Queries más lentos al cargar entregas con fotos
- Ancho de banda aumenta al transferir JSON con imágenes

**3. Sin Optimización**
- No hay compresión automática
- No hay generación de thumbnails
- No hay lazy loading

## 🚀 Opciones de Mejora

### Opción A: Vercel Blob Storage (Recomendada)
**Pros:**
- Integración nativa con Vercel
- CDN global automático
- URLs permanentes
- Facturación simple ($0.15/GB storage, $0.20/GB bandwidth)

**Setup:**
```typescript
import { put } from '@vercel/blob';

async function uploadPhoto(file: File) {
  const blob = await put(`deliveries/${deliveryId}/${Date.now()}.jpg`, file, {
    access: 'public',
  });
  return blob.url; // https://xxx.public.blob.vercel-storage.com/...
}
```

**Migración:**
1. Install `@vercel/blob`
2. Update `NewDeliveryModal` y `EditDeliveryModal` para usar Blob
3. Migrar fotos existentes (si hay) de Base64 a Blob

### Opción B: Cloudinary
**Pros:**
- Transformaciones automáticas (resize, crop, format)
- Generación de thumbnails
- Optimización automática de calidad
- Free tier: 25GB storage, 25GB bandwidth/mes

**Setup:**
```typescript
import { v2 as cloudinary } from 'cloudinary';

async function uploadPhoto(file: File) {
  const result = await cloudinary.uploader.upload(fileDataUrl, {
    folder: 'deliveries',
    resource_type: 'image'
  });
  return result.secure_url;
}
```

### Opción C: AWS S3
**Pros:**
- Más control y flexibilidad
- Pricing más predecible para alto volumen
- Integración con CloudFront CDN

**Contras:**
- Setup más complejo
- Requiere gestión de AWS credentials

### Opción D: Mantener Base64 (Actual)
**Usar solo si:**
- Pocas entregas con fotos
- Fotos son principalmente referencias pequeñas
- No hay presupuesto para servicios externos

**Optimizaciones posibles:**
```typescript
// Comprimir antes de guardar
function compressImage(dataUrl: string, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  });
}
```

## 📊 Recomendación

**Para este proyecto:**
→ **Vercel Blob Storage**

**Razones:**
1. Ya estás en Vercel (zero-config)
2. Pricing razonable para volumen esperado
3. CDN gratis
4. Fácil migración desde Base64
5. URLs públicas estables

**Estimación de costo:**
- 100 entregas/mes × 3 fotos × 2MB = 600MB/mes
- Storage: $0.15/GB × 0.6GB = **$0.09/mes**
- Bandwidth (estimado): $0.20/GB × 1.2GB = **$0.24/mes**
- **Total: ~$0.35/mes** (insignificante)

## 🔨 Implementación Recomendada

### Paso 1: Install Vercel Blob
```bash
npm install @vercel/blob
```

### Paso 2: Create Upload API Route
```typescript
// api/upload-delivery-photo.ts
import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file, deliveryId } = req.body;
  
  try {
    const blob = await put(
      `deliveries/${deliveryId}/${Date.now()}.jpg`,
      Buffer.from(file.split(',')[1], 'base64'),
      { access: 'public', contentType: 'image/jpeg' }
    );
    
    return res.json({ url: blob.url });
  } catch (error) {
    return res.status(500).json({ error: 'Upload failed' });
  }
}
```

### Paso 3: Update Frontend Upload Logic
```typescript
// In NewDeliveryModal.tsx / EditDeliveryModal.tsx
const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        
        // Upload to Vercel Blob
        const response = await fetch('/api/upload-delivery-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            file: dataUrl, 
            deliveryId: deliveryId || 'temp' 
          })
        });
        
        const { url } = await response.json();
        setPhotos(prev => [...prev, url]);
      };
      reader.readAsDataURL(file);
    }
  }
};
```

## ⏰ Timeline de Implementación

**Si mantienes Base64 (actual):**
- ✅ Ya funciona
- ⚠️ Agregar compresión: 2-3 horas

**Si migras a Vercel Blob:**
- Setup Blob + API route: 1-2 horas
- Update modales frontend: 1 hora
- Testing: 30 mins
- **Total: ~3 horas**

## 📝 Próximos Pasos Sugeridos

1. [ ] Decidir estrategia de storage
2. [ ] Implementar si se elige Vercel Blob
3. [ ] Agregar compresión automática (cualquier opción)
4. [ ] Agregar límite de tamaño/cantidad de fotos
5. [ ] Considerar thumbnails para lista de entregas
