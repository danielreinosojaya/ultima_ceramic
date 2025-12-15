# 📦 Guía Técnica de Replicación: Sistema de Delivery de Piezas

**Versión**: 1.0  
**Última actualización**: Diciembre 9, 2025  
**Tecnologías**: React 18+, TypeScript, PostgreSQL, Vercel Serverless Functions

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Paso 1: Base de Datos](#paso-1-base-de-datos)
4. [Paso 2: Backend (API)](#paso-2-backend-api)
5. [Paso 3: Tipos TypeScript](#paso-3-tipos-typescript)
6. [Paso 4: Servicios Frontend](#paso-4-servicios-frontend)
7. [Paso 5: Componente Cliente](#paso-5-componente-cliente)
8. [Paso 6: Ruteo & Integración](#paso-6-ruteo--integración)
9. [Paso 7: Email Service](#paso-7-email-service)
10. [Paso 8: QR Code & Landing](#paso-8-qr-code--landing)
11. [Testing & Deployment](#testing--deployment)
12. [Checklist de Implementación](#checklist-de-implementación)

---

## 🎯 Resumen Ejecutivo

Este sistema permite que clientes suban fotos de sus productos/piezas y creen entregas sin intervención del administrador.

### Características principales:
- ✅ Formulario autoservicio de 3 pasos
- ✅ Upload múltiple de fotos con compresión automática
- ✅ Auto-creación de cliente si no existe
- ✅ Email de confirmación automático
- ✅ Acceso vía QR code
- ✅ Admin panel para gestión

### Flujo usuario:
```
QR → Formulario (Info + Fotos + Confirmación) → Backend → Email → Admin Panel
```

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| **Frontend** | React 18+, TypeScript |
| **Backend** | Vercel Serverless Functions (Node.js) |
| **Base de Datos** | PostgreSQL (Vercel Postgres) |
| **Almacenamiento Fotos** | Base64 en JSONB (o S3/Cloudinary si escala) |
| **Email** | Nodemailer o servicio de terceros |
| **Build Tool** | Vite 6.3.5 |
| **Estilos** | Tailwind CSS |

### Dependencias NPM necesarias:
```json
{
  "dependencies": {
    "@vercel/postgres": "^0.5.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 📊 Paso 1: Base de Datos

### 1.1 Crear tabla `deliveries`

Ejecuta este SQL en tu PostgreSQL:

```sql
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla deliveries
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email VARCHAR(255) NOT NULL,
    description TEXT,  -- Puede ser NULL
    scheduled_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,  -- DEPRECATED pero mantener para retrocompatibilidad
    notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    created_by_client BOOLEAN DEFAULT false
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_email ON deliveries(customer_email);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);
```

### 1.2 Crear tabla `customers` (si no existe)

```sql
CREATE TABLE IF NOT EXISTS customers (
    email VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    country_code VARCHAR(10),
    birthday DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 Agregar a tu archivo de schema (`api/db.ts`)

```typescript
// api/db.ts
import { sql } from '@vercel/postgres';

export async function ensureTablesExist() {
    // ... otras tablas ...
    
    // Agregar esta sección
    await sql`
        CREATE TABLE IF NOT EXISTS deliveries (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_email VARCHAR(255) NOT NULL,
            description TEXT,
            scheduled_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed', 'overdue')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            ready_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            delivered_at TIMESTAMPTZ,
            notes TEXT,
            photos JSONB DEFAULT '[]'::jsonb,
            created_by_client BOOLEAN DEFAULT false
        )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_customer_email ON deliveries(customer_email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date)`;
}
```

---

## 🔌 Paso 2: Backend (API)

### 2.1 Agregar endpoints en `api/data.ts`

Este es el archivo principal de tu API. Agrega estos 4 endpoints:

#### Endpoint 1: `createDeliveryFromClient`

```typescript
// api/data.ts
import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Función helper para convertir snake_case a camelCase
function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            acc[camelKey] = toCamelCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;
    
    // ... otros endpoints ...
    
    switch (action) {
        case 'createDeliveryFromClient': {
            const { email, userInfo, description, scheduledDate, photos } = req.body;
            
            if (!email || !scheduledDate) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Email y fecha de recogida son requeridos' 
                });
            }

            try {
                // 1️⃣ Validar email (debe ser cliente existente o crear uno nuevo)
                let { rows: [existingCustomer] } = await sql`
                    SELECT * FROM customers WHERE email = ${email}
                `;

                // 2️⃣ Si no existe, crear cliente nuevo
                if (!existingCustomer) {
                    console.log('[createDeliveryFromClient] Creating new customer:', email);
                    
                    if (!userInfo) {
                        return res.status(400).json({ 
                            success: false,
                            error: 'userInfo es requerido para clientes nuevos' 
                        });
                    }

                    try {
                        const { rows: [newCustomer] } = await sql`
                            INSERT INTO customers (email, first_name, last_name, phone, country_code, birthday)
                            VALUES (
                                ${email}, 
                                ${userInfo.firstName || null}, 
                                ${userInfo.lastName || null}, 
                                ${userInfo.phone || null}, 
                                ${userInfo.countryCode || null}, 
                                ${userInfo.birthday || null}
                            )
                            RETURNING *
                        `;
                        existingCustomer = newCustomer;
                        console.log('[createDeliveryFromClient] ✅ New customer created:', email);
                    } catch (customerError: any) {
                        // Si falla por email duplicado, obtener el existente
                        if (customerError?.code === '23505') {
                            const { rows: [duplicate] } = await sql`
                                SELECT * FROM customers WHERE email = ${email}
                            `;
                            existingCustomer = duplicate;
                        } else {
                            throw customerError;
                        }
                    }
                }

                // 3️⃣ Crear entrega con created_by_client = true
                const photosJson = photos && Array.isArray(photos) ? JSON.stringify(photos) : null;
                
                const { rows: [newDelivery] } = await sql`
                    INSERT INTO deliveries (
                        customer_email, 
                        description, 
                        scheduled_date, 
                        status, 
                        photos,
                        created_by_client
                    )
                    VALUES (
                        ${email}, 
                        ${description || null}, 
                        ${scheduledDate}, 
                        'pending', 
                        ${photosJson},
                        true
                    )
                    RETURNING *
                `;

                console.log('[createDeliveryFromClient] ✅ Delivery created:', newDelivery.id);

                // 4️⃣ Enviar email de confirmación (async, no bloquea)
                try {
                    const customerName = userInfo?.firstName || 'Cliente';
                    const emailServiceModule = await import('./emailService.js');
                    
                    try {
                        await emailServiceModule.sendDeliveryCreatedByClientEmail(
                            email, 
                            customerName, 
                            {
                                description: description || null,
                                scheduledDate,
                                photos: photos?.length || 0
                            }
                        );
                        console.log('[createDeliveryFromClient] ✅ Confirmation email sent to:', email);
                    } catch (err) {
                        console.error('[createDeliveryFromClient] ⚠️ Email send failed:', err);
                    }
                } catch (emailErr) {
                    console.error('[createDeliveryFromClient] ⚠️ Email setup failed:', emailErr);
                }

                return res.status(200).json({ 
                    success: true, 
                    delivery: toCamelCase(newDelivery),
                    isNewCustomer: !existingCustomer,
                    message: '✅ Información recibida exitosamente'
                });

            } catch (error: any) {
                console.error('[createDeliveryFromClient] Error:', error);
                return res.status(500).json({ 
                    success: false,
                    error: error.message || 'Error al procesar la solicitud'
                });
            }
        }
        
        case 'updateDelivery': {
            const { deliveryId, updates } = req.body;
            
            if (!deliveryId || !updates) {
                return res.status(400).json({ error: 'deliveryId and updates are required.' });
            }
            
            const setClause = Object.entries(updates)
                .filter(([key, value]) => value !== undefined)
                .map(([key, value], index) => {
                    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    return `${snakeKey} = $${index + 2}`;
                })
                .join(', ');
            
            if (!setClause) {
                return res.status(400).json({ error: 'No valid updates provided.' });
            }
            
            const values = [deliveryId, ...Object.values(updates).filter(v => v !== undefined)];
            const { rows: [updatedDelivery] } = await sql.query(
                `UPDATE deliveries SET ${setClause} WHERE id = $1 RETURNING *`,
                values
            );
            
            if (!updatedDelivery) {
                return res.status(404).json({ error: 'Delivery not found.' });
            }
            
            return res.status(200).json({ success: true, delivery: toCamelCase(updatedDelivery) });
        }
        
        case 'deliveries': {
            const { rows } = await sql`SELECT * FROM deliveries ORDER BY created_at DESC`;
            return res.status(200).json(rows.map(toCamelCase));
        }
        
        case 'markDeliveryAsCompleted': {
            const { deliveryId, notes } = req.body;
            
            if (!deliveryId) {
                return res.status(400).json({ error: 'deliveryId is required.' });
            }
            
            const { rows: [completedDelivery] } = await sql`
                UPDATE deliveries 
                SET status = 'completed', 
                    completed_at = NOW(), 
                    notes = ${notes || null}
                WHERE id = ${deliveryId}
                RETURNING *
            `;
            
            if (!completedDelivery) {
                return res.status(404).json({ error: 'Delivery not found.' });
            }
            
            return res.status(200).json({ success: true, delivery: toCamelCase(completedDelivery) });
        }
        
        default:
            return res.status(400).json({ error: 'Unknown action' });
    }
}
```

---

## 📝 Paso 3: Tipos TypeScript

### 3.1 Agregar tipos en `types.ts`

```typescript
// types.ts

// Estados posibles de una entrega
export type DeliveryStatus = 'pending' | 'ready' | 'completed' | 'overdue';

// Interfaz principal de Delivery
export interface Delivery {
    id: string;                              // UUID
    customerEmail: string;                   // Email del cliente
    description?: string;                    // Descripción (opcional)
    scheduledDate: string;                   // ISO date string (YYYY-MM-DD)
    status: DeliveryStatus;                  // Estado actual
    createdAt: string;                       // ISO timestamp
    readyAt?: string | null;                 // Cuándo está lista
    completedAt?: string | null;             // Cuándo se entregó
    deliveredAt?: string | null;             // DEPRECATED
    notes?: string | null;                   // Notas del admin
    photos?: string[] | null;                // Array de base64 o URLs
    createdByClient?: boolean;               // true si cliente lo creó
}

// Interfaz de UserInfo (si no existe)
export interface UserInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode: string;
    birthday?: string | null;
}
```

---

## 🔧 Paso 4: Servicios Frontend

### 4.1 Agregar funciones en `services/dataService.ts`

```typescript
// services/dataService.ts
import type { Delivery, DeliveryStatus, UserInfo } from '../types';

// Helper para parsear delivery de backend
const parseDelivery = (d: any): Delivery => {
    let parsedPhotos: string[] = [];
    
    if (d.photos) {
        try {
            if (Array.isArray(d.photos)) {
                parsedPhotos = d.photos;
            } else if (typeof d.photos === 'string') {
                parsedPhotos = JSON.parse(d.photos || '[]');
            }
            // Filtrar fotos inválidas
            parsedPhotos = parsedPhotos.filter((photo: any) => {
                if (typeof photo === 'string' && photo.trim()) {
                    return photo.startsWith('data:') || photo.startsWith('http://') || photo.startsWith('https://');
                }
                return false;
            });
        } catch (error) {
            console.error('[parseDelivery] Error parsing photos:', error);
            parsedPhotos = [];
        }
    }
    
    return {
        id: d.id,
        customerEmail: d.customerEmail || d.customer_email,
        description: d.description,
        scheduledDate: d.scheduledDate || d.scheduled_date,
        status: d.status as DeliveryStatus,
        createdAt: d.createdAt || d.created_at,
        completedAt: d.completedAt || d.completed_at || null,
        deliveredAt: d.deliveredAt || d.delivered_at || null,
        readyAt: d.readyAt || d.ready_at || null,
        notes: d.notes || null,
        photos: parsedPhotos,
        createdByClient: d.createdByClient || d.created_by_client || false
    };
};

// Función principal: Crear delivery desde cliente
export const createDeliveryFromClient = async (data: {
    email: string;
    userInfo: UserInfo;
    description: string | null;
    scheduledDate: string;
    photos: string[] | null;
}): Promise<{ 
    success: boolean; 
    delivery?: Delivery; 
    isNewCustomer?: boolean; 
    error?: string; 
    message?: string 
}> => {
    try {
        console.log('[dataService] createDeliveryFromClient called');
        
        // Timeout de 60 segundos para conexiones móviles lentas
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch('/api/data?action=createDeliveryFromClient', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            const result = await response.json();
            
            console.log('[dataService] createDeliveryFromClient response:', result);
            
            if (result.success && result.delivery) {
                return { 
                    ...result, 
                    delivery: parseDelivery(result.delivery),
                    message: result.message || '✅ ¡Gracias! Hemos recibido tu información.'
                };
            }
            
            return { 
                success: false, 
                error: result.error || 'Error al procesar tu solicitud'
            };
        } catch (timeoutError) {
            clearTimeout(timeoutId);
            throw timeoutError;
        }
    } catch (error) {
        console.error('[dataService] createDeliveryFromClient error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        
        return {
            success: false,
            error: errorMsg.includes('timeout') 
                ? 'La conexión está tardando mucho. Por favor intenta de nuevo.' 
                : 'Error de conexión. Verifica tu internet.'
        };
    }
};

// Obtener todas las entregas (para admin panel)
export const getDeliveries = async (): Promise<Delivery[]> => {
    try {
        const response = await fetch('/api/data?action=deliveries');
        const deliveries = await response.json();
        return deliveries ? deliveries.map(parseDelivery) : [];
    } catch (error) {
        console.error('[dataService] getDeliveries error:', error);
        return [];
    }
};

// Actualizar delivery (para admin)
export const updateDelivery = async (
    deliveryId: string, 
    updates: Partial<Delivery>
): Promise<{ success: boolean; delivery?: Delivery }> => {
    try {
        const response = await fetch('/api/data?action=updateDelivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryId, updates })
        });
        
        const result = await response.json();
        
        if (result.success && result.delivery) {
            return { ...result, delivery: parseDelivery(result.delivery) };
        }
        
        return result;
    } catch (error) {
        console.error('[dataService] updateDelivery error:', error);
        return { success: false };
    }
};
```

---

## 🎨 Paso 5: Componente Cliente

### 5.1 Crear `components/ClientDeliveryForm.tsx`

Este es el componente principal que verán los clientes. Tiene 3 pasos:

```typescript
// components/ClientDeliveryForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { UserInfo } from '../types';
import * as dataService from '../services/dataService';

interface Step {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    countryCode: string;
    description: string;
    scheduledDate: string;
    photos: string[];
}

const INITIAL_STEP: Step = {
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    countryCode: '+1',
    description: '',
    scheduledDate: '',
    photos: []
};

export const ClientDeliveryForm: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<'info' | 'photos' | 'confirmation'>('info');
    const [formData, setFormData] = useState<Step>(INITIAL_STEP);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        console.log('[ClientDeliveryForm] Component mounted successfully');
        return () => {
            console.log('[ClientDeliveryForm] Component unmounted');
        };
    }, []);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // FUNCIÓN CLAVE: Comprimir imagen a base64
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Reducir tamaño a máx 800x800px
                    const maxWidth = 800;
                    const maxHeight = 800;
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('No se pudo comprimir la imagen'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // JPEG 60% quality
                    const compressed = canvas.toDataURL('image/jpeg', 0.6);
                    
                    // Si >1MB, comprimir más (40%)
                    if (compressed.length > 1000000) {
                        const evenMoreCompressed = canvas.toDataURL('image/jpeg', 0.4);
                        resolve(evenMoreCompressed);
                    } else {
                        resolve(compressed);
                    }
                };
                img.onerror = () => reject(new Error('Error al procesar la imagen'));
                img.src = event.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Error al leer la imagen'));
            reader.readAsDataURL(file);
        });
    };

    const openCameraCapture = () => {
        cameraInputRef.current?.click();
    };

    const openGallery = () => {
        galleryInputRef.current?.click();
    };

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            if (file.type.startsWith('image/')) {
                compressImage(file)
                    .then((compressedDataUrl) => {
                        setFormData(prev => ({
                            ...prev,
                            photos: [...prev.photos, compressedDataUrl]
                        }));
                    })
                    .catch((error) => {
                        console.error('[ClientDeliveryForm] Error compressing image:', error);
                        setErrors(prev => ({
                            ...prev,
                            photos: 'Error al procesar la foto. Intenta con otra imagen.'
                        }));
                    });
            }
        });

        if (errors.photos) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.photos;
                return newErrors;
            });
        }

        e.target.value = '';
    };

    const validateStep = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (currentStep === 'info') {
            if (!formData.email.trim()) {
                newErrors.email = 'El email es requerido';
            } else if (!validateEmail(formData.email)) {
                newErrors.email = 'Email inválido';
            }

            if (!formData.firstName.trim()) {
                newErrors.firstName = 'El nombre es requerido';
            }

            if (!formData.lastName.trim()) {
                newErrors.lastName = 'El apellido es requerido';
            }

            if (!formData.phone.trim()) {
                newErrors.phone = 'El teléfono es requerido';
            }
        }

        if (currentStep === 'photos') {
            if (formData.photos.length === 0) {
                newErrors.photos = 'Debes subir al menos una foto';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInfoChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const handleNextStep = () => {
        if (!validateStep()) return;

        if (currentStep === 'info') {
            setCurrentStep('photos');
        } else if (currentStep === 'photos') {
            setCurrentStep('confirmation');
        }
    };

    const handlePreviousStep = () => {
        if (currentStep === 'photos') {
            setCurrentStep('info');
        } else if (currentStep === 'confirmation') {
            setCurrentStep('photos');
        }
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        setIsSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('Enviando información...');

        try {
            const userInfo: UserInfo = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                countryCode: formData.countryCode,
                birthday: null
            };

            // Calcular fecha: hoy + 15 días
            const today = new Date();
            const scheduledDate = new Date(today);
            scheduledDate.setDate(scheduledDate.getDate() + 15);
            const scheduledDateStr = scheduledDate.toISOString().split('T')[0];

            // Limitar a 2 fotos max para evitar 413 Payload Too Large
            const photosToSend = formData.photos.length > 0 ? formData.photos.slice(0, 2) : null;

            const result = await dataService.createDeliveryFromClient({
                email: formData.email.trim(),
                userInfo,
                description: formData.description.trim() || null,
                scheduledDate: scheduledDateStr,
                photos: photosToSend
            });

            if (result.success) {
                setSuccessMessage(result.message || '✅ ¡Gracias! Hemos recibido tu información.');
                setTimeout(() => {
                    setFormData(INITIAL_STEP);
                    setCurrentStep('info');
                }, 3000);
            } else {
                setErrorMessage(result.error || 'Error al enviar la información.');
            }
        } catch (error) {
            console.error('[ClientDeliveryForm] Exception:', error);
            setErrorMessage('Error al procesar tu solicitud. Intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        📦 Tu Proyecto
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Seguimiento de Entregas
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="flex justify-between mb-8">
                    <div className={`flex-1 h-2 rounded-full mr-2 transition-colors ${
                        currentStep === 'info' || currentStep === 'photos' || currentStep === 'confirmation' 
                            ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                    <div className={`flex-1 h-2 rounded-full mr-2 transition-colors ${
                        currentStep === 'photos' || currentStep === 'confirmation' 
                            ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                    <div className={`flex-1 h-2 rounded-full transition-colors ${
                        currentStep === 'confirmation' ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                </div>

                {/* Messages */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <p className="text-green-700 text-sm font-semibold">✅ {successMessage}</p>
                    </div>
                )}

                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700 text-sm font-semibold">❌ {errorMessage}</p>
                    </div>
                )}

                {/* PASO 1: Información */}
                {currentStep === 'info' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Información Personal</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleInfoChange('firstName', e.target.value)}
                                    placeholder="Juan"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Apellido *
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleInfoChange('lastName', e.target.value)}
                                    placeholder="Pérez"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInfoChange('email', e.target.value)}
                                placeholder="tu@email.com"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    errors.email ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Teléfono *
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleInfoChange('phone', e.target.value)}
                                placeholder="+1 234 567 8900"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    errors.phone ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Descripción (opcional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleInfoChange('description', e.target.value)}
                                placeholder="Describe tu proyecto..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleNextStep}
                                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 2: Fotos */}
                {currentStep === 'photos' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Sube Fotos</h3>

                        {/* Botón Cámara */}
                        <button
                            type="button"
                            onClick={openCameraCapture}
                            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            📷 Tomar Foto
                        </button>

                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoCapture}
                            className="hidden"
                        />

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">O</span>
                            </div>
                        </div>

                        {/* Botón Galería */}
                        <button
                            type="button"
                            onClick={openGallery}
                            className="w-full px-4 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                            🖼️ Seleccionar desde Galería
                        </button>

                        <input
                            ref={galleryInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoCapture}
                            className="hidden"
                        />

                        {/* Preview Grid */}
                        {formData.photos.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photo}
                                            alt={`Foto ${index + 1}`}
                                            className="w-full h-24 object-cover rounded-lg border"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={handlePreviousStep}
                                className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                ← Atrás
                            </button>
                            <button
                                onClick={handleNextStep}
                                disabled={formData.photos.length === 0}
                                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Revisar →
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 3: Confirmación */}
                {currentStep === 'confirmation' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Confirmación</h3>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <p className="text-xs text-gray-600">Nombre</p>
                                <p className="font-semibold text-gray-800">{formData.firstName} {formData.lastName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Email</p>
                                <p className="font-semibold text-gray-800">{formData.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Teléfono</p>
                                <p className="font-semibold text-gray-800">{formData.phone}</p>
                            </div>
                            {formData.description && (
                                <div>
                                    <p className="text-xs text-gray-600">Descripción</p>
                                    <p className="font-semibold text-gray-800">{formData.description}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-gray-600">Fotos</p>
                                <p className="font-semibold text-gray-800">{formData.photos.length} foto(s)</p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={handlePreviousStep}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                            >
                                ← Atrás
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Enviando...' : 'Enviar ✓'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
```

---

## 🔀 Paso 6: Ruteo & Integración

### 6.1 Agregar detección en `App.tsx`

```typescript
// App.tsx
import React, { useState, useEffect } from 'react';
import { ClientDeliveryForm } from './components/ClientDeliveryForm';

function App() {
    const [isClientDeliveryMode, setIsClientDeliveryMode] = useState(false);

    useEffect(() => {
        // Detectar parámetro ?clientMode=delivery
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('clientMode') === 'delivery') {
            setIsClientDeliveryMode(true);
        }
    }, []);

    // Si es modo delivery, mostrar SOLO el formulario
    if (isClientDeliveryMode) {
        return <ClientDeliveryForm />;
    }

    // Resto de tu app normal
    return (
        <div>
            {/* Tu aplicación normal aquí */}
        </div>
    );
}

export default App;
```

---

## 📧 Paso 7: Email Service

### 7.1 Crear/Actualizar `api/emailService.ts`

```typescript
// api/emailService.ts

export const sendDeliveryCreatedByClientEmail = async (
    customerEmail: string, 
    customerName: string, 
    delivery: { 
        description?: string | null; 
        scheduledDate: string; 
        photos?: number; 
    }
) => {
    console.log('[sendDeliveryCreatedByClientEmail] Starting email send to:', customerEmail);
    
    const subject = '✅ Hemos recibido tu información';
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">📦 Información Recibida</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333;">Hola <strong>${customerName}</strong>,</p>
                
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    ¡Gracias por confiar en nosotros! Hemos recibido exitosamente tu información y las fotos de tu proyecto.
                </p>
                
                ${delivery.description ? `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #666; font-size: 14px;"><strong>Descripción:</strong></p>
                        <p style="margin: 5px 0 0 0; color: #333;">${delivery.description}</p>
                    </div>
                ` : ''}
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
                    <p style="margin: 0; color: #1976d2; font-size: 14px;">
                        📅 <strong>Fecha estimada de recogida:</strong> ${new Date(delivery.scheduledDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p style="margin: 10px 0 0 0; color: #1976d2; font-size: 14px;">
                        📷 <strong>Fotos recibidas:</strong> ${delivery.photos || 0}
                    </p>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>⏱️ Próximos pasos:</strong>
                    </p>
                    <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px; line-height: 1.6;">
                        Te contactaremos <strong>1-2 días hábiles antes</strong> de la fecha de recogida para coordinar los detalles finales.
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    Si tienes alguna pregunta, no dudes en contactarnos.
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                    <p style="font-size: 12px; color: #999; margin: 0;">
                        Este es un email automático. Por favor no respondas a este mensaje.
                    </p>
                </div>
            </div>
        </div>
    `;
    
    try {
        // Aquí va tu lógica de envío de email
        // Puede ser Nodemailer, SendGrid, etc.
        
        // Ejemplo con Nodemailer:
        // const transporter = nodemailer.createTransporter({ ... });
        // await transporter.sendMail({ from, to: customerEmail, subject, html });
        
        console.log('[sendDeliveryCreatedByClientEmail] Email sent successfully');
        return { sent: true };
    } catch (error) {
        console.error('[sendDeliveryCreatedByClientEmail] Email send failed:', error);
        return { sent: false, error };
    }
};
```

---

## 📱 Paso 8: QR Code & Landing

### 8.1 Crear página para generar QR (`public/qr-delivery.html`)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR - Seguimiento de Entregas</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        #qrcode {
            margin: 30px auto;
            padding: 20px;
            background: white;
            border: 3px solid #667eea;
            border-radius: 15px;
            display: inline-block;
        }
        .url {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 14px;
            color: #333;
            margin: 20px 0;
            word-break: break-all;
        }
        .instructions {
            text-align: left;
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
        }
        .instructions h3 {
            margin-top: 0;
            color: #1976d2;
        }
        .instructions ol {
            padding-left: 20px;
            color: #333;
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        button:hover {
            background: #764ba2;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 QR de Entregas</h1>
        <p class="subtitle">Escanea para acceder al formulario</p>
        
        <div id="qrcode"></div>
        
        <div class="url">
            https://tudominio.com/?clientMode=delivery
        </div>
        
        <button onclick="downloadQR()">⬇️ Descargar QR</button>
        <button onclick="window.print()">🖨️ Imprimir</button>
        
        <div class="instructions">
            <h3>📋 Instrucciones de Uso</h3>
            <ol>
                <li>Imprime esta página o descarga el QR</li>
                <li>Coloca el QR en un lugar visible de tu negocio</li>
                <li>Los clientes escanean el QR con su teléfono</li>
                <li>Completan el formulario y suben fotos</li>
                <li>Recibes la información en tu admin panel</li>
            </ol>
        </div>
    </div>

    <script>
        // Genera el QR code
        const qrContainer = document.getElementById('qrcode');
        const url = 'https://tudominio.com/?clientMode=delivery'; // 🔴 CAMBIAR POR TU DOMINIO
        
        new QRCode(qrContainer, {
            text: url,
            width: 256,
            height: 256,
            colorDark: '#667eea',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        function downloadQR() {
            const canvas = qrContainer.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = 'qr-delivery.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }
    </script>
</body>
</html>
```

---

## ✅ Testing & Deployment

### 10.1 Testing Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env.local
echo "POSTGRES_URL=postgresql://..." > .env.local

# 3. Iniciar desarrollo
npm run dev

# 4. Abrir navegador
open http://localhost:5173/?clientMode=delivery

# 5. Probar flujo completo:
#    - Llenar formulario
#    - Subir fotos (2 fotos)
#    - Verificar en admin panel
#    - Verificar email recibido
```

### 10.2 Deployment en Vercel

```bash
# 1. Conectar a Vercel
vercel

# 2. Configurar variables de entorno en Vercel Dashboard:
#    - POSTGRES_URL
#    - Email credentials (si usas email service)

# 3. Deploy
vercel --prod

# 4. Verificar URL final
# https://tudominio.vercel.app/?clientMode=delivery
```

---

## 📝 Checklist de Implementación

Usa este checklist para asegurarte de no olvidar nada:

### Base de Datos
- [ ] Tabla `deliveries` creada con todos los campos
- [ ] Tabla `customers` existe
- [ ] Índices creados correctamente
- [ ] Función `ensureTablesExist()` actualizada

### Backend
- [ ] Endpoint `createDeliveryFromClient` implementado
- [ ] Endpoint `updateDelivery` implementado
- [ ] Endpoint `deliveries` (GET) implementado
- [ ] Endpoint `markDeliveryAsCompleted` implementado
- [ ] Función `toCamelCase()` funciona correctamente
- [ ] Manejo de errores robusto

### Tipos
- [ ] Interface `Delivery` agregada a `types.ts`
- [ ] Type `DeliveryStatus` agregado
- [ ] Interface `UserInfo` existe

### Servicios
- [ ] Función `parseDelivery()` implementada
- [ ] Función `createDeliveryFromClient()` implementada
- [ ] Función `getDeliveries()` implementada
- [ ] Función `updateDelivery()` implementada
- [ ] Timeout de 60 segundos configurado

### Frontend
- [ ] Componente `ClientDeliveryForm.tsx` creado
- [ ] Función `compressImage()` funciona (800x800px, JPEG 60%)
- [ ] Validaciones de campos implementadas
- [ ] Progress bar visual implementado
- [ ] Botones "Tomar Foto" y "Galería" funcionan en móvil
- [ ] Preview de fotos con botón eliminar
- [ ] Mensajes de éxito/error implementados

### Ruteo
- [ ] `App.tsx` detecta `?clientMode=delivery`
- [ ] Solo muestra formulario en modo delivery
- [ ] Resto de la app no se afecta

### Email
- [ ] Función `sendDeliveryCreatedByClientEmail()` implementada
- [ ] Template HTML del email personalizado
- [ ] Credentials de email configuradas
- [ ] Testing de envío de emails

### QR & Landing
- [ ] Página HTML para generar QR creada
- [ ] URL del QR configurada con tu dominio
- [ ] QR descargable e imprimible

### Testing
- [ ] Probado localmente
- [ ] Probado en móvil real
- [ ] Fotos se comprimen correctamente
- [ ] Email llega al cliente
- [ ] Datos aparecen en admin panel
- [ ] Probado con cliente nuevo (auto-creación)
- [ ] Probado con cliente existente

### Deployment
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso
- [ ] URL final probada
- [ ] QR generado con URL de producción

---

## 🎯 Resultado Final

Cuando termines, tendrás:

1. **URL QR**: `https://tudominio.com/?clientMode=delivery`
2. **Formulario cliente**: 3 pasos intuitivos
3. **Backend robusto**: Auto-creación de clientes, manejo de fotos
4. **Email automático**: Confirmación al cliente
5. **Admin panel**: Vista de todas las entregas

---

## 🆘 Troubleshooting Común

| Problema | Solución |
|---------|----------|
| **413 Payload Too Large** | Limitar a 2 fotos max, comprimir más (40% quality) |
| **Email no llega** | Verificar credentials, revisar logs de backend |
| **Fotos no se guardan** | Verificar columna `photos` sea JSONB, no TEXT |
| **Cliente no se crea** | Manejar error 23505 (duplicate key), buscar existente |
| **Timeout en móvil** | Aumentar timeout a 60s, comprimir fotos antes de enviar |
| **QR no funciona** | Verificar URL completa con `?clientMode=delivery` |

---

## 📚 Recursos Adicionales

- **QR Code Generator**: https://www.qr-code-generator.com/
- **Image Compression**: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **React File Input**: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file

---

**¡Listo!** Con esta guía deberías poder replicar el sistema completo en cualquier proyecto nuevo. 

**Tiempo estimado de implementación**: 4-6 horas

**¿Preguntas?** Revisa los logs de consola en frontend y backend para debugging.
