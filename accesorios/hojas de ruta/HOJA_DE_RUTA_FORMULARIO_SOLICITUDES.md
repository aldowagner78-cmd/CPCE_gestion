# HOJA DE RUTA — Rediseño del Formulario Nueva Solicitud CPCE

> **Versión:** 1.1  
> **Fecha:** 6 de marzo de 2026  
> **Estado:** ✅ Aprobado — listo para implementar  
> **Contexto:** Rediseño integral del formulario `src/app/audits/requests/new/page.tsx` para replicar y mejorar la funcionalidad de la aplicación de escritorio CPCE (Delphi), migrandola a la app web Next.js.

---

## Stack técnico

| Elemento | Detalle |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Base de datos | Supabase (PostgreSQL) — `nyoljpcehvkwshlpalcj.supabase.co` |
| Estilos | TailwindCSS + shadcn/ui |
| Estado | React hooks + Context API (`useAuth`, `useJurisdiction`) |
| IA (futuro) | Gemini 2.5-flash (primario) + Groq llama-4-scout (fallback) |

---

## Archivos principales involucrados

```
src/
  app/
    audits/requests/new/
      page.tsx                          ← formulario principal (~950 líneas)
      _components/
        PracticeSelector.tsx            ← tabla de prácticas actual
        AffiliateSearch.tsx             ← búsqueda de afiliado actual
        AffiliateConsumptions.tsx       ← historial consumos actual
        HistoryModals.tsx               ← modales de historial actuales
        types.ts                        ← tipos compartidos
        (nuevos - ver abajo)
  components/
    AIUploadModal.tsx                   ← NO ELIMINAR (uso futuro)
    OCRUpload.tsx                       ← NO ELIMINAR (uso futuro)
  api/ai/parse-document/route.ts        ← NO ELIMINAR (uso futuro)
  types/
    database.ts                         ← tipos de dominio
    supabase.ts                         ← tipos generados Supabase
  services/
    rulesEngine.ts                      ← motor de reglas actual
    (nuevos - ver abajo)
  lib/
    textUtils.ts                        ← NUEVO: utilidades de texto
supabase/
  schema.sql
  migrations/
    [nuevos archivos .sql]
```

---

## Resumen de cambios acordados

| # | Cambio | Prioridad |
|---|--------|-----------|
| 1 | Eliminar botón/flujo de carga asistida por IA del formulario | Alta |
| 2 | Autocompletado de afiliado por número (con búsqueda nombre/DNI como respaldo) | Alta |
| 3 | Renombrar sección "Prácticas" → "Solicita:" | Alta |
| 4 | Nuevos tipos de expediente: `reposiciones` y `subsidios` | Alta |
| 5 | Nueva tabla de prácticas con columnas: N. · Código · Denominación · Cant. · Unitario · Total · %COS · COS · 🕐 (consumos) | Alta |
| 6 | Auto-clasificación del tipo de solicitud según nomenclador de las prácticas | Alta |
| 7 | Modal buscador de nomenclador (botón + siempre visible) | Alta |
| 8 | Relojito (🕐) por fila de práctica: abre modal de consumos previos con tabs (Autorizaciones / Reintegros / Reposiciones) | Alta |
| 9 | Cálculo de valor: `fixed`, `unit_value`, `custom` (extensible) | Alta |
| 10 | Reglas de coseguro configurables por tabla (plan, categoría, condición especial, práctica específica) | Alta |
| 11 | DB nueva tabla `repositions` (materiales quirúrgicos de emergencia) | Alta |
| 12 | DB nueva tabla `coseguro_rules` | Alta |
| 13 | Corrección automática a modo oración en campos de texto | Media |
| 14 | Práctica N/N (no nomenclada): código S/C, descripción libre, valor manual | Alta |
| 15 | Mezcla de nomencladores → auto-clasificar como `programas_especiales` + aviso | Media |

---

## FASE 1 — Eliminar carga asistida por IA del formulario

**Archivo:** `src/app/audits/requests/new/page.tsx`

### Qué eliminar

**Imports:**
```typescript
// Eliminar estas dos líneas:
import { AIUploadModal } from '@/components/AIUploadModal';
import { OCRUpload, type OCRResult } from '@/components/OCRUpload';
```

**Estados a eliminar:**
```typescript
const [loadMode, setLoadMode] = useState<'ia' | 'manual'>('ia');
const [aiDocumentFile, setAiDocumentFile] = useState<File | null>(null);
const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
const [aiAffName, setAiAffName] = useState<string | null>(null);
const [aiDiagTerms, setAiDiagTerms] = useState<string[]>([]);
const [aiLoading, setAiLoading] = useState(false);
```

**Handler a eliminar:** `handleAIParsed` completo (aprox. líneas 120–181) y `handleAddDocumentFromAI`.

