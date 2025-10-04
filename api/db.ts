import { sql } from '@vercel/postgres';
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
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        notes TEXT,
        photos JSONB DEFAULT '[]'::jsonb
    );
    
    CREATE INDEX IF NOT EXISTS idx_deliveries_customer_email ON deliveries(customer_email);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);
`;

export async function ensureTablesExist() {
    try {
        await sql.query(SCHEMA_SQL);
    } catch (error: any) {
        // Ignore duplicate constraint errors as they indicate the tables already exist
        if (error.code !== '23505') {
            throw error;
        }
        console.log('Tables already exist, continuing with column checks...');
    }
    
    try {
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS tentative_time VARCHAR(10);`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_participants INT;`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_person NUMERIC(10, 2);`;
      await sql`ALTER TABLE bookings ALTER COLUMN payment_details SET DEFAULT '[]'::jsonb;`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;`;
      // Add participants and client_note columns to bookings table
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants INT DEFAULT 1;`;
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_note TEXT;`;
      // Add new columns to deliveries table
      await sql`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;`;
      await sql`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;`;
      console.log("Migration check: new columns ensured.");
    } catch (error) {
      console.error("Error during migration:", error);
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
