-- =============================================================
-- 005_rls_policies.sql
-- Row Level Security: cada usuario solo ve datos de su jurisdicción
-- =============================================================

-- ── Helper: obtener jurisdiction_id del usuario autenticado ──
CREATE OR REPLACE FUNCTION public.user_jurisdiction_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT jurisdiction_id FROM public.users WHERE id = auth.uid();
$$;

-- ══════════════════════════════════════════════════════════════
-- 1. affiliates
-- ══════════════════════════════════════════════════════════════
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliates_select_by_jurisdiction" ON affiliates
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL -- superadmin sin jurisdicción fija
    );

CREATE POLICY "affiliates_insert_by_jurisdiction" ON affiliates
    FOR INSERT WITH CHECK (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "affiliates_update_by_jurisdiction" ON affiliates
    FOR UPDATE USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "affiliates_delete_by_jurisdiction" ON affiliates
    FOR DELETE USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- ══════════════════════════════════════════════════════════════
-- 2. practices
-- ══════════════════════════════════════════════════════════════
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practices_select_by_jurisdiction" ON practices
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "practices_manage_by_jurisdiction" ON practices
    FOR ALL USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- ══════════════════════════════════════════════════════════════
-- 3. plans
-- ══════════════════════════════════════════════════════════════
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_by_jurisdiction" ON plans
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "plans_manage_by_jurisdiction" ON plans
    FOR ALL USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- ══════════════════════════════════════════════════════════════
-- 4. audits
-- ══════════════════════════════════════════════════════════════
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits_select_by_jurisdiction" ON audits
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "audits_insert_by_jurisdiction" ON audits
    FOR INSERT WITH CHECK (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "audits_update_by_jurisdiction" ON audits
    FOR UPDATE USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- ══════════════════════════════════════════════════════════════
-- 5. events
-- ══════════════════════════════════════════════════════════════
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_by_jurisdiction" ON events
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR jurisdiction_id IS NULL
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "events_manage_by_jurisdiction" ON events
    FOR ALL USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR jurisdiction_id IS NULL
        OR public.user_jurisdiction_id() IS NULL
    );

-- ══════════════════════════════════════════════════════════════
-- 6. alerts
-- ══════════════════════════════════════════════════════════════
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_select_by_jurisdiction" ON alerts
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR jurisdiction_id IS NULL
        OR public.user_jurisdiction_id() IS NULL
    );

CREATE POLICY "alerts_manage_by_jurisdiction" ON alerts
    FOR ALL USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR jurisdiction_id IS NULL
        OR public.user_jurisdiction_id() IS NULL
    );

-- ══════════════════════════════════════════════════════════════
-- 7. Tablas de referencia (solo lectura para todos)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jurisdictions_read_all" ON jurisdictions FOR SELECT USING (true);

ALTER TABLE practice_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_types_read_all" ON practice_types FOR SELECT USING (true);

ALTER TABLE unit_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unit_values_select_by_jurisdiction" ON unit_values
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR public.user_jurisdiction_id() IS NULL
    );

-- ══════════════════════════════════════════════════════════════
-- 8. conversations & messages (chat)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_participants" ON conversations
    FOR SELECT USING (
        auth.uid() = ANY(
            SELECT unnest(ARRAY[
                (metadata->>'user1')::uuid,
                (metadata->>'user2')::uuid
            ])
        )
        OR public.user_jurisdiction_id() IS NULL
    );

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read" ON messages
    FOR SELECT USING (
        sender_id = auth.uid()
        OR public.user_jurisdiction_id() IS NULL
    );
CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid() OR public.user_jurisdiction_id() IS NULL);

-- ══════════════════════════════════════════════════════════════
-- 9. users (each user sees all users in same jurisdiction)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users
    FOR SELECT USING (
        jurisdiction_id = public.user_jurisdiction_id()
        OR id = auth.uid()
        OR public.user_jurisdiction_id() IS NULL
    );
CREATE POLICY "users_update_self" ON users
    FOR UPDATE USING (id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- NOTA: Para desarrollo/testing, si se necesita deshabilitar RLS:
--   ALTER TABLE <tabla> DISABLE ROW LEVEL SECURITY;
-- ═══════════════════════════════════════════════════════════════