**JSX a eliminar:**
- Los botones `<button onClick={() => setLoadMode('ia')}...>` y `<button onClick={() => setLoadMode('manual')}...>` (selector de modo)
- El bloque condicional `{loadMode === 'ia' && <AIUploadModal ... />}`
- El componente `<OCRUpload ... />`
- Cualquier referencia a `aiAffName`, `aiDiagTerms` en el render

**En el reset del formulario** (función `handleReset`/reset button):
```typescript
// Eliminar estas líneas del reset:
setLoadMode('ia');
setAiAffName(null);
setAiDiagTerms([]);
```

### Qué NO eliminar
- `src/components/AIUploadModal.tsx` — mantener, uso futuro (análisis de HC, estudios)
- `src/components/OCRUpload.tsx` — mantener, uso futuro
- `src/app/api/ai/parse-document/route.ts` — mantener, uso futuro
- `src/components/ai/MedicalDocumentReview.tsx` — mantener, uso futuro

### Resultado esperado
El formulario siempre arranca en modo manual, sin botones de IA, sin selector de modo. El campo de adjuntos regular (`AttachmentsPanel`) permanece igual.

---

## FASE 2 — Autocompletado de afiliado por número

**Archivos:** `src/app/audits/requests/new/page.tsx`, `_components/AffiliateSearch.tsx`

### Comportamiento

1. Primer campo visible del formulario: **"Nº Afiliado"** (input tipo `text`, numérico)
2. Al escribir el número: debounce 300ms → query a Supabase por `affiliates.affiliate_number`
3. Si encontrado: auto-poblar nombre, plan, estado, carencia, deuda de coseguro, fecha alta/baja. El campo queda bloqueado (read-only) y muestra badge verde.
4. Si no encontrado: badge rojo "Número no encontrado"
5. Búsqueda por nombre/DNI queda como campo secundario de respaldo (comportamiento actual)
6. Botón "X" para limpiar la búsqueda por número y volver a blank

### Implementación en page.tsx

```typescript
// Agregar estado:
const [affiliateNumberInput, setAffiliateNumberInput] = useState('');
const [affiliateNumberFound, setAffiliateNumberFound] = useState<boolean | null>(null);

// Efecto con debounce:
useEffect(() => {
  if (!affiliateNumberInput.trim()) {
    setAffiliateNumberFound(null);
    return;
  }
  const timer = setTimeout(async () => {
    const { data } = await supabase
      .from('affiliates')
      .select('*, plans(*)')
      .eq('affiliate_number', affiliateNumberInput.trim())
      .single();
    if (data) {
      setAffiliate(data as Affiliate);
      setAffiliateNumberFound(true);
      // También fetchear plan:
      setAffiliatePlan(data.plans ?? null);
      setPlanName(data.plans?.name ?? '');
    } else {
      setAffiliateNumberFound(false);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [affiliateNumberInput]);
```

### Visualización
- Fila: `[Nº Afiliado ___________] [Nombre o DNI (búsqueda respaldo) ___________]`
- Cuando se carga por número: mostrar badge verde con nombre del afiliado, plan, estado, deuda
- Los campos de afiliado actuales se comportan igual una vez seleccionado

---

## FASE 3 — Nuevos tipos de expediente

**Archivos:** `src/types/database.ts`, `src/app/audits/requests/new/page.tsx`

### En `database.ts`

```typescript
export type ExpedientType =
    | 'ambulatoria'
    | 'bioquimica'
    | 'internacion'
    | 'odontologica'
    | 'programas_especiales'
    | 'elementos'
    | 'reintegros'
    | 'reposiciones'    // NUEVO: materiales quirúrgicos de emergencia
    | 'subsidios'       // NUEVO: subsidios de cobertura
```

### En `new/page.tsx` — array EXPEDIENT_TYPES

```typescript
// Agregar al final del array EXPEDIENT_TYPES:
import { PackagePlus, HeartHandshake } from 'lucide-react';

{ value: 'reposiciones',  label: 'Reposiciones',         short: 'Rep', icon: PackagePlus,    cls: 'text-indigo-700 bg-indigo-50 border-indigo-300' },
{ value: 'subsidios',     label: 'Subsidios',             short: 'Sub', icon: HeartHandshake, cls: 'text-rose-700   bg-rose-50   border-rose-300'   },
```

---

## FASE 4 — DB: Tabla `repositions`

**Archivo a crear:** `supabase/migrations/[timestamp]_add_repositions.sql`

Una **reposición** ocurre cuando un material quirúrgico (ej: stent coronario) se usa en emergencia sin autorización previa. Luego el sanatorio/afiliado lo solicita por reposición, acompañando:
- Protocolo quirúrgico
- Certificado de implante  
- Stickers originales del material

