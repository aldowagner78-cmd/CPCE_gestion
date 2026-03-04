import { createClient } from '@/lib/supabase';

const supabase = createClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string): any => supabase.from(table as any);

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface PracticeLimit {
    id: number;
    jurisdiction_id: number;
    practice_id: number | null;
    practice_code: string | null;
    plan_id: number | null;
    max_per_year: number | null;
    min_days_between: number | null;
    min_age_years: number | null;
    max_age_years: number | null;
    gender_restriction: 'M' | 'F' | 'X' | null;
    diagnosis_code: string | null;
    requires_authorization: boolean;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    practice_name?: string;
    plan_name?: string;
}

export interface AutoAuthRule {
    id: number;
    jurisdiction_id: number;
    rule_name: string;
    description: string | null;
    practice_code: string | null;
    practice_category: string | null;
    plan_id: number | null;
    max_amount: number | null;
    requires_no_prior_in_period: number | null;
    requires_active_affiliate: boolean;
    conditions: Record<string, unknown>;
    is_active: boolean;
    priority: number;
    created_at: string;
    updated_at: string;
}

export interface PlanCoverageOverride {
    id: number;
    jurisdiction_id: number;
    plan_id: number;
    practice_id: number | null;
    practice_category: string | null;
    coverage_percent: number;
    copay_type: 'percent' | 'fixed';
    copay_value: number;
    notes: string | null;
    valid_from: string;
    valid_to: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    plan_name?: string;
    practice_name?: string;
}

export interface SpecialProgram {
    id: number;
    jurisdiction_id: number;
    name: string;
    code: string;
    description: string | null;
    inclusion_criteria: Record<string, unknown>;
    benefits: Record<string, unknown>;
    color: string;
    icon: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SlaConfig {
    id: number;
    jurisdiction_id: number;
    expedient_type: string;
    priority_level: 'normal' | 'urgente' | 'emergencia';
    target_hours: number;
    alert_at_percent: number;
    working_hours_start: string;
    working_hours_end: string;
    working_days: number[];
    created_at: string;
    updated_at: string;
}

// ────────────────────────────────────────────────────────────
// Practice Limits
// ────────────────────────────────────────────────────────────

export const practiceLimitsService = {
    async list(jurisdictionId: number): Promise<PracticeLimit[]> {
        const { data, error } = await db('practice_limits')
            .select('*, practices(description), plans(name)')
            .eq('jurisdiction_id', jurisdictionId)
            .order('id', { ascending: false });
        if (error) throw error;
        return (data || []).map((r: Record<string, unknown>) => ({
            ...r,
            practice_name: (r.practices as { description: string } | null)?.description,
            plan_name: (r.plans as { name: string } | null)?.name,
        })) as PracticeLimit[];
    },

    async create(limit: Omit<PracticeLimit, 'id' | 'created_at' | 'updated_at' | 'practice_name' | 'plan_name'>): Promise<PracticeLimit> {
        const { data, error } = await db('practice_limits').insert(limit).select().single();
        if (error) throw error;
        return data as PracticeLimit;
    },

    async update(id: number, changes: Partial<PracticeLimit>): Promise<void> {
        const { error } = await db('practice_limits')
            .update({ ...changes, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: number): Promise<void> {
        const { error } = await db('practice_limits').delete().eq('id', id);
        if (error) throw error;
    },

    async toggleActive(id: number, is_active: boolean): Promise<void> {
        await this.update(id, { is_active });
    },
};

// ────────────────────────────────────────────────────────────
// Auto Authorization Rules
// ────────────────────────────────────────────────────────────

export const autoAuthRulesService = {
    async list(jurisdictionId: number): Promise<AutoAuthRule[]> {
        const { data, error } = await db('auto_authorization_rules')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .order('priority', { ascending: false });
        if (error) throw error;
        return (data || []) as AutoAuthRule[];
    },

    async create(rule: Omit<AutoAuthRule, 'id' | 'created_at' | 'updated_at'>): Promise<AutoAuthRule> {
        const { data, error } = await db('auto_authorization_rules').insert(rule).select().single();
        if (error) throw error;
        return data as AutoAuthRule;
    },

    async update(id: number, changes: Partial<AutoAuthRule>): Promise<void> {
        const { error } = await db('auto_authorization_rules')
            .update({ ...changes, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    async toggleActive(id: number, is_active: boolean): Promise<void> {
        await this.update(id, { is_active });
    },

    async delete(id: number): Promise<void> {
        const { error } = await db('auto_authorization_rules').delete().eq('id', id);
        if (error) throw error;
    },
};

// ────────────────────────────────────────────────────────────
// Plan Coverage Overrides
// ────────────────────────────────────────────────────────────

export const planCoverageService = {
    async list(jurisdictionId: number): Promise<PlanCoverageOverride[]> {
        const { data, error } = await db('plan_coverage_overrides')
            .select('*, plans(name), practices(description)')
            .eq('jurisdiction_id', jurisdictionId)
            .order('plan_id');
        if (error) throw error;
        return (data || []).map((r: Record<string, unknown>) => ({
            ...r,
            plan_name: (r.plans as { name: string } | null)?.name,
            practice_name: (r.practices as { description: string } | null)?.description,
        })) as PlanCoverageOverride[];
    },

    async upsert(override: Omit<PlanCoverageOverride, 'id' | 'created_at' | 'updated_at' | 'plan_name' | 'practice_name'>): Promise<void> {
        const { error } = await db('plan_coverage_overrides').upsert({
            ...override,
            updated_at: new Date().toISOString(),
        });
        if (error) throw error;
    },

    async delete(id: number): Promise<void> {
        const { error } = await db('plan_coverage_overrides').delete().eq('id', id);
        if (error) throw error;
    },
};

// ────────────────────────────────────────────────────────────
// Special Programs
// ────────────────────────────────────────────────────────────

export const specialProgramsService = {
    async list(jurisdictionId: number): Promise<SpecialProgram[]> {
        const { data, error } = await db('special_programs')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .order('name');
        if (error) throw error;
        return (data || []) as SpecialProgram[];
    },

    async create(program: Omit<SpecialProgram, 'id' | 'created_at' | 'updated_at'>): Promise<SpecialProgram> {
        const { data, error } = await db('special_programs').insert(program).select().single();
        if (error) throw error;
        return data as SpecialProgram;
    },

    async update(id: number, changes: Partial<SpecialProgram>): Promise<void> {
        const { error } = await db('special_programs')
            .update({ ...changes, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    async toggleActive(id: number, is_active: boolean): Promise<void> {
        await this.update(id, { is_active });
    },

    async delete(id: number): Promise<void> {
        const { error } = await db('special_programs').delete().eq('id', id);
        if (error) throw error;
    },
};

// ────────────────────────────────────────────────────────────
// SLA Configuration
// ────────────────────────────────────────────────────────────

export const slaConfigService = {
    async list(jurisdictionId: number): Promise<SlaConfig[]> {
        const { data, error } = await db('sla_config')
            .select('*')
            .eq('jurisdiction_id', jurisdictionId)
            .order('expedient_type');
        if (error) throw error;
        return (data || []) as SlaConfig[];
    },

    async upsert(config: Omit<SlaConfig, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
        const { error } = await db('sla_config').upsert({
            ...config,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'jurisdiction_id,expedient_type,priority_level' });
        if (error) throw error;
    },

    async updateById(id: number, changes: Partial<SlaConfig>): Promise<void> {
        const { error } = await db('sla_config')
            .update({ ...changes, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },
};
