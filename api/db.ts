import { sql } from '@vercel/postgres';

// Validate database connection - try multiple possible environment variable names
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
if (!dbUrl) {
    console.error('Database connection error: No database URL found in environment variables');
    console.error('Checked: POSTGRES_URL, DATABASE_URL, POSTGRES_PRISMA_URL');
    throw new Error('Database URL environment variable is required');
}

// Solo log una vez al inicializar el módulo
let connectionLogged = false;
if (!connectionLogged) {
    console.log('Database connection configured');
    connectionLogged = true;
}

// Obtener reservas por email de cliente
export async function getBookingsByCustomerEmail(email: string) {
    const { rows } = await sql`
        SELECT * FROM bookings WHERE user_info->>'email' = ${email}
    `;
    return rows;
}
// Función para crear un cliente en la tabla customers
export async function createCustomer({ email, firstName, lastName, phone, countryCode, birthday }: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    countryCode?: string;
    birthday?: string;
}) {
    const { rows } = await sql`
        INSERT INTO customers (email, first_name, last_name, phone, country_code, birthday)
        VALUES (${email}, ${firstName || null}, ${lastName || null}, ${phone || null}, ${countryCode || null}, ${birthday || null})
        ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            country_code = EXCLUDED.country_code,
            birthday = EXCLUDED.birthday
        RETURNING *;
    `;
    return rows[0];
}
import { 
    DEFAULT_PRODUCTS, DEFAULT_AVAILABLE_SLOTS_BY_DAY, DEFAULT_INSTRUCTORS, 
    DEFAULT_POLICIES_TEXT, DEFAULT_CONFIRMATION_MESSAGE, DEFAULT_CLASS_CAPACITY, 
    DEFAULT_CAPACITY_MESSAGES, DEFAULT_FOOTER_INFO, DEFAULT_AUTOMATION_SETTINGS, DEFAULT_BANK_DETAILS
} from '../constants.js';