```sql
-- TABLA: repositions (Reposiciones de materiales quirúrgicos)
CREATE TABLE IF NOT EXISTS repositions (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Afiliado
    affiliate_id            UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    family_member_relation  VARCHAR(50),                         -- parentesco si es familiar
    
    -- Práctica / Material
    practice_id             BIGINT REFERENCES practices(id) ON DELETE SET NULL,
    material_code           VARCHAR(20),                         -- S/C si no nomenclado
    material_description    TEXT,                                -- descripción (modo oración)
    quantity                DECIMAL(10, 2) DEFAULT 1,
    unit_price              DECIMAL(12, 2),
    total_amount            DECIMAL(12, 2),
    
    -- Documentación obligatoria
    surgical_protocol_url   TEXT,                                -- protocolo quirúrgico
    implant_certificate_url TEXT,                                -- certificado de implante
    stickers_photo_url      TEXT,                                -- foto stickers originales
    
    -- Datos del procedimiento
    procedure_date          DATE,
    facility_id             INT REFERENCES providers(id) ON DELETE SET NULL,
    surgeon_name            VARCHAR(200),
    diagnosis_code          VARCHAR(20),
    diagnosis_name          VARCHAR(300),
    
    -- Resolución
    status                  VARCHAR(20) DEFAULT 'pendiente' 
                               CHECK (status IN (
                                   'pendiente', 'en_revision', 'aprobada',
                                   'rechazada', 'pagada', 'anulada'
                               )),
    request_date            DATE DEFAULT CURRENT_DATE,
    resolution_date         DATE,
    approved_amount         DECIMAL(12, 2),
    auditor_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes        TEXT,
    
    -- Vínculo con expediente digital
    expedient_id            UUID,                                -- FK a expedients cuando exista tabla
    
    -- Metadatos
    jurisdiction_id         INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositions_affiliate ON repositions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_repositions_practice  ON repositions(practice_id);
CREATE INDEX IF NOT EXISTS idx_repositions_status    ON repositions(status);
CREATE INDEX IF NOT EXISTS idx_repositions_date      ON repositions(request_date DESC);
```

---

## FASE 5 — DB: Tabla `coseguro_rules`

**Archivo a crear:** `supabase/migrations/[timestamp]_add_coseguro_rules.sql`

Las reglas de coseguro aplican en orden de especificidad (la más específica gana):

1. Práctica específica por código
2. Condición especial del afiliado (oncológico, diabético, etc.)
3. Categoría de práctica + plan
4. Plan solamente
5. Default global

```sql
-- TABLA: coseguro_rules (Reglas de Coseguro Configurables)
CREATE TABLE IF NOT EXISTS coseguro_rules (
    id               SERIAL PRIMARY KEY,
    description      VARCHAR(200) NOT NULL,
    
    -- Alcance (NULL = aplica a todos)
    plan_id          INT REFERENCES plans(id) ON DELETE CASCADE,
    practice_type_id INT REFERENCES practice_types(id) ON DELETE CASCADE,
    practice_category VARCHAR(100),        -- categoría específica de práctica
    practice_code    VARCHAR(20),          -- código exacto de práctica (más granular)
    
    -- Condición especial del afiliado
    -- Valores: 'oncologico' | 'diabetico' | 'colonoscopia_rutina' |
    --          'mamografia_rutina' | 'psa_rutina' | NULL
    special_condition VARCHAR(50),
    
    -- Coseguro
    coseguro_percent DECIMAL(5, 2) NOT NULL CHECK (coseguro_percent BETWEEN 0 AND 100),
    
    -- Vigencia
    valid_from       DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to         DATE,
    is_active        BOOLEAN DEFAULT TRUE,
    
    -- Metadatos
    jurisdiction_id  INT REFERENCES jurisdictions(id) ON DELETE CASCADE,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales de ejemplo (AJUSTAR según valores reales del CPCE)
INSERT INTO coseguro_rules (description, plan_id, coseguro_percent, valid_from, jurisdiction_id) VALUES
    ('Plan General - Coseguro', 1, 20.00, '2026-01-01', 1),
    ('Plan Premium - Sin coseguro', 2, 0.00, '2026-01-01', 1)
ON CONFLICT DO NOTHING;

INSERT INTO coseguro_rules (description, special_condition, coseguro_percent, valid_from, jurisdiction_id) VALUES
    ('Oncológicos - Coseguro 0%',          'oncologico',         0.00, '2026-01-01', 1),
    ('Diabéticos - Coseguro 0%',           'diabetico',          0.00, '2026-01-01', 1),
    ('Colonoscopía de rutina - 0%',        'colonoscopia_rutina',0.00, '2026-01-01', 1),
    ('Mamografía de rutina - 0%',          'mamografia_rutina',  0.00, '2026-01-01', 1),
    ('PSA de rutina - 0%',                 'psa_rutina',         0.00, '2026-01-01', 1)
ON CONFLICT DO NOTHING;
```

