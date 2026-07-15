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
