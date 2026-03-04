# ESTADO ACTUAL DE LA APLICACIÓN — CPCE Salud
> Auditoría completa del código fuente  
> Fecha: Junio 2025  
> Commit base: `19ca8cc` (branch `master`)  
> Archivo generado automáticamente por análisis integral del repositorio

---

## ÍNDICE

1. [Visión general](#1-visión-general)
2. [Stack técnico](#2-stack-técnico)
3. [Estructura de archivos](#3-estructura-de-archivos)
4. [Base de datos — Schema y Migraciones](#4-base-de-datos--schema-y-migraciones)
5. [Tipos TypeScript](#5-tipos-typescript)
6. [Contextos globales](#6-contextos-globales)
7. [Servicios y lógica de negocio](#7-servicios-y-lógica-de-negocio)
8. [Hooks reactivos](#8-hooks-reactivos)
9. [Componentes React](#9-componentes-react)
10. [Páginas (rutas)](#10-páginas-rutas)
11. [Motor de IA integrado](#11-motor-de-ia-integrado)
12. [Problemas críticos conocidos](#12-problemas-críticos-conocidos)
13. [Guía de integración para nueva IA](#13-guía-de-integración-para-nueva-ia)

---

## Cambios implementados (marzo 2026)

### 1. Migración de índices trigrama para enfermedades
- Archivo: `supabase/migrations/021_diseases_search_index.sql`
- Índices GIN pg_trgm en `diseases.name`, `diseases.code` y combinado para búsquedas mixtas.
- Permite búsquedas instantáneas en CIE-10, CIE-11 y DSM-5 (46.000 registros).

### 2. Nueva pestaña "Patologías" en Buscador
- Ubicada en `/buscador` junto a las pestañas de prácticas.
- Búsqueda live por nombre/código en CIE-10, CIE-11 y DSM-5.
- Tarjetas con: código, nombre, clasificación, botón de detalle.
- Modal de detalle con toda la info relevante.
- Botón "Limpiar" en todas las pestañas para resetear resultados.

### 3. Fixes críticos
- **Logout:** ahora es instantáneo y nunca se congela. Limpia estado local y recarga con `window.location.replace('/welcome')`.
- **Chat canales:** dos inputs independientes, nunca se traslada texto entre canales.
- **DiseaseAutocomplete:** búsqueda optimizada, debounce reducido, prioriza coincidencias exactas de código.
- **Gemini:** prompt enriquecido, extrae todos los campos relevantes, diagnóstico se busca en la DB y no se copia directo del OCR.
- **handleAIParsed:** prioriza código CIE y términos alternativos para búsqueda, nota generada con toda la info extraída.

### 4. Commit y push
- Todos los cambios están en los commits `c63dc87` y `70744ed` en el repo principal.
- Requiere ejecutar la migración SQL en Supabase para máxima velocidad.

---

## 2026-03-04 — Cambios en Buscador

- El buscador ahora adapta el título y el ícono según la pestaña activa:
    - "Buscador de Prácticas" (ícono libro) o "Buscador de Patologías" (ícono estetoscopio)
- Eliminado el badge "Supabase" y el texto "ESC para limpiar"
- Todas las pestañas arrancan vacías: solo se muestra el header, las pestañas y la barra de búsqueda
- No se muestran resultados ni ítems hasta que el usuario escribe al menos 2 caracteres
- El botón "Limpiar búsqueda" es más visible (outline rojo, aparece siempre que hay texto)
- Al limpiar, todo vuelve al estado vacío (sin resultados ni ítems)
- Cambiar de pestaña limpia búsqueda y resultados de ambas
- ESC limpia búsqueda y resultados en ambas pestañas

---

## 1. Visión general

**CPCE Salud** es una aplicación web de gestión de auditorías médicas para el Consejo Profesional de Ciencias Económicas. Corre en producción en Vercel, conecta a Supabase (PostgreSQL + Auth + Storage + Realtime).

### Dominios de negocio
- **Afiliados**: padrón, grupo familiar, planes, categorías
- **Prácticas**: nomencladores internos (Galeno/NBU/UO/FAR/ESP) y externos (PAMI, OSDE, etc.)
- **Audit trail**: expedientes de auditoría con prácticas, resolución por semáforo, trazabilidad completa
- **Auditoría posterior**: cruce factura vs. autorizado, notas de débito
- **Alertas**: anomalías presupuestarias
- **Homologaciones**: equivalencias entre nomencladores externos e internos
- **Agenda**: calendario de eventos internos
- **Chat**: mensajería interna por canales y DM
- **Reportes**: dashboard con gráficos + exportación PDF/CSV

### Jurisdicciones
| ID | Nombre | Color primario |
|---|---|---|
| 1 | Cámara I — Santa Fe | Azul CPCE (`hsl(221.2 83.2% 53.3%)`) |
| 2 | Cámara II — Rosario | Esmeralda (`hsl(142.1 76.2% 36.3%)`) |

La jurisdicción activa se persiste en `localStorage` y se aplica como `data-theme` al `<html>`.

### Roles de usuario
| Rol | Nivel | Permisos clave |
|---|---|---|
| `superuser` | Máximo | Todo (bypass total). Puede cambiar jurisdicción. |
| `admin` | Alto | Todos los permisos igual que superuser |
| `supervisor` | Medio-alto | Auditorías, aprobaciones, backup, revenue.view |
| `auditor` | Medio | Auditorías, chat.direct_only, no gestión |
| `administrativo` | Bajo | Afiliados, agenda, chat.direct_only |
| `gerencia` | Lectura | stats.view, revenue.view, alerts.view |

---

## 2. Stack técnico

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16.1.6 | Framework full-stack (App Router) |
| React | 19.2.3 | UI — con React Compiler activado |
| TypeScript | ^5 | strict mode |
| Supabase JS | 2.95.3 | Base de datos + Auth + Storage + Realtime |
| @supabase/ssr | 0.8.0 | Auth en SSR / App Router |
| Tailwind CSS | v4 | Estilos (import de módulo, no config clásico) |
| lucide-react | 0.563.0 | Iconos |
| recharts | 3.7.0 | Gráficos del dashboard |
| papaparse | 5.5.3 | Importación CSV |
| pdfjs-dist | 5.4.624 | Lectura de PDF en cliente |
| tesseract.js | 7.0.0 | OCR en navegador |
| @google/generative-ai | 0.24.1 | Gemini API (análisis de documentos) |
| uuid | 13.0.0 | Generación de IDs |
| @radix-ui/react-tabs | 1.1.13 | Componente Tabs accesible |

### Patrón React Compiler
> **CRÍTICO**: el React Compiler está activo. Todo `setState` dentro de `useEffect` **debe** estar envuelto en `setTimeout`. Llamadas directas causarán violaciones del compilador.

```typescript
// ✅ Correcto
useEffect(() => {
  setTimeout(() => {
    setResults(data)
  }, 0)
}, [dep])

// ❌ Incorrecto — viola React Compiler
useEffect(() => {
  setResults(data) // directo → error
}, [dep])
```

### Patrón de acceso a Supabase
Los servicios usan un helper para evitar errores de TypeScript en tablas sin tipo:
```typescript
const db = (table: string): any => supabase.from(table as any)
```
Esto es un code smell intencional para las tablas aún no declaradas en `supabase.ts`.

---

## 3. Estructura de archivos

```
src/
├── app/                        # Rutas Next.js App Router
│   ├── page.tsx                → /            Dashboard principal
│   ├── layout.tsx              → Layout raíz
│   ├── globals.css             → Variables CSS + Tailwind v4
│   ├── login/page.tsx          → /login       Auth legacy
│   ├── welcome/page.tsx        → /welcome     Splash + AuthModal
│   ├── agenda/page.tsx         → /agenda      Calendario
│   ├── alerts/page.tsx         → /alerts      Alertas presupuestarias
│   ├── audits/
│   │   ├── page.tsx            → /audits      Lista auditorías legacy
│   │   ├── requests/
│   │   │   ├── page.tsx        → /audits/requests   Bandeja expedientes
│   │   │   └── new/page.tsx    → /audits/requests/new  CREACIÓN (2004 líneas)
│   │   ├── post/page.tsx       → /audits/post       Post-auditoría
│   │   └── reports/page.tsx    → /audits/reports    Dashboard estadísticas
│   ├── backup/page.tsx         → /backup
│   ├── buscador/page.tsx       → /buscador    Buscador de nomenclador
│   ├── calculator/page.tsx     → /calculator  Calculadora cobertura (legacy)
│   ├── chat/page.tsx           → /chat
│   ├── help/page.tsx           → /help
│   ├── history/page.tsx        → /history     Historial clínico afiliado
│   ├── matcher/page.tsx        → /matcher     Homologador
│   ├── modules/page.tsx        → /modules
│   ├── parametrizacion/page.tsx → /parametrizacion  Config avanzada
│   ├── patients/page.tsx       → /patients    Padrón afiliados
│   ├── pending/page.tsx        → /pending     Cola legacy
│   ├── practices/page.tsx      → /practices   Nomencladores internos
│   ├── protocols/page.tsx      → /protocols
│   ├── settings/
│   │   ├── page.tsx            → /settings
│   │   └── values/page.tsx     → /settings/values
│   └── users/page.tsx          → /users
│
├── components/
│   ├── auth/
│   │   ├── AuthModal.tsx           🔐 Login/forgot-password
│   │   ├── ProtectedRoute.tsx      🔐 HOC protección de rutas
│   │   ├── RequireRole.tsx         🔐 Visibilidad condicional por rol
│   │   └── SuperuserCredentialPanel.tsx  🔐 Gestión credenciales
│   ├── dashboard/
│   │   ├── Charts.tsx              📊 Gráficos demo (datos hardcodeados)
│   │   ├── KPICards.tsx            📊 KPIs del dashboard
│   │   └── ModuleGrid.tsx          📊 Grid de accesos módulos
│   ├── layout/
│   │   ├── Sidebar.tsx             🧭 Navegación lateral
│   │   ├── Header.tsx              🧭 Cabecera + logout
│   │   ├── MainLayout.tsx          🧭 Shell raíz
│   │   ├── CommandPalette.tsx      🧭 Cmd+K
│   │   └── JurisdictionToggle.tsx  🧭 Cámara I/II
│   ├── practices/
│   │   ├── DiseaseAutocomplete.tsx     🔍 CIE-10/CIE-11/DSM-5 [NUEVO]
│   │   ├── PracticeEditor.tsx          ✏️ CRUD práctica interna
│   │   ├── NomenclatorManager.tsx      ✏️ CRUD nomenclador externo
│   │   ├── Homologator.tsx             🔗 Homologación con sugerencias IA
│   │   ├── PracticeMapper.tsx          🔗 Mapeo rápido
│   │   ├── CsvImporter.tsx             📥 Importar CSV
│   │   └── PdfImporter.tsx             📥 Importar PDF con regex parser
│   ├── parametrizacion/
│   │   ├── AutorizacionesTab.tsx       ⚙️ Reglas auto-aprobación
│   │   ├── CoberturaTab.tsx            ⚙️ Sobreescrituras de cobertura
│   │   ├── ProgramasTab.tsx            ⚙️ Programas especiales
│   │   ├── SLATab.tsx                  ⚙️ Tiempos SLA
│   │   ├── TopesTab.tsx                ⚙️ Topes de consumo
│   │   └── ValoresTab.tsx              ⚙️ Valores monetarios
│   ├── AIUploadModal.tsx           🤖 Upload con Gemini 2.5 Flash
│   ├── OCRUpload.tsx               🤖 OCR con Tesseract.js
│   └── FamilyMemberSelector.tsx    👥 Grupo familiar
│
├── contexts/
│   ├── AuthContext.tsx          Auth + permisos global
│   └── (jurisdictionContext en lib/)
│
├── services/
│   ├── expedientService.ts     [928 lines] CRUD expedientes — núcleo principal
│   ├── rulesEngine.ts          [454 lines] Motor de reglas de auditoría
│   ├── reportService.ts        [602 lines] Métricas y exportación
│   ├── aiService.ts            [271 lines] IA local sin API (análisis clínico)
│   ├── auditService.ts         [219 lines] Sistema legacy (tabla audits)
│   ├── agendaService.ts        [207 lines] Eventos de calendario
│   ├── alertService.ts         [288 lines] Alertas en memoria
│   ├── alertService.supabase.ts [221 lines] Alertas en Supabase
│   ├── chatService.ts          [334 lines] Chat en memoria (legacy mock)
│   ├── chatService.supabase.ts [237 lines] Chat en Supabase (activo)
│   ├── homologationService.ts  [328 lines] CRUD homologaciones
│   ├── externalNomenclatorService.ts       CRUD nomencladores externos
│   ├── practiceService.ts      Búsqueda básica de prácticas
│   ├── practiceTypeService.ts  [263 lines] CRUD tipos + prácticas
│   ├── userService.ts          CRUD usuarios
│   ├── roleService.ts          Roles y permisos desde Supabase
│   ├── valuesService.ts        Valores de unidades (Galeno/NBU/UO)
│   └── api.ts                  DataService — cobertura engine
│
├── lib/
│   ├── supabase.ts             Cliente Supabase (con tipado Database)
│   ├── supabase/
│   │   ├── client.ts           Cliente browser (singleton, sin tipado)
│   │   └── server.ts           Cliente SSR (async cookies)
│   ├── jurisdictionContext.tsx  Contexto jurisdicción + dark mode
│   ├── coverageEngine.ts       Cálculo de cobertura (puro, sin Supabase)
│   ├── imageCompressor.ts      Compresión client-side con Canvas API
│   ├── reportPDF.ts            Reportes PDF vía HTML + window.print()
│   ├── auditPDF.ts             PDF auditoría legacy
│   ├── useAudits.ts            Hook reactivo auditorías legacy
│   ├── useAlerts.ts            Hook alertas con Realtime
│   ├── useSupabaseAlerts.ts    Hook alertas con estados y actions
│   └── useSupabaseChat.ts      Hook chat + Realtime
│
├── hooks/
│   ├── useRealtimeTable.ts     Hook genérico Realtime para cualquier tabla
│   ├── useSupabaseAffiliates.ts
│   ├── useSupabaseAgenda.ts    ⚠️ usa tabla `agenda_events` (vs `events`)
│   ├── useSupabaseAudits.ts
│   └── useSupabasePractices.ts
│
└── types/
    ├── auth.ts                 UserRole, AuthUser, Permission, ROLE_PERMISSIONS
    ├── database.ts             [1025 lines] Todos los tipos del dominio
    └── supabase.ts             Tipos generados Supabase (DESACTUALIZADO)
```

---

## 4. Base de datos — Schema y Migraciones

### Tablas principales (en orden de creación)

#### `jurisdictions`
id SERIAL PK | name VARCHAR(100) | theme_config JSONB | created_at TIMESTAMPTZ

#### `plans`
id SERIAL PK | name VARCHAR(100) | jurisdiction_id FK | coverage_percent INT (0-100) | waiting_period_months INT | created_at

#### `affiliates` — tabla expandida (mig. 007)
Columnas base: id UUID PK | affiliate_number VARCHAR(50) UNIQUE | full_name VARCHAR(200) | document_number VARCHAR(20) | birth_date DATE | gender ('M','F','X') | relationship | titular_id FK (auto-ref) | plan_id FK | special_conditions JSONB | start_date DATE | end_date DATE | status ('activo','suspendido','baja') | jurisdiction_id FK

Columnas añadidas por mig. 007: phone | email | address | city | postal_code | province | cuit | legacy_number | category_id FK→affiliate_categories | assigned_provider_id FK→providers | certificate_number | observations | copay_debt DECIMAL | quota_coefficient DECIMAL | agreement | frozen_quota BOOL | children_count INT | has_life_insurance BOOL | special_pharmacy BOOL | medical_exam_done BOOL

Índices: idx_affiliates_document, idx_affiliates_name, idx_affiliates_titular, idx_affiliates_legacy, idx_affiliates_cuit, idx_affiliates_email, idx_affiliates_category

#### `practice_types`
id SERIAL PK | code VARCHAR(10) UNIQUE | name VARCHAR(100) | description TEXT | unit_name VARCHAR(50) | created_at

Datos: MED (Galeno), BIO (NBU), ODO (UO), FAR (Medicamentos), ESP (Especiales)

#### `practices` — tabla ampliamente expandida
Columnas base: id BIGSERIAL PK | code VARCHAR(20) | name VARCHAR(300) | description TEXT | practice_type_id FK | unit_quantity DECIMAL | fixed_value DECIMAL | category VARCHAR(100) | requires_authorization BOOL | max_per_month INT | max_per_year INT | jurisdiction_id FK | is_active BOOL

Columnas de mig. 007: nomenclator_type | calculation_method (fijo/galenos/nbu/unidades_odontologicas/porcentaje) | nbu_value | valid_from/to | legacy_code | requires_prescription | drug_name | troquel | barcode | presentation | lab_name | is_vaccine | is_imported | default_provider_id FK | min_days_between | max_per_year_plan JSONB | federation_code | dss_code | ace_included

Columnas de mig. 009: normativa TEXT | coseguro VARCHAR(100)

Índices: idx_practices_code, idx_practices_name (GIN español), idx_practices_normativa_search (GIN full-text)

#### `users`
id UUID PK | email VARCHAR(255) UNIQUE | full_name VARCHAR(200) | role VARCHAR(20) CHECK('admin','supervisor','auditor','superuser','administrativo','gerencia') | jurisdiction_id FK | is_active BOOL | is_superuser BOOL (mig. 001) | last_login TIMESTAMPTZ  

Índice parcial: idx_users_superuser (WHERE is_superuser=TRUE)

#### `audits` — sistema legacy
id UUID PK | affiliate_id FK | practice_id FK | plan_id FK | jurisdiction_id FK | coverage_result JSONB | status CHECK('pending','approved','rejected','partial','requires_auth') | auditor_id FK | reviewer_id FK | authorization_code VARCHAR(50) | created_at | reviewed_at

#### `diseases` — tabla CIE-10/CIE-11/DSM-5
id SERIAL PK | code VARCHAR(20) UNIQUE | name VARCHAR(200) | level VARCHAR(20) | is_chronic BOOL | requires_authorization BOOL | classification VARCHAR(20) DEFAULT 'CIE-10' (mig. 017) | description TEXT (mig. 017)

Volumen: ~113 registros iniciales (mig. 013) + 35,000 CIE-11 (mig. 018) + ~10,600 CIE-10 (mig. 019) + 425 DSM-5 (mig. 020)

#### `providers`
id SERIAL PK | legacy_id | name VARCHAR(200) | cuit | enrollment | specialty | type CHECK('medico','odontologo','bioquimico','clinica','sanatorio','laboratorio','farmacia','otro') | address | city | phone | email | nomenclator_code | jurisdiction_id FK | is_active

#### `affiliate_categories`
id SERIAL PK | code VARCHAR(20) UNIQUE | name VARCHAR(100) | coefficient DECIMAL(6,4) | age_limit INT | monthly_extra DECIMAL | notes | jurisdiction_id FK | is_active

#### `authorizations` — 20+ columnas
Incluye: affiliate_id | plan_id | provider_id | requesting_doctor_id | authorization_number | type | disease_id | is_oncology BOOL | is_hospitalization BOOL | status CHECK('pendiente','aprobada','rechazada','anulada','vencida') | request_date | resolution_date | total_amount | balance | is_reimbursement BOOL | is_direct BOOL | is_provisional BOOL | legacy_number | jurisdiction_id

#### `invoices`
invoice_number | invoice_type | point_of_sale | cuit | period_month | period_year | subtotal | tax_amount | withholdings | discounts | total | balance | coseguro | status CHECK('pendiente','pagada','parcial','anulada','en_disputa') | payment_date

#### `expedients` — corazón del sistema nuevo (mig. 011)
id UUID PK | expedient_number VARCHAR(25) UNIQUE (auto: EXP-YYYY-NNNNN) | type CHECK(7 tipos) | priority CHECK('normal','urgente') | affiliate_id FK | affiliate_plan_id FK | family_member_relation | provider_id FK | requesting_doctor_id FK | status CHECK(8 estados) | requires_control_desk BOOL | control_desk_status | rules_result CHECK('verde','amarillo','rojo') | created_by FK | assigned_to FK | resolved_by FK | jurisdiction_id FK | diagnosis_code | diagnosis_description | disease_id FK (mig. 013)

Campos IA/SLA (mig. 010_etapa1): clinical_priority_score INT | ia_suggestions JSONB | sla_status TEXT | sla_hours_elapsed NUMERIC | last_activity_at TIMESTAMPTZ | duplicate_warning BOOL | duplicate_ids JSONB

Triggers: trg_expedient_number (genera número), trg_exp_updated (updated_at), trg_sync_expedient_status (calcula estado automáticamente)

#### `expedient_practices`
id UUID PK | expedient_id FK | practice_id FK | quantity INT | practice_value DECIMAL | status CHECK(7 estados) | authorization_code | coverage_percent | covered_amount | copay_amount | copay_percent | diagnosis_code | diagnosis_description | resolution_notes | resolved_by FK | resolved_at | review_date DATE | rule_result CHECK('verde','amarillo','rojo') | rule_messages JSONB | sort_order INT

#### `expedient_notes`
expedient_id FK | author_id FK | content TEXT | note_type CHECK('interna','para_afiliado','sistema','resolucion') | status_from | status_to | practice_id FK

#### `expedient_attachments`
expedient_id FK | file_name | file_type (MIME) | file_size INT | storage_path TEXT | document_type CHECK(8 tipos incl. 'historia_clinica') | uploaded_by FK

#### `expedient_log`
expedient_id FK | action VARCHAR(50) | details JSONB | practice_id FK | performed_by FK | performed_at TIMESTAMPTZ

#### `audit_rules_config`
jurisdiction_id FK | rule_type CHECK(6 tipos) | practice_type_id FK | practice_id FK | auto_approve BOOL | max_amount_auto | max_per_month | max_per_year | min_days_between | copay_percent | requires_control_desk BOOL | valid_from | valid_to | is_active BOOL | UNIQUE(jurisdiction_id, rule_type, practice_type_id, practice_id)

#### `post_audits` (mig. 012)
audit_number VARCHAR(25) UNIQUE (PA-YYYY-NNNNN) | invoice_id FK | provider_id FK | period_month/year | status CHECK(6 estados) | invoiced_total | authorized_total | difference | debit_total | approved_total | auto_check_result CHECK('ok','warning','error') | auto_check_messages JSONB

#### `debit_notes` (mig. 012)
debit_number UNIQUE (ND-YYYY-NNNNN) | post_audit_id FK | provider_id FK | total_amount | status CHECK(6 estados)

#### `debit_note_items`
debit_note_id FK | post_audit_item_id FK | practice_id FK | invoiced_amount | authorized_amount | debit_amount | reason | debit_type CHECK(6 tipos)

#### `homologations` (mig. 003)
internal_practice_id FK | external_nomenclator_id FK | external_code | external_description | ratio DECIMAL(10,4) DEFAULT 1.0 | mapping_type CHECK('manual','automatic','suggested') | confidence_score | UNIQUE(external_nomenclator_id, external_code)

#### `external_nomenclators` (mig. 002)
code VARCHAR(20) UNIQUE | name VARCHAR(100) | description TEXT | is_active BOOL

#### `external_practices` (mig. 002)
nomenclator_id FK | code VARCHAR(50) | description TEXT | value DECIMAL | internal_practice_id FK | match_confidence DECIMAL(5,2) | match_type CHECK('manual','automatic','suggestion') | UNIQUE(nomenclator_id, code)

#### `roles` + `permissions` + `role_permissions` + `user_roles` (mig. 006)
Sistema RBAC completo: roles con display_name | permissions con module+action | asignaciones M:N con timestamps

#### `events` (agenda)
title | start_datetime | end_datetime | all_day | type CHECK(5 tipos) | priority CHECK(3) | status CHECK(4) | attendees TEXT[] | reminder_minutes INT | reminder_sent BOOL

#### `conversations` + `conversation_members` + `messages` (chat)
conversations: type CHECK('direct','channel') | is_private BOOL  
messages: content TEXT | type CHECK('text','file','system') | reply_to_id FK | is_edited BOOL | is_deleted BOOL  
Realtime habilitado en: `messages`, `alerts`, `events`

#### Tablas de parametrización (mig. 016)
- `practice_limits`: topes por práctica/plan/edad/género/diagnóstico
- `auto_authorization_rules`: reglas semáforo verde
- `plan_coverage_overrides`: sobreescrituras cobertura por plan+práctica
- `special_programs`: Oncología, CUD, Maternidad, VIH, Diabetes
- `sla_config`: tiempos objetivo por tipo+prioridad (16 registros base)

#### Tablas legacy con datos históricos
- `audit_requests` (mig. 010): sistema intermedio (entre calculadora y expedientes)
- `hospitalizations`, `pharmacy_records`, `lab_orders`, `reimbursements`, `medical_records` (mig. 007)
- `protocols` (mig. 008): reglas/protocolos médicos con fallback estático
- `plan_revenue`, `announcements` (mig. 006)

### Migraciones en orden

| Archivo | Propósito |
|---|---|
| `001_add_roles.sql` | is_superuser a users, rol superuser, índice parcial |
| `002_external_nomenclators.sql` | external_nomenclators + external_practices |
| `003_homologations.sql` | tabla homologations |
| `004_remove_hardcoded_nomenclators.sql` | limpia datos ejemplo |
| `005_rls_policies.sql` | función user_jurisdiction_id() + RLS en tablas principales |
| `006_roles_permissions.sql` | RBAC completo: roles, permissions, user_roles, plan_revenue, announcements |
| `007_align_legacy_schema.sql` | providers, affiliate_categories, diseases, authorizations, invoices, hospitalizaciones, pharmacy, lab, reimbursements, medical_records; amplía affiliates y practices |
| `008_protocols_table.sql` | tabla protocols con RLS y 6 protocolos iniciales |
| `009_practice_normativa.sql` | columnas normativa + coseguro en practices; índice GIN |
| `010_audit_requests.sql` | tabla audit_requests (sistema intermedio) + notes/attachments/log |
| `010_etapa1_ia_sla_fields.sql` | ⚠️ DOBLE NÚMERO — campos IA/SLA para expedients y audit_requests |
| `011_expedients.sql` | tablas expedients, expedient_practices, notes, attachments, log, audit_rules_config |
| `012_post_audits.sql` | post_audits, post_audit_items, debit_notes, debit_note_items, post_audit_log |
| `013_cie10_diagnosis.sql` | diagnosis_code/description/disease_id en expedients + 113 diagnósticos frecuentes |
| `014_rls_audit_requests.sql` | RLS para tablas de audit_requests + Storage |
| `015_rls_security_fix.sql` | RLS authenticated en 33 tablas faltantes |
| `016_parametrizacion.sql` | practice_limits, auto_authorization_rules, plan_coverage_overrides, special_programs, sla_config |
| `017_disease_structure.sql` | classification + description en diseases |
| `018_cie11_import.sql` | 35,000+ diagnósticos CIE-11 en español |
| `019_cie10_import.sql` | ~10,600 diagnósticos CIE-10 en español |
| `020_dsm5_import.sql` | 425 diagnósticos DSM-5-TR (código: DSM5-XXXX) |

### Funciones SQL auxiliares
- `calculate_age(birth_date DATE) → INT`
- `get_current_unit_value(p_type_id, p_jurisdiction_id) → DECIMAL`
- `user_jurisdiction_id() → INTEGER` (STABLE SECURITY DEFINER, para RLS)
- `generate_request_number()` / `update_audit_request_timestamp()` — triggers
- `update_last_activity()` — trigger para SLA
- `update_updated_at()` — trigger genérico

---

## 5. Tipos TypeScript

### `src/types/auth.ts` — tipos de autenticación y permisos

```typescript
type UserRole = 'superuser' | 'admin' | 'supervisor' | 'auditor' | 'administrativo' | 'gerencia'

interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_superuser: boolean
  jurisdiction_id: number | null
  avatar_url?: string
  is_active: boolean
}

// 26 permisos granulares:
type Permission =
  | 'dashboard.view' | 'calculator.use'
  | 'nomenclators.view' | 'nomenclators.manage'
  | 'audits.view' | 'audits.create' | 'audits.approve'
  | 'alerts.view' | 'alerts.resolve'
  | 'chat.all_channels' | 'chat.direct_only'
  | 'agenda.view' | 'agenda.create'
  | 'patients.view' | 'patients.manage'
  | 'config.view' | 'config.values'
  | 'users.manage' | 'backup.export'
  | 'matcher.use' | 'pending.view' | 'protocols.view'
  | 'stats.view' | 'revenue.view' | 'revenue.manage'
```

Funciones exportadas: `hasPermission(role, permission)`, `userHasPermission(user | null, permission)`  
Constantes UI: `ROLE_LABELS` (español), `ROLE_COLORS` (clases Tailwind)

### `src/types/database.ts` — tipos del dominio (~1025 líneas)

Tipos principales declarados (con todos sus campos):
`Plan` | `PlanRules` | `Practice` | `Affiliate` | `Provider` | `AffiliateCategory` | `Disease` | `Authorization` | `Hospitalization` | `PharmacyRecord` | `Reimbursement` | `LabOrder` | `MedicalRecord` | `Invoice` | `InvoiceDetail` | `AuthorizationDetail` | `UserProfile` | `Role` | `DbPermission` | `UserRoleAssignment` | `PlanRevenue` | `Announcement`

Tipos del sistema de expedientes:
`ExpedientType` (7 valores) | `ExpedientStatus` (8 estados) | `PracticeResolutionStatus` (7 estados) | `RulesResult` ('verde'|'amarillo'|'rojo') | `ExpedientPriority` | `ExpedientDocumentType` | `ExpedientNoteType` | `Expedient` (35+ campos + joins) | `ExpedientPractice` (25+ campos) | `ExpedientNote` | `ExpedientAttachment` | `ExpedientLog` | `AuditRuleConfig`

Tipos post-auditoría:
`PostAuditStatus` | `PostAuditCheckResult` | `PostAuditItemMatchStatus` (9 estados) | `PostAuditItemAction` | `DebitNoteStatus` | `DebitType` | `PostAudit` | `PostAuditItem` | `DebitNote` | `DebitNoteItem`

Tipos legacy:
`AuditStatus` | `AuditRecord` | `AlertSeverity` | `AlertRule` | `Alert` | `AuditRequest` (con campos IA/SLA)

### `src/types/supabase.ts` — DESACTUALIZADO ⚠️

Este archivo fue generado automáticamente por Supabase CLI y **no cubre** las 35+ tablas creadas en migraciones 006–016. Solo tipifica: jurisdictions, plans, affiliates, practice_types, practices, users, audits, alerts, events, conversations, conversation_members, messages, audit_requests y sus tablas auxiliares.

**El campo `users.role` en este archivo solo lista `'admin'|'supervisor'|'auditor'` — omite `superuser`, `administrativo`, `gerencia`.**

---

## 6. Contextos globales

### `AuthContext` (`src/contexts/AuthContext.tsx`)

| Función/Hook | Descripción |
|---|---|
| `fetchUserProfile(authUser)` | Consulta `users` por email. Fallback DEV_AUTH_BYPASS |
| `initAuth()` | getSession() + carga perfil |
| `loadPermissions(profile)` | Superuser → todos. Otros → roleService + fallback local |
| `signIn(email, password)` | Wrapper `signInWithPassword` |
| `signOut()` | `scope: 'local'`, try/finally — siempre limpia estado |
| `hasPermission(perm)` | Superuser → true. Otros → busca en permissions[] |
| `useAuth()` | Hook: `{ user, loading, permissions, signIn, signOut, hasPermission }` |
| `usePermission(perm)` | Atajo para un permiso puntual |

Escucha `onAuthStateChange` para sincronización automática.  
Variable de entorno: `NEXT_PUBLIC_DEV_AUTH_BYPASS` para bypass en desarrollo.

### `JurisdictionContext` (`src/lib/jurisdictionContext.tsx`)

| Función/Hook | Descripción |
|---|---|
| `setJurisdiction(j)` | Cambia jurisdicción activa, persiste localStorage, aplica data-theme al html, simula loading 300ms |
| `toggleDarkMode()` | Alterna class `dark` en html, persiste |
| `useJurisdiction()` | `{ activeJurisdiction, setJurisdiction, isLoading, isDarkMode, toggleDarkMode }` |

Jurisdicciones hardcodeadas:
- `CAMERA_I`: id=1, "Cámara I - Santa Fe", azul/slate
- `CAMERA_II`: id=2, "Cámara II - Rosario", esmeralda/rojo

---

## 7. Servicios y lógica de negocio

### `expedientService.ts` — NÚCLEO (928 líneas)
Tablas: `expedients`, `expedient_practices`, `expedient_notes`, `expedient_attachments`, `expedient_log`, Storage `audit-attachments`

| Método clave | Descripción |
|---|---|
| `create(input)` | Inserta cabecera + N prácticas + log. Genera campos IA (score, sugerencias). |
| `fetchAll(filters?)` | Paginado con join affiliates. Hasta 100 items. |
| `fetchPending(jId, type?)` | Pendientes/en_revision, por prioridad y antigüedad. |
| `fetchById(id)` | Expediente + prácticas ordenadas. |
| `takeForReview(id, auditorId)` | Estado → en_revision, asigna auditor. |
| `authorizePractice(...)` | Genera código AMB-XXXXX, estado autorizada. |
| `authorizePartialPractice(...)` | Igual + adjusted_quantity. |
| `denyPractice(...)` | Estado denegada, motivo obligatorio. |
| `observePractice(...)` | Estado observada (falta documentación). |
| `deferPractice(...)` | Estado diferida con fecha de revisión futura. |
| `autoApprovePractices(expId, sysUserId)` | Auto-aprueba prácticas con rule_result='verde'. |
| `observe(id, ...)` | Observa expediente completo. |
| `resubmitObserved(id, ...)` | Reabre observada → pendiente. |
| `appeal(id, ...)` | En apelación. |
| `cancel(id, ...)` | Anula con motivo. |
| `approveControlDesk(id, ...)` | Mesa de control: aprueba. |
| `rejectControlDesk(id, ...)` | Mesa de control: rechaza → observada. |
| `addNote(data)` | Inserta nota en expedient_notes por canal. |
| `uploadAttachment(expId, file, ...)` | Sube a Storage + registra en expedient_attachments. |
| `fetchLog(expedientId)` | Trazabilidad completa (expedient_log). |
| `getCounts(jId)` | 8 consultas de conteo por estado. |
| `fetchAffiliateHistory(affiliateId)` | Historial del afiliado. Máx 200. |
| `fetchAffiliatePracticeUsage(...)` | Control frecuencia: suma qty autorizadas por afiliado+práctica+fecha. |

Helper privado: `generateAuthorizationCode(type)` → `AMB-xxxxxX-YYYY`

---

### `rulesEngine.ts` — Motor de reglas (454 líneas)
Tablas: `audit_rules_config`, `expedient_practices`, `audit_requests` (fallback), `expedients`

| Método | Descripción |
|---|---|
| `evaluate(input)` | Evaluación global: valida afiliado, carencia, luego evalúa cada práctica. |
| `evaluatePractice(...)` | **11 reglas** por práctica: jurisdicción, cobertura base, override coseguro, auth por categoría, regla config, tope auto-aprobación, frequencia mínima, tope mensual, tope anual, mesa de control, aviso coseguro. |
| `fetchRules(jId)` | Carga reglas activas no vencidas. |
| `getLastPracticeDate(...)` | Última fecha de autorización, con fallback a legacy. |
| `getPracticeUsageCount(...)` | Suma quantity autorizadas/pendientes desde fecha. |

Resultado por práctica: `{ can_auto_approve, result: 'verde'|'amarillo'|'rojo', messages[] }`  
`can_auto_approve` se desactiva ante cualquier alerta.  
Tipo `internacion` → siempre requiere mesa de control.

---

### `reportService.ts` — Métricas (602 líneas)
Tablas: `expedients`, `expedient_practices`, `post_audits`, `debit_notes`, `users`, `practices`, `providers`, `affiliates`

| Método | Descripción |
|---|---|
| `getDashboardMetrics(filters)` | Ejecuta 8 consultas en `Promise.all` |
| `getExpedientsByStatus(filters)` | Cuenta por estado |
| `getPracticesByResolution(filters)` | Cuenta prácticas por estado resolución |
| `getMonthlyTrends(filters)` | 12 buckets por mes del año |
| `getExpedientsByType(filters)` | Agrupamiento por tipo |
| `getAuditorProductivity(filters)` | Resueltos, autorizados, denegados, tiempo promedio por auditor |
| `getTopPractices(filters, limit?)` | Top N prácticas más solicitadas |
| `getPostAuditSummary(filters)` | Totales facturas/autorizados/débitos |
| `getExpedientsForExport(filters)` | Expedientes completos con todos los joins |
| `getAuthorizationsForExport(filters)` | Prácticas autorizadas para exportar |
| `getDebitsForExport(filters)` | Notas de débito con items |

---

### `aiService.ts` — IA local sin API (271 líneas)
Sin consultas a Supabase. Análisis puramente en memoria.

| Función | Descripción |
|---|---|
| `analyzeClinicalPriority(text, desc?, diag?)` | 50+ keywords de urgencia con score. `hasStarPriority = score >= 30`. Score clamped a 100. |
| `checkCoherence(practiceDesc, diagDesc, diagCode?)` | 5 reglas categorizadas (laboratorio, traumatología, cardiología, neurología, oncología). |
| `checkDuplicates(affiliateId, practiceId, expedients)` | Detecta solicitudes duplicadas recientes. |

Diccionario `URGENCY_KEYWORDS`: oncología (50 pts), emergencia cardio (40 pts), neuro (35 pts), perinatal (30 pts), etc.

---

### `agendaService.ts` — Eventos (207 líneas)
Tabla: `events`. Patrón: caché local + `useSyncExternalStore`.

Métodos: `init()` | `getAll(opts?)` | `getByMonth(y, m, jId?)` | `getUpcoming(jId?)` | `create(event)` | `update(id, data)` | `delete(id)` | `updateStatus(id, status)` | `getPendingReminders()` | `subscribe(listener)`

---

### `alertService.supabase.ts`
Tabla: `alerts`

Métodos: `getAll()` | `getByStatus(status)` | `getById(id)` | `create(input)` | `updateStatus(id, status)` | `delete(id)` | `getCounts()` | `subscribe(listener)`

---

### `chatService.supabase.ts` (activo)
Tablas: `users`, `conversations`, `messages`

Soporta DMs y canales, edición (is_edited=true), soft delete, Realtime.

---

### `homologationService.ts` (328 líneas)
Tablas: `homologations`, `practices`, `external_nomenclators`

| Método clave | Descripción |
|---|---|
| `getHomologationsByNomenclator(nomId, page, pageSize, search, filterType)` | Paginado con filtro tipo mapeo |
| `createHomologation(...)` | Crea mapeo manual con ratio y notas |
| `suggestHomologations(extCode, extDesc, nomId, limit?)` | **Fuzzy matching local**: ILIKE por código + keywords descripción. Score calculado en cliente. |
| `getStats(nomenclatorId)` | Contadores mapeadas/no mapeadas |

---

### `practiceTypeService.ts` (263 líneas)
Tablas: `practice_types`, `practices`

`getPracticeTypes()` | `getPracticeTypeStats(jId?)` | `getPracticesByType(typeId, page, pageSize, search, jId?)` | `getAllPractices(page, pageSize, search, jId?, typeId?)` | `createPractice(p)` | `updatePractice(id, p)` | `deletePractice(id)` | `togglePracticeStatus(id)`

---

### `userService.ts`
Tabla: `users`

`listAll()` | `getById(id)` | `create(data)` | `update(id, data)` | `deactivate(id)` | `activate(id)` | `delete(id)` (hard delete ⚠️) | `invite(email, data)` → **Placeholder — lanza Error sin implementar**

---

### `roleService.ts`
Tablas: `roles`, `user_roles`, `role_permissions`, `permissions`

`getRoles()` | `getUserRoles(userId)` | `assignRole(userId, roleId, ...)` | `removeRole(userId, roleId)` | `getPermissionsForRole(roleName)` | `getUserPermissions(userId, fallbackRole?)` — doble fallback a `ROLE_PERMISSIONS` local

---

### `valuesService.ts`
Tabla: `unit_values`

`getCurrentValues(jId)` | `getAllCurrentValues()` | `updateValues(jId, { medical, biochemical, dental })` — inserta nuevo registro histórico, no actualiza

---

### `auditService.ts` — LEGACY (219 líneas)
Tabla: `audits`. Patrón caché en memoria.

Sistema anterior al de expedientes. Persiste resultados de `coverageEngine` en JSONB desnormalizado. Las páginas `/calculator`, `/audits`, `/pending` usan este sistema.

---

### `coverageEngine.ts` — Motor puro sin Supabase
```typescript
calculateCoverage(affiliate, plan, practice) → CoverageResult
```
5 validaciones: estado afiliado, jurisdicción, carencia, cobertura (con override por categoría), autorización requerida.

---

### `api.ts` — DataService
Para el coverage engine: `searchPractices` | `getPracticesByJurisdiction` | `getAffiliateByDNI` | `getAffiliatesByJurisdiction` | `getPlan` | `getPlansByJurisdiction`

---

## 8. Hooks reactivos

| Hook | Tabla(s) | Realtime | Descripción |
|---|---|---|---|
| `useRealtimeTable<T>` | cualquiera | ✅ | Hook genérico reutilizable. Re-fetch completo en cada change event. |
| `useSupabaseAffiliates(jId?)` | `affiliates` | ✅ | |
| `useSupabaseAgenda(jId?)` | `agenda_events` ⚠️ | ✅ | Nombre diferente a la tabla real `events` |
| `useSupabaseAudits(jId?)` | `audits` | ✅ | |
| `useSupabasePractices(jId?)` | `practices` | ✅ | |
| `useAlerts(jId?)` | `alerts` | ✅ | Mapea tipos Supabase → tipos internos |
| `useActiveAlerts(jId?)` | `alerts` | ✅ | Solo activas |
| `useAlertCounts(jId?)` | `alerts` | ✅ | Contadores por severidad |
| `useSupabaseAlerts(jId?)` | `alerts` | ✅ | Con loading/error/actions |
| `useSupabaseAlertCounts(jId?)` | `alerts` | ✅ | |
| `useSupabaseChat()` | `users`, `conversations` | ✅ | currentUser = primer usuario (⚠️ hardcoded) |
| `useSupabaseMessages(convId)` | `messages` | ✅ | |
| `useAudits(jId?)` | `audits` | No | Legacy, useSyncExternalStore |
| `useAuditCounts(jId?)` | `audits` | No | Contadores legacy |

---

## 9. Componentes React

### `src/components/auth/`

#### `AuthModal.tsx`
Login + forgot-password. Supabase Auth API. Soporta "recordarme" (`useRememberedCredentials`).

#### `ProtectedRoute.tsx`
HOC que redirige a `/login` si no autenticado, a `/login?error=inactive` si inactive, a `/unauthorized` si sin permisos. Exporta también `RequirePermission` para visibilidad inline.

#### `RequireRole.tsx`
Visibilidad condicional por rol o permiso. Lógica OR. Superuser siempre ve.

#### `SuperuserCredentialPanel.tsx`
Solo para admin/superuser. Lista usuarios, permite:
- Enviar email de recovery (`supabase.auth.admin.generateLink`)
- Activar/desactivar usuario
- Invalidar sesiones activas

---

### `src/components/layout/`

#### `MainLayout.tsx`
Shell raíz. Protege rutas privadas. Redirige a `/welcome` si no auth. Monta `CommandPalette` global.

#### `Sidebar.tsx`
Navegación lateral colapsable por secciones. Filtra items por permisos. Colores dinámicos por jurisdicción y dark mode.

#### `Header.tsx`
Cabecera fija. Breadcrumb estático. Badge alertas activas. Avatar → `/settings`.  
**Logout**: `await signOut()` → `router.push('/welcome')` — fix definitivo del bug de logout.

#### `CommandPalette.tsx`
Ctrl+K. 19 comandos filtrados por permisos. Búsqueda fuzzy normalizada. Navegación teclado.

#### `JurisdictionToggle.tsx`
Toggle Cámara I (azul) / Cámara II (verde). Solo visible a superuser y gerencia.

---

### `src/components/dashboard/`

#### `KPICards.tsx`
8 KPIs base + 3 financieros (si `showRevenue`). Skeleton de carga. Colores semafóricos.

#### `ModuleGrid.tsx`
14 módulos como links, filtrados por permisos.

#### `Charts.tsx`
⚠️ Datos **hardcodeados** (demo). Sin conexión real. Candidato a reemplazar con `reportService`.

---

### `src/components/practices/`

#### `DiseaseAutocomplete.tsx` [NUEVO — commit 19ca8cc]
Props: `value`, `code`, `onSelect`, `onClear`, `initialSearch`, `label`, `placeholder`, `disabled`

Funcionalidades:
- Búsqueda en tabla `diseases`: `or(name.ilike, code.ilike)`, limit 15
- Debounce: fast-clear 10ms si < 2 chars, API call 300ms
- Navegación teclado (↑↓ Enter Escape)
- Scroll automático al ítem resaltado
- Icono 🔒 si `requires_authorization = true`
- Muestra clasificación (CIE-10 / CIE-11 / DSM-5) en cada resultado
- Footer: conteo + "Refiná la búsqueda" si 15 resultados (límite)
- `initialSearch` prop → auto-trigger para pre-llenado desde IA
- React Compiler compliant: dos timers separados

#### `Homologator.tsx`
Dos columnas: prácticas sin homologar / búsqueda interna. Auto-dispara `suggestHomologations` al seleccionar práctica externa. Muestra score de similitud. Confirmación en dialog.

#### `PracticeEditor.tsx`
CRUD práctica interna. Formulario completo. Valida jurisdicción activa.

#### `CsvImporter.tsx`
Papaparse, lotes de 100, bulkUpsert. Acepta columnas: code/codigo, description/descripcion, value/valor, unit/unidad.

#### `PdfImporter.tsx`
pdfjs-dist, 3 regexes de parseo + fallback heurístico. Preview antes de confirmar. Descarga parseo como CSV.

---

### `src/components/` (raíz)

#### `AIUploadModal.tsx` — Gemini 2.5 Flash
Props: `onDataParsed(data: AIParsedData, file: File)`  
Comprime imagen → POST a `/api/ai/parse-document` → extrae `{ affiliate, doctor, practices[], diagnosis }`.  
Requiere `GEMINI_API_KEY` en entorno.

#### `OCRUpload.tsx` — Tesseract.js (local)
Props: `onResult(OCRResult)`, `onFileReady(file)`, `onError?(msg)`, `disabled`, `label`  
Máquina de estados: `idle | compressing | scanning | success | low_confidence | error`  
Umbral confianza: ≥60% = éxito. <60% = pide corrección manual.  
`capture="environment"` para cámara en móvil.

#### `FamilyMemberSelector.tsx`
Busca familiares por `certificate_number` o `titular_id`. Muestra edad, relación en español, badge inactivo.

---

### `src/components/parametrizacion/`

| Componente | Tabla Supabase | Descripción |
|---|---|---|
| `AutorizacionesTab.tsx` | `auto_authorization_rules` | CRUD reglas auto-aprobación |
| `CoberturaTab.tsx` | `plan_coverage_overrides` | Sobreescrituras cobertura por plan+práctica |
| `ProgramasTab.tsx` | `special_programs` | Oncología, CUD, Maternidad, etc. |
| `SLATab.tsx` | `sla_config` | SLA por tipo×prioridad, edición in-place |
| `TopesTab.tsx` | `practice_limits` | Topes de consumo, validaciones de edad/género |
| `ValoresTab.tsx` | `unit_values` | Valores Galeno/NBU/UO por cámara |

---

### `src/components/ui/`
Componentes shadcn/ui: `Alert`, `Badge`, `Button`, `Card` (+CardContent/Header/Title/Description/Footer), `Dialog`, `DropdownMenu`, `Input`, `Label`, `Pagination`, `Select`, `Table`, `Tabs`, `Textarea`, `PlaceholderPage`

---

## 10. Páginas (rutas)

### Dashboard — `/`
- `useDashboardStats`, `useAudits`, `useActiveAlerts` — datos via hooks
- Saludo personalizado por hora del día
- KPIs, últimas 5 auditorías, últimas 3 alertas
- Permisos condicionales para secciones de alertas y revenue

---

### Welcome — `/welcome`
- Splash animado 2.5s → `AuthModal`
- Redirige a `/` si ya autenticado

---

### Agenda — `/agenda`
- Calendario mensual, grid 7×6
- `AgendaService` con `useSyncExternalStore`
- CRUD eventos: `tipo` / `prioridad` / `participantes` / recordatorios configurables
- Panel "Próximos 7 días"

---

### Alertas — `/alerts`
- `useSupabaseAlerts`, `useSupabaseAlertCounts`
- 4 contadores clicables como filtros toggle
- Actualización de estado: activa → descartada / resuelta

---

### Expedientes — `/audits/requests` (1.649 líneas)
Layout split lista/detalle. Módulo más complejo junto al de creación.

Estados del expediente: `borrador` → `pendiente` → `en_revision` → (`resuelto` | `parcialmente_resuelto` | `observada` | `en_apelacion` | `anulada`)

4 tabs en detalle: Prácticas | Adjuntos | Comunicación (dual: interna/para_afiliado) | Timeline

Acciones de resolución por práctica: Autorizar | Parcial (con qty ajustada) | Denegar | Observar | Diferir

Integración IA local: `computeSLA`, `handlePolishText` (reescritura), `handleGenerateSummary`

---

### Nueva Solicitud — `/audits/requests/new` (2.004 líneas — el archivo más grande)
Flujo completo de creación de expediente con:
- Búsqueda debounce de afiliado (name/DNI/número)
- Resolución del plan del afiliado
- `FamilyMemberSelector` — beneficiario grupo familiar
- Panel de consumos históricos filtrable
- Linterna Auditor (adjuntos de expedientes anteriores)
- Búsqueda de prácticas múltiples con cantidad
- Motor de reglas con semáforo por práctica y global
- `DiseaseAutocomplete` — CIE-10/CIE-11/DSM-5
- `AIUploadModal` → Gemini extrae datos del documento
- `OCRUpload` → Tesseract.js lee texto de la orden
- `analyzeClinicalPriority` + `checkCoherence` automáticos
- Adjuntos con compresión de imágenes
- Canal de nota: interna / para afiliado
- Preview antes de enviar
- `ExpedientService.create` con prácticas + adjuntos + nota inicial

---

### Post-auditoría — `/audits/post` (905 líneas)
Cruza factura vs. autorizado. Detecta inconsistencias. Genera notas de débito.
3 tabs: Ítems | Débitos | Timeline. Cruce automático server-side.

---

### Dashboard Reportes — `/audits/reports` (860 líneas)
KPIs + gráficos recharts (torta×2, barras, área).
Tab Exportar → PDF (expedientes/autorizaciones/débitos) + CSV.
Filtros: año, rango fechas.

---

### Backup — `/backup`
Exporta/importa JSON de tablas principales.
⚠️ **Sin guard de permisos** — cualquier usuario autenticado puede usar.

---

### Calculadora — `/calculator`
Sistema **legacy**. Usa `coverageEngine` + guarda en tabla `audits`. Carga todos los afiliados/prácticas en memoria. Reemplazado por el sistema de expedientes.

---

### Chat — `/chat`
`useSupabaseChat` + `useSupabaseMessages`. DMs y canales. Scroll automático al fondo. Creación de DM al hacer clic en usuario.

---

### Historial — `/history` (829 líneas)
Historial clínico completo de un afiliado. Join manual de 4 tablas (expedients + expedient_practices + practices + users). Vista Detalle y Vista Resumen. Exportar CSV. Linterna Auditor de adjuntos.

---

### Homologador — `/matcher`
Grid de nomencladores externos con barra de progreso de homologación.
Navega a `/practices/external/{id}/homologate`.

---

### Buscador — `/buscador` (675 líneas)
Búsqueda en nomenclador por tipo, código y descripción. Modal detalle con normativa editable. Parser `parseNormativa` + `formatNormativa`. Copiar al portapapeles.
⚠️ Sin permisos para editar normativa — cualquier usuario puede modificar.

---

### Afiliados — `/patients`
CRUD completo del padrón. Búsqueda + paginación. Formulario inline.
⚠️ `setPage(1)` dentro de `useMemo` — side effect en render (anti-patrón).

---

### Nomencladores — `/practices`
Tabs por tipo (MED/BIO/ODO/FAR/ESP). Búsqueda + paginación de 50. Editor con `PracticeEditor`.

---

### Protocolos — `/protocols`
CRUD desde tabla `protocols` con fallback a 6 protocolos estáticos.
⚠️ `canManage` usa `protocols.view` en lugar de un permiso de escritura.

---

### Usuarios — `/users`
Guard fuerte: `users.manage`. CRUD completo. Activar/desactivar. `userService.invite` es un placeholder sin implementar.

---

### Parametrización — `/parametrizacion`
Guard: `config.values`. Shell de 6 sub-componentes. Solo administradores.

---

### Settings Values — `/settings/values`
Guard: `config.view`. Actualiza valores Galeno/NBU/UO por jurisdicción.

---

### Pendientes — `/pending`
Cola legacy de `audits` (no expedientes). Aprobar/rechazar inline.
⚠️ Sin guard de permisos.

---

## 11. Motor de IA integrado

### IA local (sin API externa)

| Componente | Descripción |
|---|---|
| `aiService.analyzeClinicalPriority` | 50+ keywords con score ponderado. Urgencia: oncología=50pts, cardio=40pts, neuro=35pts. `hasStarPriority = score ≥ 30`. |
| `aiService.checkCoherence` | 5 reglas práctica↔diagnóstico: lab, trauma, cardio, neuro, oncología. |
| `aiService.checkDuplicates` | Detecta solicitudes duplicadas recientes. |
| `homologationService.suggestHomologations` | Fuzzy matching: ILIKE por código + keywords descripción >3 letras. Score en cliente. |
| `normativaParser` (en buscador) | Parsea y reformatea texto de normativa médica (3 regexes + heurísticos). |
| `coverageEngine.calculateCoverage` | Determinístico: 5 validaciones médico-administrativas. |
| `rulesEngine.evaluate` | 11 validaciones por práctica contra reglas configuradas en BD. |

### IA con API externa

| Integración | Descripción |
|---|---|
| **Gemini 2.5 Flash** (`AIUploadModal.tsx`) | `POST /api/ai/parse-document`. Extrae de imágenes/PDFs: afiliado, médico, prácticas, diagnóstico. Requiere `GEMINI_API_KEY`. |
| **Tesseract.js** (`OCRUpload.tsx`) | OCR local en navegador. Idioma español. Umbral confianza 60%. Sin API externa. |

### Flujo IA en nueva solicitud
1. Usuario sube imagen de orden médica
2. If Gemini → extrae `{ affiliate, doctor, practices[], diagnosis }`  
   If OCR → extrae texto libre del documento  
3. `handleAIParsed(data)` → rellena `diagInitialSearch` (→ `DiseaseAutocomplete` auto-busca) + pre-llena prácticas
4. `useEffect` automático → `analyzeClinicalPriority(notes + practices + diagnosis)`
5. `useEffect` automático → `checkCoherence(practice, diagnosis)`
6. Al agregar prácticas → `RulesEngine.evaluate(affiliate, plan, practices)` → semáforos
7. Submit → `ExpedientService.create` con todos los datos IA incluidos

---

## 12. Problemas críticos conocidos

### Seguridad
| # | Problema | Ruta | Severidad |
|---|---|---|---|
| 1 | Sin guard de permisos — cualquier usuario puede exportar/importar TODA la BD | `/backup` | 🔴 Crítico |
| 2 | Sin guard de permisos — cualquier usuario puede aprobar/rechazar auditorías | `/pending` | 🔴 Crítico |
| 3 | `canManage` usa `protocols.view` — cualquier lector puede crear/editar/borrar protocolos | `/protocols` | 🔴 Alto |
| 4 | Edición de normativa de prácticas sin control de permisos | `/buscador` | 🟡 Medio |
| 5 | Registro público de cuentas sin restricción de dominio | `/login` | 🟡 Medio |

### Calidad de código
| # | Problema | Ubicación |
|---|---|---|
| 6 | Archivo de 2004 líneas con `const db = (t) => supabase.from(t as any)` masivo | `requests/new/page.tsx` |
| 7 | `setPage(1)` dentro de `useMemo` — side effect en render | `patients/page.tsx` |
| 8 | `require('@/services/slaService')` dinámico en render (patrón inusual) | `audits/requests/page.tsx` |
| 9 | Errores silenciados en todos los `catch` | requests, post-audit |
| 10 | Join manual de 4 tablas en lugar de vistas o RPCs | `history/page.tsx` |
| 11 | Carga total de afiliados/prácticas en memoria sin límite | `calculator/page.tsx` |

### Inconsistencias de datos/tipos
| # | Problema |
|---|---|
| 12 | `supabase.ts` desactualizado: no refleja 35+ tablas de migraciones 006–016 |
| 13 | `users.role` en supabase.ts solo lista 3 valores — omite 3 roles actuales |
| 14 | Dos migraciones con número `010` (`audit_requests` y `etapa1_ia_sla_fields`) |
| 15 | `useSupabaseAgenda` usa tabla `agenda_events` vs `AgendaService` que usa `events` |
| 16 | `Disease` en database.ts no tiene `classification` ni `description` (mig. 017) |
| 17 | `AlertSeverity` diverge: supabase.ts = 'low'|'medium'|'high'|'critical' vs database.ts = 'info'|'warning'|'critical' |
| 18 | `Charts.tsx` usa datos hardcodeados — no conecta con reportService |
| 19 | `chatService.ts` (mock) coexiste activo con `chatService.supabase.ts` — ambos importados en diferentes páginas |
| 20 | `getCounts()` en ExpedientService hace 8 consultas secuenciales (no en paralelo) |

---

## 13. Guía de integración para nueva IA

### Entender el flujo principal

```
Afiliado solicita práctica médica
  ↓
Administrativo crea expediente EN /audits/requests/new
  - Busca afiliado → plan
  - Selecciona prácticas
  - Motor de reglas (11 rules) → semáforo
  - Diagnóstico CIE-10/11/DSM-5
  - Adjuntos / OCR / Gemini
  ↓
Expediente en estado "pendiente" en BD
  ↓
Auditor toma el expediente EN /audits/requests
  - Tab Prácticas: autorizar / parcial / denegar / observar / diferir
  - Tab Comunicación: notas internas y para afiliado
  - Tab Timeline: log completo
  ↓
ExpedientService.checkExpedientCompletion() calcula estado:
  - Todas autorizadas → resuelto
  - Alguna denegada/observada → parcialmente_resuelto / observada
  ↓
Supervisor puede revisar / reasignar / apelar
  ↓
Post-auditoría: cruce factura vs. autorizado → nota de débito
```

### Patrón de acceso a datos

```typescript
// Cliente Supabase — SIEMPRE usar este import en servicios:
import { getSupabaseClient } from '@/lib/supabase/client'
const supabase = getSupabaseClient()

// Para tablas con tipos: usar supabase directamente
const { data } = await supabase.from('affiliates').select('*')

// Para tablas sin tipos en supabase.ts (casi todas las de migraciones):
const db = (table: string): any => supabase.from(table as any)
const { data } = await db('expedients').select('*')
```

### Cómo agregar una nueva funcionalidad

1. **Crear/modificar tablas**: añadir nueva migración en `supabase/migrations/`
2. **Agregar tipos** en `src/types/database.ts`
3. **Crear servicio** en `src/services/` (patrón: cliente singleton, async/await, try/catch con re-throw)
4. **Crear hook** en `src/hooks/` si necesita Realtime (extender `useRealtimeTable<T>`)
5. **Componente** en categoría adecuada de `src/components/`
6. **Página** en `src/app/[ruta]/page.tsx` con `'use client'`
7. **Permisos**: agregar en `ROLE_PERMISSIONS` de `src/types/auth.ts` y en guard de la página

### Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_DEV_AUTH_BYPASS=false    # true solo en dev local
GEMINI_API_KEY=...                   # Para AIUploadModal
```

### Convenciones de nombres

- Expedientes: `EXP-YYYY-NNNNN`
- Solicitudes legacy: `AMB/BIO/INT-YYYY-NNNNN`
- Autorizaciones: `AMB-xxxxxX-YYYY`
- Post-auditorías: `PA-YYYY-NNNNN`
- Notas de débito: `ND-YYYY-NNNNN`

### Reglas del React Compiler

```typescript
// Todo setState en useEffect debe ir en setTimeout
useEffect(() => {
  fetchData().then(data => {
    setTimeout(() => {
      setItems(data)      // ✅
    }, 0)
  })
}, [dep])

// Para fast-clear (< 2 chars) usar 10ms
// Para debounce de API usar 300ms
// Nunca llamar setState directo en useEffect
```

### Módulos legados vs. actuales

| Legacy (no usar para nuevas features) | Actual |
|---|---|
| `auditService.ts` + tabla `audits` | `expedientService.ts` + tabla `expedients` |
| `alertService.ts` (en memoria) | `alertService.supabase.ts` |
| `chatService.ts` (mock) | `chatService.supabase.ts` |
| `/calculator` y `/pending` | `/audits/requests` y `/audits/requests/new` |
| `audit_requests` (tabla mig. 010) | `expedients` (tabla mig. 011) |

---

*Fin del documento. Total de módulos auditados: 26 páginas, 42 componentes, 18 servicios, 10 hooks, 20 migraciones SQL.*