### Servicio `src/services/coseguroService.ts`

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Resuelve el porcentaje de coseguro para una práctica dada.
 * Orden de prioridad (más específico gana):
 *   1. practice_code específico
 *   2. special_condition del afiliado
 *   3. practice_category + plan_id
 *   4. plan_id solamente
 *   5. regla global (plan_id NULL)
 */
export async function getCoseguroPercent(params: {
  practiceCode:       string;
  practiceCategory:   string | null;
  practiceTypeId:     number | null;
  planId:             number;
  affiliateConditions: string[];  // ej: ['oncologico', 'diabetico']
  jurisdictionId:     number;
  today:              string;     // 'YYYY-MM-DD'
}): Promise<number> {
  const supabase = createClientComponentClient();

  const { data: rules } = await supabase
    .from('coseguro_rules')
    .select('*')
    .eq('jurisdiction_id', params.jurisdictionId)
    .eq('is_active', true)
    .lte('valid_from', params.today)
    .or(`valid_to.is.null,valid_to.gte.${params.today}`)
    .order('id', { ascending: false });

  if (!rules || rules.length === 0) return 0;

  // Prioridad 1: código exacto de práctica
  const byCode = rules.find(r => r.practice_code === params.practiceCode);
  if (byCode) return byCode.coseguro_percent;

  // Prioridad 2: condición especial del afiliado
  for (const condition of params.affiliateConditions) {
    const byCondition = rules.find(r => r.special_condition === condition);
    if (byCondition) return byCondition.coseguro_percent;
  }

  // Prioridad 3: categoría + plan
  if (params.practiceCategory) {
    const byCatPlan = rules.find(
      r => r.plan_id === params.planId && r.practice_category === params.practiceCategory
    );
    if (byCatPlan) return byCatPlan.coseguro_percent;
  }

  // Prioridad 4: solo plan
  const byPlan = rules.find(
    r => r.plan_id === params.planId && !r.special_condition && !r.practice_category && !r.practice_code
  );
  if (byPlan) return byPlan.coseguro_percent;

  // Prioridad 5: global
  const global = rules.find(
    r => !r.plan_id && !r.special_condition && !r.practice_category && !r.practice_code
  );
  return global?.coseguro_percent ?? 0;
}
```

---

## FASE 6 — Métodos de cálculo de valores de prácticas

**Migration:** agregar columnas a tabla `practices`  
**Servicio nuevo:** `src/services/practiceValueService.ts`

### Migration SQL

```sql
-- Agregar a la tabla practices:
ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(20) DEFAULT 'unit_value'
    CHECK (calculation_method IN ('fixed', 'unit_value', 'custom')),
  ADD COLUMN IF NOT EXISTS calculation_config JSONB DEFAULT '{}';

COMMENT ON COLUMN practices.calculation_method IS
  'fixed: usa fixed_value directamente | unit_value: unit_quantity × valor_punto | custom: según calculation_config';
COMMENT ON COLUMN practices.calculation_config IS
  'JSON extensible para futuros métodos de cálculo. Ejemplo: {"formula": "...", "factor": 1.5}';
```

### Servicio `src/services/practiceValueService.ts`

```typescript
import type { Practice } from '@/types/database';

export interface UnitValue {
  practice_type_id: number;
  value: number;
  valid_from: string;
  valid_to: string | null;
}

/**
 * Calculates the unit value of a practice.
 * Extensible: add new calculation_method cases as needed.
 */
export function calculatePracticeUnitValue(
  practice: Practice,
  unitValues: UnitValue[]
): number {
  const method = (practice as any).calculation_method ?? 'unit_value';

  switch (method) {
    case 'fixed':
      // Valor fijo acordado (convenios, acuerdos especiales)
      return practice.fixed_value ?? 0;

    case 'unit_value':
      // Valor calculado: unidades NBU/Galeno × valor del punto
      const uv = unitValues.find(
        u => u.practice_type_id === practice.practice_type_id
      );
      return (practice.unit_quantity ?? 0) * (uv?.value ?? 0);

    case 'custom':
      // Placeholder extensible: lógica según practice.calculation_config
      // Ejemplo futuro: fórmulas especiales, precios de mercado, etc.
      const config = (practice as any).calculation_config ?? {};
      if (config.fixed_override) return config.fixed_override;
      return practice.fixed_value ?? 0;

    default:
      return practice.financial_value ?? 0;
  }
}

/**
 * Calculates total for an item in the practices table.
 */
export function calculatePracticeTotal(
  practice: Practice,
  quantity: number,
  unitValues: UnitValue[]
): { unitario: number; total: number } {
  const unitario = calculatePracticeUnitValue(practice, unitValues);
  return {
    unitario,
    total: unitario * quantity,
  };
}
```

---

## FASE 7 — Corrección automática a modo oración

**Archivo nuevo:** `src/lib/textUtils.ts`

```typescript
/**
 * Convierte texto a modo oración: primera letra mayúscula, resto minúscula.
 * Para descripciones de prácticas, diagnósticos, notas.
 */
