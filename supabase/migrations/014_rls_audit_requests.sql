-- =====================================================
-- MIGRACIÓN 014: RLS PARA SOLICITUDES DE AUDITORÍA
-- Corrige "new row violates row-level security policy"
-- al subir adjuntos en audit_request_attachments
-- =====================================================

-- ── 1. audit_requests ────────────────────────────────
ALTER TABLE audit_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios de la misma jurisdicción (o superadmin)
DROP POLICY IF EXISTS "audit_requests_select" ON audit_requests;
CREATE POLICY "audit_requests_select" ON audit_requests
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- INSERT: solo usuarios de la misma jurisdicción
DROP POLICY IF EXISTS "audit_requests_insert" ON audit_requests;
CREATE POLICY "audit_requests_insert" ON audit_requests
    FOR INSERT WITH CHECK (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- UPDATE: solo usuarios de la misma jurisdicción
DROP POLICY IF EXISTS "audit_requests_update" ON audit_requests;
CREATE POLICY "audit_requests_update" ON audit_requests
    FOR UPDATE USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- ── 2. audit_request_notes ───────────────────────────
ALTER TABLE audit_request_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier usuario autenticado puede leer notas de solicitudes de su jurisdicción
DROP POLICY IF EXISTS "audit_request_notes_select" ON audit_request_notes;
CREATE POLICY "audit_request_notes_select" ON audit_request_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM audit_requests ar
            WHERE ar.id = audit_request_notes.request_id
              AND (ar.jurisdiction_id = public.user_jurisdiction_id()
                   OR public.user_jurisdiction_id() IS NULL)
        )
    );

-- INSERT: usuario autenticado puede agregar notas a solicitudes de su jurisdicción
DROP POLICY IF EXISTS "audit_request_notes_insert" ON audit_request_notes;
CREATE POLICY "audit_request_notes_insert" ON audit_request_notes
    FOR INSERT WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM audit_requests ar
            WHERE ar.id = audit_request_notes.request_id
              AND (ar.jurisdiction_id = public.user_jurisdiction_id()
                   OR public.user_jurisdiction_id() IS NULL)
        )
    );

-- ── 3. audit_request_attachments ─────────────────────
ALTER TABLE audit_request_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: ver adjuntos de solicitudes de la misma jurisdicción
DROP POLICY IF EXISTS "audit_request_attachments_select" ON audit_request_attachments;
CREATE POLICY "audit_request_attachments_select" ON audit_request_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM audit_requests ar
            WHERE ar.id = audit_request_attachments.request_id
              AND (ar.jurisdiction_id = public.user_jurisdiction_id()
                   OR public.user_jurisdiction_id() IS NULL)
        )
    );

-- INSERT: usuario autenticado puede subir adjuntos, y el uploaded_by debe ser su propio UID
DROP POLICY IF EXISTS "audit_request_attachments_insert" ON audit_request_attachments;
CREATE POLICY "audit_request_attachments_insert" ON audit_request_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM audit_requests ar
            WHERE ar.id = audit_request_attachments.request_id
              AND (ar.jurisdiction_id = public.user_jurisdiction_id()
                   OR public.user_jurisdiction_id() IS NULL)
        )
    );

-- ── 4. audit_request_log ─────────────────────────────
ALTER TABLE audit_request_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_request_log_select" ON audit_request_log;
CREATE POLICY "audit_request_log_select" ON audit_request_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM audit_requests ar
            WHERE ar.id = audit_request_log.request_id
              AND (ar.jurisdiction_id = public.user_jurisdiction_id()
                   OR public.user_jurisdiction_id() IS NULL)
        )
    );

DROP POLICY IF EXISTS "audit_request_log_insert" ON audit_request_log;
CREATE POLICY "audit_request_log_insert" ON audit_request_log
    FOR INSERT WITH CHECK (
        performed_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM audit_requests ar
            WHERE ar.id = audit_request_log.request_id
              AND (ar.jurisdiction_id = public.user_jurisdiction_id()
                   OR public.user_jurisdiction_id() IS NULL)
        )
    );

-- ── 5. Storage: bucket audit-attachments ─────────────
-- IMPORTANTE: ejecutar DESPUÉS de crear el bucket en Supabase Storage.
-- Si el bucket no existe, crearlo primero:
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('audit-attachments', 'audit-attachments', false)
--   ON CONFLICT (id) DO NOTHING;

-- SELECT: usuarios autenticados pueden descargar archivos del bucket
DROP POLICY IF EXISTS "audit_attachments_storage_select" ON storage.objects;
CREATE POLICY "audit_attachments_storage_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audit-attachments'
        AND auth.role() = 'authenticated'
    );

-- INSERT: usuarios autenticados pueden subir archivos al bucket
DROP POLICY IF EXISTS "audit_attachments_storage_insert" ON storage.objects;
CREATE POLICY "audit_attachments_storage_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audit-attachments'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE: solo el propietario puede eliminar su archivo
DROP POLICY IF EXISTS "audit_attachments_storage_delete" ON storage.objects;
CREATE POLICY "audit_attachments_storage_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audit-attachments'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- =====================================================
-- FIN DE MIGRACIÓN 014
-- =====================================================
-- INSTRUCCIONES DE APLICACIÓN:
--  1. Abrir Supabase → SQL Editor → New query
--  2. Pegar este script completo
--  3. Ejecutar (Run)
--  4. Verificar que no hay errores en el panel inferior
-- =====================================================
