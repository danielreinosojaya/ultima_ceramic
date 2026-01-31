import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as emailService from './emailService.js';
import type { ValentineRegistration, ValentineRegistrationStatus, ValentineWorkshopType } from '../types.js';

// Capacidades máximas por taller (participantes, no inscripciones)
const WORKSHOP_CAPACITY: Record<string, number> = {
    'florero_arreglo_floral': 15,
    'modelado_san_valentin': 20,
    'torno_san_valentin': 8
};

// Convierte claves snake_case a camelCase
function toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        if (obj instanceof Date) {
            return obj.toISOString();
        }
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            let value = obj[key];
            if (value instanceof Date) {
                value = value.toISOString();
            } else {
                value = toCamelCase(value);
            }
            acc[camelKey] = value;
            return acc;
        }, {} as any);
    }
    return obj;
}

// Genera código único para la inscripción
function generateRegistrationId(): string {
    const prefix = 'VAL26';
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${randomPart}`;
}

// Obtener cupos usados por taller (solo pending y confirmed, no cancelled)
async function getUsedCapacity(): Promise<Record<string, number>> {
    const result = await sql`
        SELECT workshop, COALESCE(SUM(participants), 0) as used
        FROM valentine_registrations
        WHERE status IN ('pending', 'confirmed')
        GROUP BY workshop
    `;
    
    const used: Record<string, number> = {
        'florero_arreglo_floral': 0,
        'modelado_san_valentin': 0,
        'torno_san_valentin': 0
    };
    
    for (const row of result.rows) {
        used[row.workshop] = parseInt(row.used) || 0;
    }
    
    return used;
}

// Crear tabla si no existe
async function ensureTableExists() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS valentine_registrations (
                id VARCHAR(20) PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                birth_date DATE NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255) NOT NULL,
                workshop VARCHAR(50) NOT NULL,
                participants INTEGER NOT NULL DEFAULT 1,
                payment_proof_url TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE,
                admin_notes TEXT,
                confirmed_by VARCHAR(255),
                confirmed_at TIMESTAMP WITH TIME ZONE
            );
        `;
        console.log('[valentine] Table ensured');
    } catch (error) {
        console.error('[valentine] Error ensuring table:', error);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action as string;

    try {
        await ensureTableExists();

        // ========================================
        // GET: Listar inscripciones (admin)
        // ========================================
        if (req.method === 'GET' && action === 'list') {
            const { status, workshop } = req.query;
            
            let query = `SELECT * FROM valentine_registrations WHERE 1=1`;
            const params: any[] = [];
            
            if (status && status !== 'all') {
                params.push(status);
                query += ` AND status = $${params.length}`;
            }
            
            if (workshop && workshop !== 'all') {
                params.push(workshop);
                query += ` AND workshop = $${params.length}`;
            }
            
            query += ` ORDER BY created_at DESC`;
            
            const result = await sql.query(query, params);
            return res.status(200).json({
                success: true,
                data: toCamelCase(result.rows)
            });
        }

        // ========================================
        // GET: Estadísticas (admin dashboard)
        // ========================================
        if (req.method === 'GET' && action === 'stats') {
            const stats = await sql`
                SELECT 
                    workshop,
                    status,
                    SUM(participants) as total_participants,
                    COUNT(*) as registrations_count
                FROM valentine_registrations
                GROUP BY workshop, status
            `;
            
            const totals = await sql`
                SELECT 
                    COUNT(*) as total_registrations,
                    SUM(participants) as total_participants,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
                FROM valentine_registrations
            `;

            return res.status(200).json({
                success: true,
                data: {
                    byWorkshop: toCamelCase(stats.rows),
                    totals: toCamelCase(totals.rows[0])
                }
            });
        }

        // ========================================
        // GET: Disponibilidad de cupos (público)
        // ========================================
        if (req.method === 'GET' && action === 'availability') {
            const usedCapacity = await getUsedCapacity();
            
            const availability = Object.keys(WORKSHOP_CAPACITY).map(workshop => ({
                workshop,
                maxCapacity: WORKSHOP_CAPACITY[workshop],
                usedCapacity: usedCapacity[workshop] || 0,
                availableCapacity: WORKSHOP_CAPACITY[workshop] - (usedCapacity[workshop] || 0),
                isFull: (usedCapacity[workshop] || 0) >= WORKSHOP_CAPACITY[workshop]
            }));

            return res.status(200).json({
                success: true,
                data: availability
            });
        }

        // ========================================
        // GET: Obtener una inscripción por ID
        // ========================================
        if (req.method === 'GET' && action === 'get') {
            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ success: false, error: 'ID requerido' });
            }
            
            const result = await sql`
                SELECT * FROM valentine_registrations WHERE id = ${id as string}
            `;
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Inscripción no encontrada' });
            }
            
            return res.status(200).json({
                success: true,
                data: toCamelCase(result.rows[0])
            });
        }

        // ========================================
        // POST: Crear nueva inscripción (cliente)
        // ========================================
        if (req.method === 'POST' && action === 'register') {
            const { 
                fullName, 
                birthDate, 
                phone, 
                email, 
                workshop, 
                participants,
                paymentProofUrl 
            } = req.body;

            // Validaciones de campos requeridos
            if (!fullName || !birthDate || !phone || !email || !workshop) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Todos los campos son requeridos' 
                });
            }

            // Validación CRÍTICA: El comprobante de pago es OBLIGATORIO
            if (!paymentProofUrl || paymentProofUrl.trim() === '') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'El comprobante de pago es obligatorio. Debes subir una foto o PDF del comprobante.' 
                });
            }

            const validWorkshops = ['florero_arreglo_floral', 'modelado_san_valentin', 'torno_san_valentin'];
            if (!validWorkshops.includes(workshop)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Taller inválido' 
                });
            }

            const participantCount = participants === 2 ? 2 : 1;

            // ========================================
            // VALIDACIÓN DE CAPACIDAD - Bloquear si no hay cupos
            // ========================================
            const maxCapacity = WORKSHOP_CAPACITY[workshop];
            const usedCapacityMap = await getUsedCapacity();
            const usedCapacity = usedCapacityMap[workshop] || 0;
            const availableSpots = maxCapacity - usedCapacity;

            if (availableSpots < participantCount) {
                const workshopNames: Record<string, string> = {
                    'florero_arreglo_floral': 'Decoración de Florero + Arreglo Floral',
                    'modelado_san_valentin': 'Modelado a Mano + Colores San Valentín',
                    'torno_san_valentin': 'Torno Alfarero San Valentín'
                };
                
                if (availableSpots <= 0) {
                    return res.status(400).json({ 
                        success: false, 
                        error: `Lo sentimos, el taller "${workshopNames[workshop]}" ya está completo. No hay cupos disponibles.`,
                        errorCode: 'CAPACITY_FULL'
                    });
                } else {
                    return res.status(400).json({ 
                        success: false, 
                        error: `Solo ${availableSpots === 1 ? 'queda 1 cupo' : `quedan ${availableSpots} cupos`} en este taller. No es posible inscribir ${participantCount} participantes.`,
                        errorCode: 'INSUFFICIENT_CAPACITY'
                    });
                }
            }

            const id = generateRegistrationId();

            await sql`
                INSERT INTO valentine_registrations (
                    id, full_name, birth_date, phone, email, 
                    workshop, participants, payment_proof_url, status, created_at
                ) VALUES (
                    ${id}, ${fullName}, ${birthDate}, ${phone}, ${email.toLowerCase()},
                    ${workshop}, ${participantCount}, ${paymentProofUrl}, 'pending', NOW()
                )
            `;

            // Enviar email de confirmación de inscripción
            try {
                await emailService.sendValentineRegistrationEmail({
                    id,
                    fullName,
                    email: email.toLowerCase(),
                    workshop: workshop as ValentineWorkshopType,
                    participants: participantCount as 1 | 2
                });
            } catch (emailError) {
                console.error('[valentine] Error sending confirmation email:', emailError);
                // No fallar la inscripción por error de email
            }

            return res.status(201).json({
                success: true,
                data: {
                    id,
                    message: '¡Inscripción recibida! Te enviaremos un email cuando validemos tu pago.'
                }
            });
        }

        // ========================================
        // PUT: Actualizar estado (admin)
        // ========================================
        if (req.method === 'PUT' && action === 'updateStatus') {
            const { id, status, adminNotes, adminUser } = req.body;

            if (!id || !status) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'ID y status son requeridos' 
                });
            }

            const validStatuses = ['pending', 'confirmed', 'cancelled', 'attended'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Estado inválido' 
                });
            }

            // Obtener inscripción actual
            const current = await sql`
                SELECT * FROM valentine_registrations WHERE id = ${id}
            `;
            
            if (current.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Inscripción no encontrada' });
            }

            const previousStatus = current.rows[0].status;

            // Actualizar
            if (status === 'confirmed') {
                await sql`
                    UPDATE valentine_registrations 
                    SET status = ${status}, 
                        updated_at = NOW(),
                        admin_notes = COALESCE(${adminNotes || null}, admin_notes),
                        confirmed_by = ${adminUser || 'admin'},
                        confirmed_at = NOW()
                    WHERE id = ${id}
                `;

                // Enviar email de confirmación de pago
                try {
                    const registration = toCamelCase(current.rows[0]) as ValentineRegistration;
                    await emailService.sendValentinePaymentConfirmedEmail({
                        id: registration.id,
                        fullName: registration.fullName,
                        email: registration.email,
                        workshop: registration.workshop,
                        participants: registration.participants
                    });
                } catch (emailError) {
                    console.error('[valentine] Error sending payment confirmed email:', emailError);
                }
            } else {
                await sql`
                    UPDATE valentine_registrations 
                    SET status = ${status}, 
                        updated_at = NOW(),
                        admin_notes = COALESCE(${adminNotes || null}, admin_notes)
                    WHERE id = ${id}
                `;
            }

            // Obtener registro actualizado
            const updated = await sql`
                SELECT * FROM valentine_registrations WHERE id = ${id}
            `;

            return res.status(200).json({
                success: true,
                data: toCamelCase(updated.rows[0])
            });
        }

        // ========================================
        // DELETE: Eliminar inscripción (admin)
        // ========================================
        if (req.method === 'DELETE' && action === 'delete') {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ success: false, error: 'ID requerido' });
            }

            const result = await sql`
                DELETE FROM valentine_registrations WHERE id = ${id as string}
                RETURNING *
            `;

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Inscripción no encontrada' });
            }

            return res.status(200).json({
                success: true,
                data: { deleted: true, id }
            });
        }

        return res.status(400).json({ 
            success: false, 
            error: `Acción no soportada: ${action}` 
        });

    } catch (error) {
        console.error('[valentine] Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Error interno del servidor' 
        });
    }
}