const SCHEMA_SQL = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS employees (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                nombre VARCHAR(255) NOT NULL,
                cedula VARCHAR(20) NOT NULL,
                cargo VARCHAR(100) NOT NULL,
                fecha_ingreso DATE NOT NULL,
                estado VARCHAR(20) NOT NULL,
                salario NUMERIC(10,2) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vacaciones (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                empleado_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NOT NULL,
                motivo TEXT
        );

        CREATE TABLE IF NOT EXISTS descuentos (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                empleado_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                monto NUMERIC(10,2) NOT NULL,
                motivo TEXT,
                mes VARCHAR(2),
                anio INT
        );

        CREATE TABLE IF NOT EXISTS pagos_extras (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                empleado_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                monto NUMERIC(10,2) NOT NULL,
                motivo TEXT,
                mes VARCHAR(2),
                anio INT
        );

        CREATE TABLE IF NOT EXISTS faltas (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                empleado_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                fecha DATE NOT NULL,
                motivo TEXT
        );

        CREATE TABLE IF NOT EXISTS retrasos (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                empleado_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                fecha DATE NOT NULL,
                minutos INT NOT NULL,
                motivo TEXT
        );

        CREATE TABLE IF NOT EXISTS horas_trabajadas (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                empleado_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                fecha DATE NOT NULL,
                horas NUMERIC(4,2) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS logs_rrhh (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                codigo VARCHAR(255) NOT NULL,
                tipo VARCHAR(20) NOT NULL,
                fecha TIMESTAMPTZ DEFAULT NOW()
        );
`;

// CRUD vacaciones
export async function createVacacion({ empleadoId, fechaInicio, fechaFin, motivo }: {
    empleadoId: string;
    fechaInicio: string;
    fechaFin: string;
    motivo?: string;
}) {
    const { rows } = await sql`
        INSERT INTO vacaciones (empleado_id, fecha_inicio, fecha_fin, motivo)
        VALUES (${empleadoId}, ${fechaInicio}, ${fechaFin}, ${motivo || null})
        RETURNING *;
    `;
    return rows[0];
}
export async function getVacaciones() {
    const { rows } = await sql`SELECT * FROM vacaciones;`;
    return rows;
}

// CRUD descuentos
export async function createDescuento({ empleadoId, monto, motivo, mes, anio }: {
    empleadoId: string;
    monto: number;
    motivo?: string;
    mes?: string;
    anio?: number;
}) {
    const { rows } = await sql`
        INSERT INTO descuentos (empleado_id, monto, motivo, mes, anio)
        VALUES (${empleadoId}, ${monto}, ${motivo || null}, ${mes || null}, ${anio || null})
        RETURNING *;
    `;
    return rows[0];
}
export async function getDescuentos() {
    const { rows } = await sql`SELECT * FROM descuentos;`;
    return rows;
}

// CRUD pagos extras
export async function createPagoExtra({ empleadoId, monto, motivo, mes, anio }: {
    empleadoId: string;
    monto: number;
    motivo?: string;
    mes?: string;
    anio?: number;
}) {
    const { rows } = await sql`
        INSERT INTO pagos_extras (empleado_id, monto, motivo, mes, anio)
        VALUES (${empleadoId}, ${monto}, ${motivo || null}, ${mes || null}, ${anio || null})
        RETURNING *;
    `;
    return rows[0];
}
export async function getPagosExtras() {
    const { rows } = await sql`SELECT * FROM pagos_extras;`;
    return rows;
}

// CRUD faltas
export async function createFalta({ empleadoId, fecha, motivo }: {
    empleadoId: string;
    fecha: string;
    motivo?: string;
}) {
    const { rows } = await sql`
        INSERT INTO faltas (empleado_id, fecha, motivo)
        VALUES (${empleadoId}, ${fecha}, ${motivo || null})
        RETURNING *;
    `;
    return rows[0];
}
export async function getFaltas() {
    const { rows } = await sql`SELECT * FROM faltas;`;
    return rows;
}

// CRUD retrasos
export async function createRetraso({ empleadoId, fecha, minutos, motivo }: {
    empleadoId: string;
    fecha: string;
    minutos: number;
    motivo?: string;
}) {
    const { rows } = await sql`
        INSERT INTO retrasos (empleado_id, fecha, minutos, motivo)
        VALUES (${empleadoId}, ${fecha}, ${minutos}, ${motivo || null})
        RETURNING *;
    `;
    return rows[0];
}
export async function getRetrasos() {
    const { rows } = await sql`SELECT * FROM retrasos;`;
    return rows;
}

// CRUD horas trabajadas
export async function createHorasTrabajadas({ empleadoId, fecha, horas }: {
    empleadoId: string;
    fecha: string;
    horas: number;
}) {
    const { rows } = await sql`
        INSERT INTO horas_trabajadas (empleado_id, fecha, horas)
        VALUES (${empleadoId}, ${fecha}, ${horas})
        RETURNING *;
    `;
    return rows[0];
}
export async function getHorasTrabajadas() {
    const { rows } = await sql`SELECT * FROM horas_trabajadas;`;
    return rows;
}

// CRUD logs RRHH
export async function createLogRRHH({ codigo, tipo }: { codigo: string; tipo: string }) {
    const { rows } = await sql`
        INSERT INTO logs_rrhh (codigo, tipo)
        VALUES (${codigo}, ${tipo})
        RETURNING *;
    `;
    return rows[0];
}
export async function getLogsRRHH() {
    const { rows } = await sql`SELECT * FROM logs_rrhh;`;
    return rows;
}

// CRUD empleados
export async function createEmployee({ nombre, cedula, cargo, fechaIngreso, estado, salario }: {
    nombre: string;
    cedula: string;
    cargo: string;
    fechaIngreso: string;
    estado: string;
    salario: number;
}) {
    try {
        console.log('[createEmployee] Datos recibidos:', { nombre, cedula, cargo, fechaIngreso, estado, salario });
        // Validar tipos y formato de fecha
        if (!nombre || !cedula || !cargo || !fechaIngreso || !estado || typeof salario !== 'number') {
            console.error('[createEmployee] Campos inválidos:', { nombre, cedula, cargo, fechaIngreso, estado, salario });
            throw new Error('Campos inválidos para empleado');
        }
        // Validar formato de fecha
        const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaIngreso);
        if (!fechaValida) {
            console.error('[createEmployee] Formato de fecha inválido:', fechaIngreso);
            throw new Error('Formato de fechaIngreso inválido, debe ser YYYY-MM-DD');
        }
        const { rows } = await sql`
            INSERT INTO employees (nombre, cedula, cargo, fecha_ingreso, estado, salario)
            VALUES (${nombre}, ${cedula}, ${cargo}, ${fechaIngreso}, ${estado}, ${salario})
            RETURNING *;
        `;
        console.log('[createEmployee] Empleado creado:', rows[0]);
        return rows[0];
    } catch (error) {
        console.error('[createEmployee] Error:', error);
        throw error;
    }
}

export async function getEmployees() {
    const { rows } = await sql`SELECT * FROM employees ORDER BY nombre ASC;`;
    return rows;
}

export async function updateEmployee({ id, nombre, cedula, cargo, fechaIngreso, estado, salario }: {
    id: string;
    nombre: string;
    cedula: string;
    cargo: string;
    fechaIngreso: string;
    estado: string;
    salario: number;
}) {
    const { rows } = await sql`
        UPDATE employees SET nombre=${nombre}, cedula=${cedula}, cargo=${cargo}, fecha_ingreso=${fechaIngreso}, estado=${estado}, salario=${salario}
        WHERE id=${id}
        RETURNING *;
    `;
    return rows[0];
}

export async function deleteEmployee(id: string) {
    await sql`DELETE FROM employees WHERE id=${id};`;
    return true;
}

export async function ensureTablesExist() {
    console.log('Starting table creation/migration...');
    
    try {
        // Split the large schema into smaller chunks to avoid timeouts
        const schemas = [
            // Core tables first
            `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
            
            `CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                classes INT,
                price NUMERIC(10, 2),
                description TEXT,
                image_url TEXT,
                details JSONB,
                is_active BOOLEAN DEFAULT true,
                scheduling_rules JSONB,
                overrides JSONB,
                min_participants INT,
                price_per_person NUMERIC(10, 2)
            );`,
            
            `CREATE TABLE IF NOT EXISTS bookings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                product_id VARCHAR(255),
                product_type VARCHAR(50),
                slots JSONB,
                user_info JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                is_paid BOOLEAN DEFAULT false,
                price NUMERIC(10, 2),
                booking_mode VARCHAR(50),
                product JSONB,
                booking_code VARCHAR(50) UNIQUE,
                payment_details JSONB DEFAULT '[]'::jsonb,
                attendance JSONB,
                booking_date TEXT,
                participants INT DEFAULT 1,
                client_note TEXT
            );`
        ];

        // Execute schemas one by one with logging
        for (let i = 0; i < schemas.length; i++) {
            console.log(`Executing schema ${i + 1}/${schemas.length}...`);
            await sql.query(schemas[i]);
        }
        
        console.log('Core tables created successfully');
        
    } catch (error: any) {
        // Ignore duplicate constraint errors as they indicate the tables already exist
        if (error.code !== '23505' && !error.message?.includes('already exists')) {
            console.error('Schema creation error:', error);
            throw error;
        }
        console.log('Core tables already exist, continuing...');
    }
    
    // Quick column checks only - skip heavy migrations for now
    try {
        console.log('Checking essential columns...');
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_participants INT;`;
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_person NUMERIC(10, 2);`;
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;`;
        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants INT DEFAULT 1;`;
        console.log("Essential columns ensured.");
    } catch (error) {
        console.error("Error during column checks:", error);
        // Don't throw - continue even if migrations fail
    }
}

