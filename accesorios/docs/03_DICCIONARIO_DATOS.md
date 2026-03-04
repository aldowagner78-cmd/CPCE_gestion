# 3. DICCIONARIO DE DATOS — Estructura de Importación "Plug & Play"

> Guía técnica para transformar datos reales al formato requerido por la Suite CPCE Salud.

---

## 3.1 Arquitectura de Datos

La aplicación requiere **4 tablas principales** que se relacionan de la siguiente manera:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ JURISDICTIONS│     │    PLANS     │     │  PRACTICES   │
│              │◄────│              │     │              │
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ name         │     │ jurisdiction │     │ jurisdiction │
│ theme_config │     │   _id (FK)   │     │   _id (FK)   │
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │              ┌─────┘
       │              │
┌──────┴───────────────┴──┐
│       AFFILIATES        │
│                         │
│ id (PK)                 │
│ jurisdiction_id (FK)    │
│ plan_id (FK)            │
└─────────────────────────┘
```

---

## 3.2 Tabla: JURISDICCIONES (jurisdictions)

> **Nota:** Esta tabla es estática y ya está definida en la app. No necesita importación a menos que se agreguen nuevas jurisdicciones.

| Columna | Tipo | Requerido | Descripción | Ejemplo |
|---------|------|-----------|-------------|---------|
| `id` | INTEGER | ✅ PK | Identificador único | `1` |
| `name` | VARCHAR(100) | ✅ | Nombre de la jurisdicción | `Cámara I - Santa Fe` |
| `theme_config` | JSONB | ✅ | Configuración visual | `{"primaryColor":"blue","secondaryColor":"slate"}` |
| `created_at` | TIMESTAMP | ✅ | Fecha de creación | `2026-01-01T00:00:00.000Z` |

**Valores predefinidos:**

| id | name | primaryColor |
|----|------|-------------|
| 1 | Cámara I - Santa Fe | blue |
| 2 | Cámara II - Rosario | emerald |

---

### 3. Tabla `affiliates` (Padrón de Afiliados)

Almacena los datos de los beneficiarios. Soporta grupos familiares y condiciones especiales.

| Columna | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `id` | UUID / INT | Identificador único del sistema. | `1` |
| `affiliate_number` | STRING | Número de credencial / afiliado (puede compartirse en grupo familiar). | `"1234"` |
| `full_name` | STRING | Apellido y Nombre completo. | `"Gomez, Maria"` |
| `document_number` | STRING | DNI del beneficiario (sin puntos). | `"30123456"` |
| `birth_date` | DATE | Fecha de nacimiento (para cálculo de edad). | `"1985-05-20"` |
| `gender` | STRING | Género (M/F/X). Importante para validaciones (ej. Plan Materno). | `"F"` |
| `relationship` | STRING | Vínculo con el titular. | `'Titular'`, `'Cónyuge'`, `'Hijo'`, `'Padre'` |
| `titular_id` | UUID / INT | ID del titular (si es adherente). NULL si es titular. | `NULL` (si es titular) |
| `plan_id` | INT | ID del plan de cobertura. | `101` |
| `special_conditions` | JSONB / ARRAY | Etiquetas de cobertura especial y vencimientos. | `["discapacidad", "diabetes"]` o `{"materno": "2024-12-31"}` |
| `jurisdiction_id` | INT | Jurisdicción (1=Sta Fe, 2=Rosario). | `1` |
| `status` | STRING | Estado de afiliación. | `'active'`, `'inactive'`, `'suspended'` |

> **Nota sobre Edad:** La edad no se guarda, se calcula dinámicamente: `Fecha Actual - birth_date`.

> **Nota sobre Grupo Familiar:**
> - El **Titular** tiene `titular_id = NULL`.
> - Los **Adherentes** tienen `titular_id = ID_DEL_TITULAR`.
> - Esto permite agruparlos visualmente y aplicar reglas de "Aportes" si fuera necesario.

---

### 4. Tabla `plans` (Planes de Cobertura)

Define las reglas generales de cobertura para un grupo de afiliados.

| Columna | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `id` | INT | Identificador del plan. | `101` |
| `name` | STRING | Nombre comercial del plan. | `"Plan General"`, `"Plan Joven"`, `"PMO"` |
| `jurisdiction_id` | INT | Jurisdicción. | `1` |
| `is_special` | BOOLEAN | Si es un plan especial (ej. PMO puro). | `false` |
| `coverage_percent` | INTEGER | Porcentaje base de cobertura | `80` |
| `waiting_period_months` | INTEGER | Meses de carencia requeridos | `6` |
| `created_at` | DATETIME | Fecha de creación. | `"2024-01-01 10:00:00"` |

### Ejemplo CSV: `plans.csv`

```csv
id,name,jurisdiction_id,coverage_percent,waiting_period_months,created_at
101,Plan General,1,100,0,2026-01-01
102,Plan Básico,1,80,6,2026-01-01
103,Plan Premium,1,100,3,2026-01-01
201,Plan Integral,2,100,0,2026-01-01
202,Plan Joven,2,90,0,2026-01-01
203,Plan Básico,2,70,6,2026-01-01
```

### Mapeo Interno (cómo se transforma al tipo `Plan`)

```typescript
// CSV row → Plan object
{
  id: row.id,                           // Número entero
  name: row.name,                       // String
  jurisdiction_id: row.jurisdiction_id,   // 1 o 2
  rules: {
    coverage_percent: row.coverage_percent,           // Número
    waiting_period_months: row.waiting_period_months,  // Número
  },
  created_at: row.created_at            // ISO string
}
```

> ⚠️ **IMPORTANTE:** El campo `rules` en la base de datos es un JSONB. Al importar desde CSV, las columnas `coverage_percent` y `waiting_period_months` deben empaquetarse dentro del objeto `rules`.

### Reglas de Validación

- `coverage_percent` debe estar entre 0 y 100.
- `waiting_period_months` debe ser ≥ 0. Si está vacío, usar `0`.
- `jurisdiction_id` solo puede ser `1` o `2`.
- `name` no puede estar vacío ni duplicarse dentro de la misma jurisdicción.

---

## 3.4 Tabla: AFILIADOS (affiliates)

### Estructura CSV/Excel

| Columna | Tipo DB | Tipo CSV | Requerido | Descripción | Ejemplo |
|---------|---------|----------|-----------|-------------|---------|
| `id` | INTEGER | Número | ✅ PK | ID interno del afiliado | `1` |
| `full_name` | VARCHAR(200) | Texto | ✅ | Nombre completo (Apellido, Nombre) | `Pérez, Juan Carlos` |
| `document_number` | VARCHAR(20) | Texto | ✅ UNIQUE | DNI sin puntos ni guiones | `20123456` |
| `birth_date` | DATE | Fecha (YYYY-MM-DD) | ✅ | Fecha de nacimiento | `1980-05-15` |
| `plan_id` | INTEGER | Número | ✅ FK → plans.id | Plan asignado al afiliado | `101` |
| `jurisdiction_id` | INTEGER | Número | ✅ FK → jurisdictions.id | Cámara del afiliado | `1` |
| `start_date` | DATE | Fecha (YYYY-MM-DD) | ✅ | Fecha de inicio de afiliación | `2020-01-01` |
| `created_at` | TIMESTAMP | Fecha ISO | Auto | Fecha de carga del registro | `2026-01-15` |

### Ejemplo CSV: `affiliates.csv`

```csv
id,full_name,document_number,birth_date,plan_id,jurisdiction_id,start_date,created_at
1,"Pérez, Juan Carlos",20123456,1980-05-15,101,1,2020-01-01,2026-01-15
2,"García, María Eugenia",27654321,1995-10-20,102,1,2025-01-01,2026-01-15
3,"López, Carlos Alberto",20987654,1975-03-10,201,2,2018-06-15,2026-01-15
4,"Torres, Ana María",27112233,2002-12-05,202,2,2024-03-01,2026-01-15
5,"Nuevo, Pedro",30123456,2000-01-01,102,1,2026-01-01,2026-01-15
```

### Reglas de Validación

- `document_number`: Solo dígitos, sin puntos ni espacios. Longitud entre 7 y 11 caracteres.
- `birth_date`: Formato estricto `YYYY-MM-DD`. Debe ser una fecha pasada.
- `start_date`: Formato estricto `YYYY-MM-DD`. Debe ser ≤ fecha actual.
- `plan_id`: Debe existir en la tabla `plans` Y pertenecer a la misma `jurisdiction_id` del afiliado.
- `jurisdiction_id`: Solo `1` o `2`.
- `full_name`: No vacío. Recomendado formato "Apellido, Nombre".

### Campos Recomendados para Futuro (no requeridos ahora)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `status` | ENUM | `activo`, `suspendido`, `baja` |
| `email` | VARCHAR | Correo electrónico de contacto |
| `phone` | VARCHAR | Teléfono de contacto |
| `group_id` | INTEGER | Grupo familiar (titular / adherente) |
| `relationship` | ENUM | `titular`, `conyuge`, `hijo` |

---

### 4. Tabla `practices` (Nomenclador Unificado)

Soporta múltiples tipos de nomencladores y cálculo dinámico de precios (Galenos/Unidades).

| Columna | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | Identificador único. | `1` |
| `code` | STRING | Código de la práctica (NN, NBU, etc). | `"42.01.01"` |
| `description` | STRING | Nombre descriptivo. | `"CONSULTA EN CONSULTORIO"` |
| `nomenclator_type` | STRING | Tipo de nomenclador. | `'medico'`, `'bioquimico'`, `'odontologico'`, `'medicamentos'`, `'programas'` |
| `calculation_method` | STRING | Cómo se calcula el precio. | `'fijo'`, `'galenos'`, `'nbu'`, `'unidades_odontologicas'` |
| `fixed_value` | DECIMAL | Valor monetario directo (null si es dinámico). | `15000.00` (o `NULL`) |
| `unit_value` | DECIMAL | Cantidad de unidades (Galenos/NBU) de la práctica. | `10.5` (Galenos) |
| `category` | STRING | Categoría agrupada (Consultas, Cirugía, etc). | `"Consultas"` |
| `jurisdiction_id` | INT | Jurisdicción (1=Sta Fe, 2=Rosario). | `1` |
| `active` | BOOLEAN | Si la práctica está vigente. | `true` |

> **Lógica de Cálculo:**
> - Si `calculation_method == 'fijo'`: Precio = `fixed_value`.
> - Si `calculation_method == 'galenos'`: Precio = `unit_value` * `VALOR_ACTUAL_GALENO`.
> - Esto permite actualizar el valor del Galeno una sola vez y recalcular miles de prácticas automáticamente.

---

### 5. Tabla `system_parameters` (Valores de Referencia)

Almacena los valores globales para el cálculo de aranceles.

| Columna | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `key` | STRING | Clave del parámetro. | `'valor_galeno'`, `'valor_nbu'`, `'valor_unidad_odontologica'` |
| `value` | DECIMAL | Valor actual. | `1500.00` |
| `updated_at` | DATETIME | Fecha de última actualización. | `"2024-02-01"` |
| `jurisdiction_id` | INT | Si el valor es específico por zona (0=Global). | `1` |

---

## 3.6 Guía de Transformación: De Datos Desordenados a Formato Estándar

### Paso 1: Inventario de Fuentes

Identifique todas sus fuentes de datos actuales:
- Excel de afiliados (posiblemente por cámara)
- PDF/Excel del nomenclador oficial
- Listado de planes vigentes

### Paso 2: Normalización del DNI

```
Dato original       →  Formato requerido
20.123.456          →  20123456
27.654.321-3        →  27654321
DNI 30123456        →  30123456
```

**Fórmula Excel:** `=SUSTITUIR(SUSTITUIR(SUSTITUIR(A2,".",""),"-",""),"DNI ","")` 

### Paso 3: Normalización de Fechas

```
Dato original       →  Formato requerido (YYYY-MM-DD)
15/05/1980          →  1980-05-15
5-mar-2020          →  2020-03-05
01/01/26            →  2026-01-01
```

**Fórmula Excel:** `=TEXTO(A2,"YYYY-MM-DD")`

### Paso 4: Asignación de IDs de Jurisdicción

| Si el registro pertenece a... | Asignar `jurisdiction_id` |
|-------------------------------|--------------------------|
| Santa Fe / Cámara I / C1 | `1` |
| Rosario / Cámara II / C2 | `2` |

### Paso 5: Mapeo de Plan → plan_id

Cree primero la tabla de planes y asigne IDs. Luego, use BUSCARV/VLOOKUP para mapear el nombre del plan en la tabla de afiliados a su `plan_id`.

```
=BUSCARV(C2, Planes!A:B, 2, FALSO)
```

### Paso 6: Valores Monetarios

```
Dato original       →  Formato requerido
$10.500,00          →  10500.00
$ 150.000           →  150000.00
10,500.00           →  10500.00
```

**Regla:** Usar punto como separador decimal. Sin separadores de miles. Sin símbolo `$`.

### Paso 7: Validación Final

Antes de importar, verifique con este checklist:

- [ ] Todas las fechas están en formato `YYYY-MM-DD`
- [ ] Todos los DNIs son solo dígitos
- [ ] Todos los `plan_id` existen en la tabla de planes
- [ ] Todos los `jurisdiction_id` son 1 o 2
- [ ] No hay campos obligatorios vacíos
- [ ] Los valores monetarios usan punto decimal
- [ ] Las categorías de prácticas coinciden exactamente con las permitidas
- [ ] El archivo está guardado como **UTF-8** (para caracteres especiales como ñ, tildes)

---

### 6. Tabla `providers` (Prestadores e Instituciones)

Médicos, Bioquímicos, Odontólogos y Clínicas que realizan las prácticas.

| Columna | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID / INT | ✅ PK | Identificador único. | `1` |
| `name` | STRING | ✅ | Nombre o Razón Social. | `"Dr. Favaloro, René"` |
| `cuit` | STRING | ❌ | CUIT/CUIL (Sin guiones). | `"20123456789"` |
| `enrollment` | STRING | ❌ | Matrícula Profesional. | `"MP-1234"` |
| `type` | STRING | ✅ | Tipo (`medico`, `clinica`, `farmacia`). | `'medico'` |
| `jurisdiction_id` | INT | ✅ | Jurisdicción. | `1` |
| `active` | BOOLEAN | ✅ | Estado. | `true` |

---

### 7. Tabla `users` (Usuarios del Sistema)

Perfiles de acceso vinculados a Supabase Auth.

| Columna | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | ✅ PK | ID de Supabase Auth. | `abcd-1234...` |
| `email` | STRING | ✅ | Correo electrónico. | `"admin@cpce.org.ar"` |
| `role` | STRING | ✅ | Rol (`admin`, `auditor`, `afiliado`). | `'auditor'` |
| `jurisdiction_id` | INT | ❌ | Restricción de acceso (NULL = Todas). | `1` |
| `full_name` | STRING | ❌ | Nombre real del usuario. | `"Juan Auditor"` |

---

### 8. Tabla `audit_records` (Historial de Auditorías)

Registro persistente de todas las consultas realizadas al motor de cobertura.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | BIGINT PK | Identificador secuencial. |
| `created_at` | TIMESTAMPTZ | Fecha y hora exacta. |
| `affiliate_id` | FK | Quién solicitó la práctica. |
| `affiliate_snapshot` | JSONB | Copia de los datos del afiliado al momento de la auditoría (Plan, Edad). |
| `practice_id` | FK | Qué práctica se solicitó. |
| `practice_snapshot` | JSONB | Copia de los datos de la práctica (Valor, Nomenclador). |
| `provider_id` | FK | Quién realiza la práctica (Opcional). |
| `status` | ENUM | `approved`, `rejected`, `partial`, `requires_auth`. |
| `coverage_result` | JSONB | Resultado completo del motor (Montos, Copagos, Mensajes). |
| `auditor_id` | FK | Usuario que realizó/aprobó la auditoría. |

---

### 9. Tabla `alert_rules` (Reglas de Alerta)

Configuración dinámica de las reglas de control presupuestario.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | INT PK | Identificador. |
| `name` | STRING | Nombre de la regla. |
| `type` | ENUM | `frequency`, `amount`, `category`. |
| `threshold` | DECIMAL | Límite (Cantidad o Monto). |
| `period_months` | INT | Ventana de tiempo (1 mes, 3 meses). |
| `severity` | ENUM | `info`, `warning`, `critical`. |
| `active` | BOOLEAN | Si la regla está activa. |

---

### 10. Tabla `alerts` (Alertas Generadas)

Notificaciones disparadas por las reglas.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | BIGINT PK | Identificador. |
| `rule_id` | FK | Regla que disparó la alerta. |
| `affiliate_id` | FK | Afiliado involucrado (si aplica). |
| `detected_value` | DECIMAL | Valor detectado (ej. 5 consultas). |
| `status` | ENUM | `active`, `reviewed`, `dismissed`. |
| `created_at` | TIMESTAMPTZ | Fecha de detección. |

---

### 11. Tabla `events` (Agenda / Calendario)

Reuniones, eventos, recordatorios y tareas programadas.

| Columna | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID / BIGINT | ✅ PK | Identificador único. | `1` |
| `title` | STRING | ✅ | Título del evento. | `"Reunión Comisión Directiva"` |
| `description` | TEXT | ❌ | Detalles adicionales. | `"Revisar presupuesto Q1"` |
| `start_datetime` | TIMESTAMPTZ | ✅ | Fecha y hora de inicio. | `"2026-02-15 10:00:00"` |
| `end_datetime` | TIMESTAMPTZ | ❌ | Fecha y hora de fin. | `"2026-02-15 12:00:00"` |
| `all_day` | BOOLEAN | ✅ | Si es evento de día completo. | `false` |
| `location` | STRING | ❌ | Lugar (físico o virtual). | `"Sala de Reuniones 1"` |
| `type` | STRING | ✅ | Tipo de evento. | `'reunion'`, `'capacitacion'`, `'vencimiento'`, `'recordatorio'` |
| `priority` | STRING | ✅ | Prioridad. | `'normal'`, `'alta'`, `'urgente'` |
| `status` | STRING | ✅ | Estado del evento. | `'pendiente'`, `'confirmado'`, `'cancelado'`, `'completado'` |
| `attendees` | JSONB | ❌ | Lista de participantes (emails). | `["admin@cpce.org", "auditor@cpce.org"]` |
| `reminder_minutes` | INT | ❌ | Minutos antes para recordatorio. | `30` |
| `reminder_sent` | BOOLEAN | ✅ | Si ya se envió el recordatorio. | `false` |
| `created_by` | FK → users | ✅ | Usuario que creó el evento. | `"user-uuid"` |
| `jurisdiction_id` | INT | ❌ | Jurisdicción (NULL = Global). | `1` |
| `created_at` | TIMESTAMPTZ | ✅ | Fecha de creación. | `"2026-02-01"` |
| `updated_at` | TIMESTAMPTZ | ❌ | Última modificación. | `"2026-02-05"` |

> **Lógica de Recordatorios:**
> Un job programado (Supabase Edge Function o Cron) revisará cada minuto los eventos donde:
> - `reminder_sent = false`
> - `start_datetime - reminder_minutes <= NOW()`
> Y enviará el correo correspondiente a los `attendees`, marcando `reminder_sent = true`.

---

## 4. Sistema de Comunicación Interna (Chat)

### 12. Tabla `conversations` (Conversaciones/Salas)

Representa un chat P2P o una sala grupal.

| Columna | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | ✅ PK | Identificador único. | `"conv-1234"` |
| `name` | STRING | ❌ | Nombre de la sala (NULL para P2P). | `"Sala General"`, `NULL` |
| `type` | STRING | ✅ | Tipo de conversación. | `'direct'` (P2P), `'channel'` (Sala) |
| `description` | TEXT | ❌ | Descripción de la sala. | `"Canal para anuncios generales"` |
| `is_private` | BOOLEAN | ✅ | Si es privada (solo invitados). | `false` |
| `jurisdiction_id` | INT | ❌ | Jurisdicción (NULL = Global). | `1` |
| `created_by` | FK → users | ✅ | Usuario que creó la conversación. | `"user-uuid"` |
| `created_at` | TIMESTAMPTZ | ✅ | Fecha de creación. | `"2026-02-01"` |

---

### 13. Tabla `conversation_members` (Miembros de Conversación)

Relación N:M entre usuarios y conversaciones.

| Columna | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | ✅ PK | Identificador único. | `"member-1"` |
| `conversation_id` | FK → conversations | ✅ | A qué conversación pertenece. | `"conv-1234"` |
| `user_id` | FK → users | ✅ | Qué usuario es miembro. | `"user-uuid"` |
| `role` | STRING | ✅ | Rol en la conversación. | `'admin'`, `'member'` |
| `last_read_at` | TIMESTAMPTZ | ❌ | Último mensaje leído (para "no leídos"). | `"2026-02-05 10:00:00"` |
| `joined_at` | TIMESTAMPTZ | ✅ | Fecha de ingreso. | `"2026-02-01"` |

---

### 14. Tabla `messages` (Mensajes)

Mensajes enviados en las conversaciones.

| Columna | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | ✅ PK | Identificador único. | `"msg-5678"` |
| `conversation_id` | FK → conversations | ✅ | A qué conversación pertenece. | `"conv-1234"` |
| `sender_id` | FK → users | ✅ | Quién envió el mensaje. | `"user-uuid"` |
| `content` | TEXT | ✅ | Contenido del mensaje. | `"Hola a todos"` |
| `type` | STRING | ✅ | Tipo de mensaje. | `'text'`, `'file'`, `'system'` |
| `attachment_url` | STRING | ❌ | URL de archivo adjunto. | `"https://..."` |
| `reply_to_id` | FK → messages | ❌ | Si es respuesta a otro mensaje. | `"msg-1234"` |
| `is_edited` | BOOLEAN | ✅ | Si fue editado. | `false` |
| `is_deleted` | BOOLEAN | ✅ | Si fue eliminado (soft delete). | `false` |
| `created_at` | TIMESTAMPTZ | ✅ | Fecha de envío. | `"2026-02-01 10:30:00"` |

> **Tiempo Real:**
> En producción, Supabase Realtime suscribirá a cambios en `messages` para actualizar el chat instantáneamente.