export function toSentenceCase(text: string): string {
  if (!text) return '';
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Convierte texto a Título: cada palabra con primera mayúscula.
 * Para nombres de personas (afiliados, médicos, prestadores).
 */
export function toTitleCase(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}
```

### Dónde aplicar

| Campo | Función | Cuándo |
|---|---|---|
| Denominación de práctica N/N (ingreso libre) | `toSentenceCase` | `onBlur` |
| Descripción libre de material en reposición | `toSentenceCase` | `onBlur` |
| Diagnóstico (campo texto libre) | `toSentenceCase` | `onBlur` |
| Notas / observaciones | `toSentenceCase` | `onBlur` |
| Nombre de afiliado (display) | `toTitleCase` | Solo display |
| Nombre de médico (display) | `toTitleCase` | Solo display |
| Nombre de prestador (display) | `toTitleCase` | Solo display |

---

## FASE 8 — Rediseño sección "Solicita:" y tabla de prácticas

**Archivos:** `_components/PracticeSelector.tsx`, nuevo `_components/NomenclatorSearchModal.tsx`

### Abreviaturas de nomenclador (columna N.)

| practice_type_id | practice_types.code | Abreviatura a mostrar | Descripción |
|---|---|---|---|
| 1 | MED | `MED` | Prestaciones médicas |
| 2 | BIO | `BIO` | Bioquímicas |
| 3 | ODO | `ODO` | Odontológicas |
| 4 | FAR | `FAR` | Farmacia |
| NULL | — | `N/N` | No nomenclado (código: S/C) |

> ✅ Confirmado: abreviaturas simples y comprensibles para el usuario no técnico.

### Cambios en `PracticeSelector.tsx`

1. Cambiar label `"Prácticas *"` → `"Solicita:"`
2. Eliminar la lógica de colapso/expansión del buscador
3. Mostrar siempre el botón `"+ Agregar práctica"` que abre `<NomenclatorSearchModal>`
4. Reemplazar la tabla actual por la nueva (columnas abajo)

### Nueva tabla de prácticas

```
┌────┬────────┬──────────────────────────────┬──────┬──────────┬──────────┬──────┬──────────┬───┬────────┐
│ N. │ Código │ Denominación                 │ Cant │ Unitario │  Total   │ %COS │   COS    │ 🕐│   ×    │
├────┼────────┼──────────────────────────────┼──────┼──────────┼──────────┼──────┼──────────┼───┼────────┤
│BIO │  418   │ Glucosa 6-fosfato            │  1   │ 18.564   │ 18.564   │ 40% │  7.426   │ 0 │ Elim.  │
│BIO │   1    │ Acto bioquímico              │  1   │  4.284   │  4.284   │ 40% │  1.714   │ 4 │ Elim.  │
│N/N │  S/C   │ Material especial no nomen.  │  1   │    0     │    0*   │ 20% │    0*   │ - │ Elim.  │
└────┴────────┴──────────────────────────────┴──────┴──────────┴──────────┴──────┴──────────┴───┴────────┘
                                                               * Editable si N/N
```

**Detalle de columnas:**

| Col | Fuente | Ancho | Notas |
|-----|--------|-------|-------|
| N. | `practice_types.code` mapeado | 50px | MED / BIO / ODO / FAR / N/N |
| Código | `practice.code` | 80px | S/C si no nomenclado |
| Denominación | `practice.name` → `toSentenceCase` | flex | Editable si N/N |
| Cant. | input number (min=1) | 60px | default 1 |
| Unitario | `calculatePracticeUnitValue()` | 90px | Editable si N/N o method=custom |
| Total | `Cant × Unitario` | 90px | Calculado |
| %COS | `getCoseguroPercent()` | 60px | Del plan del afiliado |
| COS | `Total × (%COS / 100)` | 90px | Monto coseguro (= Sub-total original) |
| 🕐 | Badge numérico = suma Aut+Reint+Repo+Esp en el período | 44px | ÚNICO botón por fila. Muestra 0 si no hay. Click → ConsumptionHistoryModal |
| × | Botón eliminar fila | 36px | |

**Footer de la tabla:**

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [N prácticas]    Valor total de prácticas: $22.848,00    Total coseguro a pagar: $9.139,20  │
│                   ^ suma columna Total                    ^ suma columna COS (lo que abona el afiliado)  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

> **Nota importante:** Se muestran AMBAS cifras siempre:
> - **Valor total de prácticas**: suma real de todas las prácticas (para que el afiliado sepa el costo real de la cobertura que recibe).
> - **Total coseguro a pagar**: lo que efectivamente abona el afiliado. Es la cifra principal que ve el administrativo al autorizar.

### Componente `NomenclatorSearchModal.tsx` (nuevo)

```typescript
// Props:
interface NomenclatorSearchModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  onSelectPractice: (practice: Practice | CustomPractice) => void;
  jurisdictionId:  number;
  expedientType?:  ExpedientType;
}