const seedSetting = async (key: string, value: any) => {
  await sql`
    INSERT INTO settings (key, value) 
    VALUES (${key}, ${JSON.stringify(value)}) 
    ON CONFLICT (key) DO NOTHING;
  `;
};

export async function seedDatabase() {
    const { rows: productCheck } = await sql`SELECT 1 FROM products LIMIT 1`;
    if (productCheck.length === 0) {
        console.log("Seeding products...");
        for (const p of DEFAULT_PRODUCTS) {
            let classesValue = null;
            let priceValue = null;
            let detailsValue = null;
            let schedulingRulesValue = null;
            let overridesValue = null;
            let minParticipantsValue = null;
            let pricePerPersonValue = null;

            if ('classes' in p) { classesValue = p.classes || null; }
            if ('price' in p) { priceValue = p.price || null; }
            if ('details' in p) { detailsValue = p.details ? JSON.stringify(p.details) : null; }
            if ('schedulingRules' in p) { schedulingRulesValue = p.schedulingRules ? JSON.stringify(p.schedulingRules) : null; }
            if ('overrides' in p) { overridesValue = p.overrides ? JSON.stringify(p.overrides) : null; }
            if ('minParticipants' in p) { minParticipantsValue = p.minParticipants || null; }
            if ('pricePerPerson' in p) { pricePerPersonValue = p.pricePerPerson || null; }

            await sql`
                INSERT INTO products (
                    id, type, name, classes, price, description, image_url, details, is_active, scheduling_rules, overrides, min_participants, price_per_person
                ) 
                VALUES (
                    ${p.id}, ${p.type}, ${p.name}, ${classesValue}, ${priceValue}, 
                    ${p.description || null}, ${p.imageUrl || null}, ${detailsValue}, 
                    ${p.isActive}, ${schedulingRulesValue}, ${overridesValue},
                    ${minParticipantsValue}, ${pricePerPersonValue}
                ) ON CONFLICT (id) DO NOTHING;
            `;
        }
    }

    const { rows: instructorCheck } = await sql`SELECT 1 FROM instructors LIMIT 1`;
    if (instructorCheck.length === 0) {
        console.log("Seeding instructors...");
        for (const i of DEFAULT_INSTRUCTORS) {
            await sql`INSERT INTO instructors (id, name, color_scheme) VALUES (${i.id}, ${i.name}, ${i.colorScheme}) ON CONFLICT (id) DO NOTHING;`;
        }
    }

    console.log("Seeding settings...");
    await seedSetting('availability', DEFAULT_AVAILABLE_SLOTS_BY_DAY);
    await seedSetting('scheduleOverrides', {});
    await seedSetting('announcements', []);
    await seedSetting('policies', DEFAULT_POLICIES_TEXT);
    await seedSetting('confirmationMessage', DEFAULT_CONFIRMATION_MESSAGE);
    await seedSetting('classCapacity', DEFAULT_CLASS_CAPACITY);
    await seedSetting('capacityMessages', DEFAULT_CAPACITY_MESSAGES);
    await seedSetting('uiText_es', {});
    await seedSetting('uiText_en', {});
    await seedSetting('footerInfo', DEFAULT_FOOTER_INFO);
    await seedSetting('automationSettings', DEFAULT_AUTOMATION_SETTINGS);
    await seedSetting('bankDetails', DEFAULT_BANK_DETAILS);
    await seedSetting('backgroundSettings', {topLeft: null, bottomRight: null});

    console.log("Database seeding check complete.");
}
