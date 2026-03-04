-- =========================================================================
-- MIGRACIÓN 015: FIJAR SEGURIDAD RLS EN TABLAS PÚBLICAS EXPUESTAS
-- =========================================================================
-- Propósito: Cierra las vulnerabilidades advertidas por el Security Advisor
-- de Supabase, habilitando Row Level Security (RLS) en todas las tablas
-- del sistema y permitiendo transitoriamente el acceso completo (CRUD)
-- ÚNICAMENTE a usuarios autenticados.
-- =========================================================================

-- 1) external_nomenclators
ALTER TABLE external_nomenclators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_external_nomenclators" ON external_nomenclators;
CREATE POLICY "allow_authenticated_external_nomenclators" ON external_nomenclators FOR ALL USING (auth.role() = 'authenticated');

-- 2) external_practices
ALTER TABLE external_practices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_external_practices" ON external_practices;
CREATE POLICY "allow_authenticated_external_practices" ON external_practices FOR ALL USING (auth.role() = 'authenticated');

-- 3) post_audits
ALTER TABLE post_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_post_audits" ON post_audits;
CREATE POLICY "allow_authenticated_post_audits" ON post_audits FOR ALL USING (auth.role() = 'authenticated');

-- 4) post_audit_items
ALTER TABLE post_audit_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_post_audit_items" ON post_audit_items;
CREATE POLICY "allow_authenticated_post_audit_items" ON post_audit_items FOR ALL USING (auth.role() = 'authenticated');

-- 5) debit_notes
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_debit_notes" ON debit_notes;
CREATE POLICY "allow_authenticated_debit_notes" ON debit_notes FOR ALL USING (auth.role() = 'authenticated');

-- 6) debit_note_items
ALTER TABLE debit_note_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_debit_note_items" ON debit_note_items;
CREATE POLICY "allow_authenticated_debit_note_items" ON debit_note_items FOR ALL USING (auth.role() = 'authenticated');

-- 7) post_audit_log
ALTER TABLE post_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_post_audit_log" ON post_audit_log;
CREATE POLICY "allow_authenticated_post_audit_log" ON post_audit_log FOR ALL USING (auth.role() = 'authenticated');

-- 8) expedients
ALTER TABLE expedients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_expedients" ON expedients;
CREATE POLICY "allow_authenticated_expedients" ON expedients FOR ALL USING (auth.role() = 'authenticated');

-- 9) expedient_practices
ALTER TABLE expedient_practices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_expedient_practices" ON expedient_practices;
CREATE POLICY "allow_authenticated_expedient_practices" ON expedient_practices FOR ALL USING (auth.role() = 'authenticated');

-- 10) expedient_notes
ALTER TABLE expedient_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_expedient_notes" ON expedient_notes;
CREATE POLICY "allow_authenticated_expedient_notes" ON expedient_notes FOR ALL USING (auth.role() = 'authenticated');

-- 11) expedient_attachments
ALTER TABLE expedient_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_expedient_attachments" ON expedient_attachments;
CREATE POLICY "allow_authenticated_expedient_attachments" ON expedient_attachments FOR ALL USING (auth.role() = 'authenticated');

-- 12) expedient_log
ALTER TABLE expedient_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_expedient_log" ON expedient_log;
CREATE POLICY "allow_authenticated_expedient_log" ON expedient_log FOR ALL USING (auth.role() = 'authenticated');

-- 13) audit_rules_config
ALTER TABLE audit_rules_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_audit_rules_config" ON audit_rules_config;
CREATE POLICY "allow_authenticated_audit_rules_config" ON audit_rules_config FOR ALL USING (auth.role() = 'authenticated');

-- 14) protocols
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_protocols" ON protocols;
CREATE POLICY "allow_authenticated_protocols" ON protocols FOR ALL USING (auth.role() = 'authenticated');

-- 15) providers
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_providers" ON providers;
CREATE POLICY "allow_authenticated_providers" ON providers FOR ALL USING (auth.role() = 'authenticated');