// CustomPractice para N/N:
interface CustomPractice {
  isCustom: true;
  code: 'S/C';
  name: string;       // ingreso libre, toSentenceCase
  practice_type_id: null;
  unit_quantity: null;
  fixed_value: null;
  calculation_method: 'custom';
}
```

**Contenido del modal:**
- Input de búsqueda (código o descripción, debounce 300ms)
- Tabs filtro por tipo: Todos | MED | BIO | ODO | FAR
- Tabla de resultados paginada (20 por página)
- Columnas resultado: `N. | Código | Denominación | Unitario estimado`
- Botón "Agregar N/N (no nomenclado)" → mini-formulario con código libre y descripción libre
- Al seleccionar → llama `onSelectPractice` y cierra

---

## FASE 9 — Auto-clasificación del tipo de solicitud

**Archivo:** `src/app/audits/requests/new/page.tsx`

### Mapeo nomenclador → tipo

```typescript
const NOMENCLATOR_TO_EXPEDIENT: Record<number, ExpedientType> = {
  1: 'ambulatoria',   // MED → Ambulatoria
  2: 'bioquimica',    // BIO → Bioquímica
  3: 'odontologica',  // ODO → Odontológica
  4: 'elementos',     // FAR → Elementos (farmacia)
};

function inferExpedientType(items: PracticeItem[]): ExpedientType {
  if (items.length === 0) return 'ambulatoria'; // default
  
  const typeIds = [...new Set(
    items.map(i => i.practice.practice_type_id).filter(Boolean)
  )];
  
  if (typeIds.length === 0) return 'programas_especiales'; // todo N/N
  if (typeIds.length === 1) {
    return NOMENCLATOR_TO_EXPEDIENT[typeIds[0]] ?? 'programas_especiales';
  }
  
  // Mezcla de nomencladores → especiales + aviso
  return 'programas_especiales';
}
```

### En el UI

- El tipo de solicitud se muestra como **badge auto-calculado** (no selector manual para los tipos derivables)
- Si hay mezcla: badge naranja con ícono de advertencia + texto "Mezcla de nomencladores"
- Para tipos que NO se auto-detectan (`reintegros`, `reposiciones`, `subsidios`, `internacion`): mantener selector manual disponible con ícono de edición
- El badge muestra el tipo con su color correspondiente del array `EXPEDIENT_TYPES`

---

## FASE 10 — Modal de consumos previos (🕐)

**Archivo nuevo:** `_components/ConsumptionHistoryModal.tsx`

### Apertura

- Un único ícono de reloj `🕐` al final de cada fila de la tabla de prácticas
- El badge sobre el reloj muestra el **total de registros** (autorizaciones + reintegros + reposiciones) dentro del rango de fechas configurable
- Si el total es `0`: muestra `0` (no guión)
- Al hacer click: abre el modal

### Headers del modal

```
[Ícono reloj]  Consumos previos: "Acto bioquímico" (código 1)
Afiliado: NARDONE. ANGELA (Nº 01-016808)
Período: [Desde ____________] [Hasta ____________]   Rango: [Últimos 12 meses ▼]
```

### Tabs del modal

| Tab | Tabla fuente | Columnas |
|-----|-------------|----------|
| **Autorizaciones** | `expedients` (+ `expedient_practices`) | Fecha · Nº Expediente · Estado · Cant. · Unitario · Total · Prestador · Ver adjuntos |
| **Reintegros** | `reimbursements` | Fecha · Referencia · Estado · Monto solicitado · Monto aprobado · Método pago · Ver adjuntos |
| **Reposiciones** | `repositions` | Fecha · Estado · Cantidad · Valor · Prestador · Ver protocolo/certificado |

### Implementación de la query

```typescript
// Para autorizaciones:
const { data: auths } = await supabase
  .from('expedient_practices')   // tabla de relación practices ↔ expedients
  .select(`
    *,
    expedient:expedients(
      expedient_number, status, provider_name,
      created_at, documents:expedient_documents(*)
    )
  `)
  .eq('practice_id', practiceId)
  .eq('expedient.affiliate_id', affiliateId)
  .gte('expedient.created_at', fromDate)
  .lte('expedient.created_at', toDate);
