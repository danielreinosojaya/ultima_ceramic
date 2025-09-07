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
        overrides JSONB
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
        payment_details JSONB,
        attendance JSONB
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
`;

export async function ensureTablesExist() {
    await sql.query(SCHEMA_SQL);
}

const seedSetting = async (key: string, value: any) => {
  await sql`
    INSERT INTO settings (key, value) 
    VALUES (${key}, ${JSON.stringify(value)}) 
    ON CONFLICT (key) DO NOTHING;
  `;
};

export async function seedDatabase() {
    // Seed products only if the table is empty
    const { rows: productCheck } = await sql`SELECT 1 FROM products LIMIT 1`;
    if (productCheck.length === 0) {
        console.log("Seeding products...");
        for (const p of DEFAULT_PRODUCTS) {
            let classesValue = null;
            let priceValue = null;
            let detailsValue = null;
            let schedulingRulesValue = null;
            let overridesValue = null;

            if ('classes' in p) { classesValue = p.classes || null; }
            if ('price' in p) { priceValue = p.price || null; }
            if ('details' in p) { detailsValue = p.details ? JSON.stringify(p.details) : null; }
            if ('schedulingRules' in p) { schedulingRulesValue = p.schedulingRules ? JSON.stringify(p.schedulingRules) : null; }
            if ('overrides' in p) { overridesValue = p.overrides ? JSON.stringify(p.overrides) : null; }

            await sql`
                INSERT INTO products (
                    id, type, name, classes, price, description, image_url, details, is_active, scheduling_rules, overrides
                ) 
                VALUES (
                    ${p.id}, ${p.type}, ${p.name}, ${classesValue}, ${priceValue}, 
                    ${p.description || null}, ${p.imageUrl || null}, ${detailsValue}, 
                    ${p.isActive}, ${schedulingRulesValue}, ${overridesValue}
                ) ON CONFLICT (id) DO NOTHING;
            `;
        }
    }

    // Seed instructors only if the table is empty
    const { rows: instructorCheck } = await sql`SELECT 1 FROM instructors LIMIT 1`;
    if (instructorCheck.length === 0) {
        console.log("Seeding instructors...");
        for (const i of DEFAULT_INSTRUCTORS) {
            await sql`INSERT INTO instructors (id, name, color_scheme) VALUES (${i.id}, ${i.name}, ${i.colorScheme}) ON CONFLICT (id) DO NOTHING;`;
        }
    }

    // Seed settings individually to allow for additions over time
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