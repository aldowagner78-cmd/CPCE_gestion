-- ============================================================
-- Migración 025: Tabla de Reposiciones
-- Materiales quirúrgicos (stents, prótesis, etc.) utilizados
-- en urgencias sin autorización previa y que se reponen a posteriori.
-- ============================================================

DO $$ BEGIN
    CREATE TYPE reposition_status AS ENUM (
        'pendiente',
        'en_revision',
        'aprobada',
        'rechazada',
        'pagada',
        'anulada'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.repositions (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id            UUID    REFERENCES public.affiliates(id) ON DELETE SET NULL,
    family_member_relation  TEXT,

    -- Práctica/material
    practice_id             INTEGER REFERENCES public.practices(id) ON DELETE SET NULL,
    material_code           TEXT,
    material_description    TEXT,
    quantity                NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price              NUMERIC(12,2),
    total_amount            NUMERIC(12,2),

    -- Documentos requeridos (URLs de Storage)
    surgical_protocol_url   TEXT,
    implant_certificate_url TEXT,
    stickers_photo_url      TEXT,

    -- Procedimiento
    procedure_date          DATE,
    facility_id             INTEGER,
    surgeon_name            TEXT,

    -- Diagnóstico
    diagnosis_code          TEXT,
    diagnosis_name          TEXT,

    -- Estado y resolución
    status                  reposition_status NOT NULL DEFAULT 'pendiente',
    request_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    resolution_date         DATE,
    approved_amount         NUMERIC(12,2),
    auditor_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes        TEXT,

    -- Expediente vinculado
    expedient_id            UUID,

    -- Jurisdicción
    jurisdiction_id         INTEGER NOT NULL REFERENCES public.jurisdictions(id),

    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_repositions_affiliate ON public.repositions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_repositions_status ON public.repositions(status);
CREATE INDEX IF NOT EXISTS idx_repositions_jurisdiction ON public.repositions(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_repositions_expedient ON public.repositions(expedient_id);
CREATE INDEX IF NOT EXISTS idx_repositions_request_date ON public.repositions(request_date DESC);

-- RLS
ALTER TABLE public.repositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Repositions: lectura por jurisdicción"
    ON public.repositions FOR SELECT
    USING (
        jurisdiction_id = (
            SELECT jurisdiction_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Repositions: inserción por usuarios autenticados"
    ON public.repositions FOR INSERT
    WITH CHECK (
        jurisdiction_id = (
            SELECT jurisdiction_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Repositions: actualización por auditores"
    ON public.repositions FOR UPDATE
    USING (
        jurisdiction_id = (
            SELECT jurisdiction_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_repositions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repositions_updated_at
    BEFORE UPDATE ON public.repositions
    FOR EACH ROW EXECUTE FUNCTION public.update_repositions_updated_at();

COMMENT ON TABLE public.repositions IS
    'Reposiciones de materiales quirúrgicos usados en emergencias sin autorización previa';
