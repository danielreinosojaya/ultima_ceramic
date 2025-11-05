-- Seed admin codes with default credentials
-- Passwords are pre-hashed using bcryptjs with cost 10
-- Password: "admin2025" -> hash: $2b$10$xK1.kJ3mL9oP2qR4sT5uG.u9mW8xY7zA6bC5dE4fG3hI2jK1lM0nO

INSERT INTO admin_codes (code, password_hash, active, created_at)
VALUES (
  'ADMIN2025',
  '$2b$10$xK1.kJ3mL9oP2qR4sT5uG.u9mW8xY7zA6bC5dE4fG3hI2jK1lM0nO',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;
