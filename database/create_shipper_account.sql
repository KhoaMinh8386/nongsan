-- Create Shipper Account for Testing
-- Password: 123456

INSERT INTO agri.accounts (email, phone, full_name, password_hash, role)
VALUES (
  'shipper@example.com',
  '0912345678',
  'Shipper Test Account',
  '$2a$10$K./q9BXadvOC86OxIhGAbO3x6Wjqzs0pftITCgeUjjN09mQeA7ia2',
  'SHIPPER'
)
ON CONFLICT (email) DO NOTHING;

-- Verify account created
SELECT id, email, full_name, role, is_active
FROM agri.accounts
WHERE email = 'shipper@example.com';