-- 16) affiliate_categories
ALTER TABLE affiliate_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_affiliate_categories" ON affiliate_categories;
CREATE POLICY "allow_authenticated_affiliate_categories" ON affiliate_categories FOR ALL USING (auth.role() = 'authenticated');

-- 17) diseases
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_diseases" ON diseases;
CREATE POLICY "allow_authenticated_diseases" ON diseases FOR ALL USING (auth.role() = 'authenticated');

-- 18) authorizations
ALTER TABLE authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_authorizations" ON authorizations;
CREATE POLICY "allow_authenticated_authorizations" ON authorizations FOR ALL USING (auth.role() = 'authenticated');

-- 19) authorization_details
ALTER TABLE authorization_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_authorization_details" ON authorization_details;
CREATE POLICY "allow_authenticated_authorization_details" ON authorization_details FOR ALL USING (auth.role() = 'authenticated');

-- 20) invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_invoices" ON invoices;
CREATE POLICY "allow_authenticated_invoices" ON invoices FOR ALL USING (auth.role() = 'authenticated');

-- 21) invoice_details
ALTER TABLE invoice_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_invoice_details" ON invoice_details;
CREATE POLICY "allow_authenticated_invoice_details" ON invoice_details FOR ALL USING (auth.role() = 'authenticated');

-- 22) hospitalizations
ALTER TABLE hospitalizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_hospitalizations" ON hospitalizations;
CREATE POLICY "allow_authenticated_hospitalizations" ON hospitalizations FOR ALL USING (auth.role() = 'authenticated');

-- 23) pharmacy_records
ALTER TABLE pharmacy_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_pharmacy_records" ON pharmacy_records;
CREATE POLICY "allow_authenticated_pharmacy_records" ON pharmacy_records FOR ALL USING (auth.role() = 'authenticated');

-- 24) lab_orders
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_lab_orders" ON lab_orders;
CREATE POLICY "allow_authenticated_lab_orders" ON lab_orders FOR ALL USING (auth.role() = 'authenticated');

-- 25) reimbursements
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_reimbursements" ON reimbursements;
CREATE POLICY "allow_authenticated_reimbursements" ON reimbursements FOR ALL USING (auth.role() = 'authenticated');

-- 26) medical_records
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_medical_records" ON medical_records;
CREATE POLICY "allow_authenticated_medical_records" ON medical_records FOR ALL USING (auth.role() = 'authenticated');

-- 27) roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_roles" ON roles;
CREATE POLICY "allow_authenticated_roles" ON roles FOR ALL USING (auth.role() = 'authenticated');

-- 28) permissions
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_permissions" ON permissions;
CREATE POLICY "allow_authenticated_permissions" ON permissions FOR ALL USING (auth.role() = 'authenticated');

-- 29) role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_role_permissions" ON role_permissions;
CREATE POLICY "allow_authenticated_role_permissions" ON role_permissions FOR ALL USING (auth.role() = 'authenticated');

-- 30) user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_user_roles" ON user_roles;
CREATE POLICY "allow_authenticated_user_roles" ON user_roles FOR ALL USING (auth.role() = 'authenticated');

-- 31) plan_revenue
ALTER TABLE plan_revenue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_plan_revenue" ON plan_revenue;
CREATE POLICY "allow_authenticated_plan_revenue" ON plan_revenue FOR ALL USING (auth.role() = 'authenticated');

-- 32) announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_announcements" ON announcements;
CREATE POLICY "allow_authenticated_announcements" ON announcements FOR ALL USING (auth.role() = 'authenticated');

-- 33) homologations
ALTER TABLE homologations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_authenticated_homologations" ON homologations;
CREATE POLICY "allow_authenticated_homologations" ON homologations FOR ALL USING (auth.role() = 'authenticated');

-- NOTA: jurisdictions, alerts, events, practice_types y unit_values
-- ya fueron habilitadas y configuradas en scripts anteriores (005_rls_policies.sql),
-- al igual que audit_requests (014_rls_audit_requests.sql), users, coversations y messages.