```

### Rango configurable

```typescript
// Opciones predefinidas:
const RANGE_OPTIONS = [
  { label: 'Últimos 3 meses',  months: 3  },
  { label: 'Últimos 6 meses',  months: 6  },
  { label: 'Últimos 12 meses', months: 12 }, // DEFAULT
  { label: 'Últimos 24 meses', months: 24 },
  { label: 'Personalizado',    months: -1 },  // habilita date pickers
];
```

---

## FASE 12 — Vista historial completo del afiliado

**Archivo nuevo:** `_components/AffiliateFullHistoryModal.tsx`  
(También puede ser una ruta `/audits/affiliates/[id]/history`)

### Acceso

Botón en la sección del afiliado (una vez cargado): **"Ver historial completo"** → abre modal de pantalla completa.

### Filtros disponibles

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Historial de consumos: Nardone, Angela  ·  Nº 01-016808  ·  Plan 2      │
├──────────────────────────────────────────────────────────────────────────┤
│ Período: [Desde ____] [Hasta ____]   Rango: [Últimos 12 meses ▼]        │
│ Nomenclador: [Todos ▼]  Práctica: [Escribir código o nombre...]          │
│ Tipo: [Todos ▼]  Estado: [Todos ▼]                                       │
│ Monto: desde [$_____] hasta [$_____]                                     │
│                                         [Limpiar filtros]  [Aplicar]     │
└──────────────────────────────────────────────────────────────────────────┘
```

| Filtro | Opciones |
|--------|----------|
| Período | Rango de fechas con opciones predefinidas (3, 6, 12, 24 meses, personalizado) |
| Nomenclador | Todos · MED · BIO · ODO · FAR · N/N |
| Práctica | Búsqueda libre por código o nombre (debounce) |
| Tipo de consumo | Todos · Autorizaciones · Reintegros · Reposiciones · Especiales |
| Estado | Todos · Pendiente · Aprobado · Rechazado · Pagado · Anulado |
| Monto desde/hasta | Campos numéricos (aplica sobre el total de cada registro) |

### Tabla de resultados

```
┌──────┬────────┬──────────────────────────────┬──────┬─────────────┬──────────┬──────────┬──────┬──────────┐
│ Tipo │  N.   │ Práctica                     │ Fecha│  Referencia │  Estado  │  Valor   │ COS  │  Detalle │
├──────┼────────┼──────────────────────────────┼──────┼─────────────┼──────────┼──────────┼──────┼──────────┤
│ Aut  │  BIO  │ Acto bioquímico              │03/26 │ EXP-2026-001│ Aprobado │ $4.284   │ $1.714│   Ver   │
│ Rein │  MED  │ Consulta médica              │01/26 │ REIN-2026-05│ Pagado   │$12.000   │   -  │   Ver   │
└──────┴────────┴──────────────────────────────┴──────┴─────────────┴──────────┴──────────┴──────┴──────────┘
```

- **Paginación**: 25 registros por página
- **Exportar**: botón para descargar CSV o PDF del historial filtrado
- **Ordenamiento**: por cualquier columna (click en header)
- **Subtotales**: al pie de la tabla, suma de Valor y COS de los registros mostrados

### Implementación

```typescript
// Query unificada (usar Promise.all para consultas en paralelo):
const [auths, reimbursements, repos] = await Promise.all([
  supabase
    .from('expedient_practices')
    .select('*, expedient:expedients(*)')
    .eq('expedient.affiliate_id', affiliateId)
    .gte('expedient.created_at', fromDate)
    .lte('expedient.created_at', toDate),

  supabase
    .from('reimbursements')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .gte('request_date', fromDate)
    .lte('request_date', toDate),

  supabase
    .from('repositions')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .gte('request_date', fromDate)
    .lte('request_date', toDate),
]);

// Normalizar a formato común:
type HistoryRow = {
  type: 'auth' | 'reimbursement' | 'reposition' | 'special';
  practice_name: string;
  practice_code: string;
  nomenclator_abbr: string;
  date: string;
  reference: string;
  status: string;
  total_value: number;
  coseguro: number;
  source_id: string;
};

// Aplicar filtros adicionales client-side (monto, nomenclador, práctica)
// ya que algunos filtros combinados son difíciles de expresar en una sola
// query Supabase con múltiples tablas.
```

---

## FASE 13 — Actualización de tipos TypeScript

**Archivos:** `src/types/database.ts`, `src/types/supabase.ts`

### En `database.ts` — tipos nuevos

```typescript
// Agregar después de Reimbursement:
export type Reposition = {
  id: string;
  affiliate_id: string | null;
  family_member_relation: string | null;
  practice_id: number | null;
  material_code: string | null;
  material_description: string | null;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  surgical_protocol_url: string | null;
  implant_certificate_url: string | null;
  stickers_photo_url: string | null;
  procedure_date: string | null;
  facility_id: number | null;
  surgeon_name: string | null;
  diagnosis_code: string | null;
  diagnosis_name: string | null;
  status: 'pendiente' | 'en_revision' | 'aprobada' | 'rechazada' | 'pagada' | 'anulada';
  request_date: string;
  resolution_date: string | null;
  approved_amount: number | null;
  auditor_id: string | null;
  resolution_notes: string | null;
  expedient_id: string | null;
  jurisdiction_id: number;
  created_at: string;
  updated_at: string;
};

export type CoseguroRule = {
  id: number;
  description: string;
  plan_id: number | null;
  practice_type_id: number | null;
  practice_category: string | null;
  practice_code: string | null;
  special_condition: string | null;
  coseguro_percent: number;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  jurisdiction_id: number;
  created_at: string;
};
```

