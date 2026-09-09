-- MNB Payroll System consolidation migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS source_id UUID;
CREATE INDEX IF NOT EXISTS idx_payroll_items_source_id ON payroll_items(source_id);
CREATE INDEX IF NOT EXISTS idx_employee_payrolls_payment_status ON employee_payrolls(payment_status);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_employee_payroll ON payroll_payments(employee_payroll_id);
INSERT INTO system_settings(setting_key,setting_value,description) VALUES
('company_name','MNB','Organisation name'),('company_address','','Organisation address'),
('company_email','','Organisation email'),('company_phone','','Organisation phone'),
('default_currency','USD','Default payroll currency'),('employee_number_prefix','EMP','Employee number prefix')
ON CONFLICT(setting_key) DO NOTHING;

-- ===== Role and access-control upgrade =====
-- MNB Payroll System: role-based access, user administration, edit approvals and employee documents
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Rename legacy roles where present so existing users keep their role IDs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM roles WHERE name = 'Human Resources')
     AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'HR Officer') THEN
    UPDATE roles SET name = 'HR Officer' WHERE name = 'Human Resources';
  END IF;

  IF EXISTS (SELECT 1 FROM roles WHERE name = 'Accounts Officer')
     AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Salaries Officer') THEN
    UPDATE roles SET name = 'Salaries Officer' WHERE name = 'Accounts Officer';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='description') THEN
    INSERT INTO roles (name, description) SELECT 'Administrator','Full system access' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='Administrator');
    INSERT INTO roles (name, description) SELECT 'HR Officer','Human resources capture and management' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='HR Officer');
    INSERT INTO roles (name, description) SELECT 'Salaries Officer','Payroll and salary processing' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='Salaries Officer');
  ELSE
    INSERT INTO roles (name) SELECT 'Administrator' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='Administrator');
    INSERT INTO roles (name) SELECT 'HR Officer' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='HR Officer');
    INSERT INTO roles (name) SELECT 'Salaries Officer' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name='Salaries Officer');
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS edit_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_name VARCHAR(100) NOT NULL,
  record_id UUID,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  grant_expires_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT edit_access_status_check CHECK (status IN ('pending','approved','rejected','expired'))
);
CREATE INDEX IF NOT EXISTS idx_edit_access_requester ON edit_access_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_edit_access_status ON edit_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_access_lookup ON edit_access_requests(requester_id,module_name,record_id,status,grant_expires_at);

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_data BYTEA,
  mime_type VARCHAR(120),
  file_size BIGINT,
  notes TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_document_type_check CHECK (
    document_type IN ('certificate','application_letter','transcript','contract','identity_document','other')
  )
);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id,created_at DESC);

-- Helpful indexes for admin user management.
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE employee_documents ALTER COLUMN file_url DROP NOT NULL;
