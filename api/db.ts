import { sql } from '@vercel/postgres';

// Validate database connection - try multiple possible environment variable names
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
if (!dbUrl) {
    console.warn('⚠️  WARNING: No database URL found in environment variables');
    console.warn('⚠️  Checked: POSTGRES_URL, DATABASE_URL, POSTGRES_PRISMA_URL');
    console.warn('⚠️  Database operations will fail until environment is configured');
    // DO NOT throw here - allow module to load, functions will fail gracefully with proper error responses
} else {
    console.log('✅ Database connection configured');
}

// Helper to check if DB is configured
export function isDatabaseConfigured(): boolean {
    return !!dbUrl;
}

// Helper to throw descriptive error when DB is not configured
export function requireDatabase(): void {
    if (!dbUrl) {
        throw new Error('Database not configured. Please set POSTGRES_URL, DATABASE_URL, or POSTGRES_PRISMA_URL environment variable.');
    }
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

    CREATE TABLE IF NOT EXISTS products (
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
    );

    CREATE TABLE IF NOT EXISTS bookings (
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
        booking_date TEXT
    );

    CREATE TABLE IF NOT EXISTS instructors (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color_scheme VARCHAR(50)
    );
    
    CREATE TABLE IF NOT EXISTS inquiries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        country_code VARCHAR(10),
        participants INT,
        tentative_date DATE,
        tentative_time VARCHAR(10),
        event_type VARCHAR(100),
        message TEXT,
        status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        inquiry_type VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type VARCHAR(50),
        target_id TEXT,
        user_name VARCHAR(255),
        summary TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        read BOOLEAN DEFAULT false
    );
    
    CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB
    );

    CREATE TABLE IF NOT EXISTS client_notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMPTZ,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        type VARCHAR(50),
        channel VARCHAR(50),
        status VARCHAR(50),
        booking_code VARCHAR(50),
        scheduled_at TIMESTAMPTZ
    );
    
    CREATE TABLE IF NOT EXISTS invoice_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        tax_id VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        email VARCHAR(255) NOT NULL,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
    );
    
    CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_email VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        scheduled_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed', 'overdue')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        ready_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        notes TEXT,
        photos JSONB DEFAULT '[]'::jsonb,
        created_by_client BOOLEAN DEFAULT false
    );
    
    CREATE INDEX IF NOT EXISTS idx_deliveries_customer_email ON deliveries(customer_email);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);
`;

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
                client_note TEXT,
                reschedule_allowance INT DEFAULT 0,
                reschedule_used INT DEFAULT 0,
                reschedule_history JSONB DEFAULT '[]'::jsonb,
                last_reschedule_at TIMESTAMPTZ
            );`,
            
            `CREATE TABLE IF NOT EXISTS giftcard_audit (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                giftcard_id VARCHAR(255) NOT NULL,
                booking_id UUID,
                action VARCHAR(50) NOT NULL, -- use, error, revert
                amount NUMERIC(10,2),
                status VARCHAR(20) NOT NULL, -- success, failed, reverted
                error TEXT,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                metadata JSONB
            );`,

            // NEW TABLES FOR EXPERIENCES
            `CREATE TABLE IF NOT EXISTS pieces (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                base_price NUMERIC(10, 2) NOT NULL,
                estimated_hours NUMERIC(5, 2),
                image_url TEXT,
                is_active BOOLEAN DEFAULT true,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );`,

            `CREATE TABLE IF NOT EXISTS group_bookings_metadata (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
                group_size INT NOT NULL,
                group_type VARCHAR(50),
                is_auto_confirmed BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );`,

            `CREATE TABLE IF NOT EXISTS experience_bookings_metadata (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
                pieces_selected JSONB NOT NULL,
                duration_minutes INT,
                guided_option VARCHAR(50),
                total_price_calculated NUMERIC(10, 2),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );`,

            `CREATE TABLE IF NOT EXISTS experience_confirmations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
                confirmed_by_email VARCHAR(255),
                confirmation_reason TEXT,
                rejection_reason TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ
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
        // Some legacy DBs were created without timestamps. Several endpoints rely on these columns in ORDER BY.
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`;
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`;
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_participants INT;`;
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_person NUMERIC(10, 2);`;
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;`;

        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`;
        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants INT DEFAULT 1;`;
        
        // Migration: Add created_by_client column to deliveries table
        await sql`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS created_by_client BOOLEAN DEFAULT false;`;
        
        // Migration: Add ready_at column to deliveries table
        await sql`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;`;
        
        // Migration: Fix deliveries status check constraint to include 'ready'
        try {
            await sql`ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;`;
            await sql`ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check CHECK (status IN ('pending', 'ready', 'completed', 'overdue'));`;
            console.log('✅ Fixed deliveries status check constraint');
        } catch (err) {
            console.warn('⚠️ Could not update deliveries status constraint:', err);
        }
        
        // New columns for Experiences
        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'individual';`;
        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS experience_confirmation_id UUID;`;
        
        // Create indexes for performance
        await sql`CREATE INDEX IF NOT EXISTS idx_pieces_active_sort ON pieces(is_active, sort_order);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_group_bookings_metadata_booking_id ON group_bookings_metadata(booking_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_experience_bookings_metadata_booking_id ON experience_bookings_metadata(booking_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_experience_confirmations_status ON experience_confirmations(status);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_experience_confirmations_expires_at ON experience_confirmations(expires_at);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);`;
        
        console.log("Essential columns and indexes ensured.");
    } catch (error) {
        console.error("Error during column checks:", error);
        // Don't throw - continue even if migrations fail
    }
}

const seedSetting = async (key: string, value: any) => {
  await sql`
    INSERT INTO settings (key, value) 
    VALUES (${key}, ${JSON.stringify(value)}) 
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
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

/**
 * Deletes multiple classes from the database by their IDs.
 * @param classIds - An array of class IDs to delete.
 * @returns The number of rows deleted.
 */
export async function deleteClassesByIds(classIds: string[]): Promise<number> {
    if (!classIds || classIds.length === 0) {
        throw new Error('No class IDs provided for deletion.');
    }

    try {
        const query = `DELETE FROM classes WHERE id = ANY(ARRAY[${classIds.map(id => `'${id}'`).join(',')}])`;
        const { rowCount } = await sql`${query}`;
        return rowCount ?? 0; // Ensure rowCount is never null
    } catch (error) {
        console.error('Error deleting classes:', error);
        throw new Error('Failed to delete classes.');
    }
}

/**
 * Deletes a customer and all related data from the database.
 * @param customerId - The ID of the customer to delete.
 * @returns True if the customer was deleted, false if not found.
 */
export async function deleteCustomerById(customerId: string): Promise<boolean> {
    requireDatabase(); // Ensure the database is configured

    try {
        // Delete related data
        await sql`DELETE FROM bookings WHERE user_info->>'id' = ${customerId}`;
        await sql`DELETE FROM deliveries WHERE customer_email = (SELECT email FROM customers WHERE id = ${customerId})`;
        await sql`DELETE FROM invoice_requests WHERE booking_id IN (SELECT id FROM bookings WHERE user_info->>'id' = ${customerId})`;

        // Delete the customer
        const { rowCount } = await sql`DELETE FROM customers WHERE id = ${customerId}`;
        return rowCount ? rowCount > 0 : false; // Ensure rowCount is not null
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw new Error('Failed to delete customer.');
    }
}

export { sql };