### En `database.ts` — tipo unificado para historial

```typescript
// Tipo normalizado para el historial completo del afiliado:
export type AffiliateHistoryRow = {
  type: 'auth' | 'reimbursement' | 'reposition' | 'special';
  practice_name: string;
  practice_code: string;
  nomenclator_abbr: 'MED' | 'BIO' | 'ODO' | 'FAR' | 'N/N';
  date: string;
  reference: string;
  status: string;
  total_value: number;
  coseguro: number;
  source_id: string;
  source_table: 'expedient_practices' | 'reimbursements' | 'repositions';
};
```

### En `supabase.ts`

Agregar las secciones `repositions` y `coseguro_rules` dentro de `Database['public']['Tables']` con sus tipos `Row`, `Insert`, `Update`.

---

## Orden de ejecución recomendado

```
1.  FASE 13 parcial  → Agregar nuevos tipos a database.ts (Reposition, CoseguroRule, AffiliateHistoryRow)
2.  FASE 3           → Agregar 'reposiciones' y 'subsidios' a ExpedientType
3.  FASE 4           → Crear migration repositions.sql y ejecutar en Supabase
4.  FASE 5           → Crear migration coseguro_rules.sql y ejecutar en Supabase
5.  FASE 6           → Crear migration ALTER TABLE practices + practiceValueService.ts
6.  FASE 7 (utils)   → Crear src/lib/textUtils.ts
7.  FASE 13 completo → Actualizar supabase.ts con tablas nuevas
8.  FASE 1           → Eliminar flujo IA del formulario (SIN borrar archivos de IA)
9.  FASE 2           → Autocompletado por número de afiliado
10. FASE 8           → NomenclatorSearchModal.tsx + rediseño PracticeSelector.tsx + footer doble
11. FASE 9           → Auto-clasificación tipo de solicitud
12. FASE 10          → ConsumptionHistoryModal.tsx (un 🕐 por fila, tab "Ver todos" + tabs individuales)
13. FASE 11          → AffiliateFullHistoryModal con filtros avanzados
14. Test + npm run build + git commit + git push
```

---

## Notas de diseño

### Práctica N/N (No nomenclada)
- La columna N. muestra `N/N`
- El código muestra `S/C` (sin código) — editable
- La denominación es libre — se aplica `toSentenceCase` en on blur
- El valor unitario es editable manualmente (method = `custom`)
- El % COS se toma del plan del afiliado (sin código que matchear regla específica)

### Mezcla de nomencladores
- Auto-clasificar como `programas_especiales`
- Mostrar badge de advertencia naranja: "⚠ Mezcla: MED + BIO → Especiales"
- El usuario puede anular manualmente si lo desea

### Subsidios
- Cuando el tipo es `subsidios`, agregar campo adicional en el formulario:
  - "Empresa/Convenio" (texto)
  - "CBU/Cuenta de pago" (texto)
  - "Motivo del subsidio" (textarea)
- Los registros van a la tabla `expedients` con `type = 'subsidios'`
- No requiere tabla separada en esta etapa

### Reposiciones
- Cuando el tipo es `reposiciones`, el formulario muestra sección adicional:
  - "Adjuntar Protocolo Quirúrgico" (file upload)
  - "Adjuntar Certificado de Implante" (file upload)
  - "Adjuntar foto Stickers originales" (file upload)
  - "Nombre del cirujano" (texto)
  - "Fecha del procedimiento" (DatePicker)
  - "Prestador/Sanatorio" (buscador)
- Al guardar: crea tanto un `expedient` como un registro en `repositions`

---

## Próxima etapa (fuera de scope de esta hoja de ruta)

La pantalla de **"Autoriza Co-Seguro (Ambulatorios)"** mostrada en el screenshot es el flujo de **autorización de solicitudes pendientes**. Requiere:

- Vista de lista de expedientes en estado `pendiente` / `en_revision`
- Detalle del expediente con la tabla de prácticas (mismas columnas que el formulario)
- Botón "Autorizar Co-Seguro" → marca el expediente como `resuelto` + genera número de autorización
- Botón "Anular" → cambia estado a `anulada`
- Filtros: Propios / Todos + toggles de envío de correo al autorizar
- Columnas adicionales en vista de lista: Nº Co-Seguro · Matrícula · Afiliado · Plan · Fecha · Total COS · Usuario

Esa etapa se diseñará por separado.
