# Solicitud de Datos para Puesta en Marcha - Sistema CPCE Salud

**Asunto del email:** Solicitud de datos para puesta en marcha del Sistema CPCE Salud

---

Estimados,

Les escribo para solicitar los datos necesarios para probar y poner en funcionamiento el **Sistema de Gestión de Auditoría Médica CPCE Salud**.

Para poder cargar datos reales y realizar pruebas con casos verdaderos, necesitamos que nos envíen la siguiente información. Preferiblemente en formato **Excel (.xlsx) o CSV**, con una hoja/archivo por cada categoría:

---

## 1. JURISDICCIONES / CÁMARAS
*(una fila por cada cámara que usará el sistema)*

| Nombre de la Cámara |
|---|
| Ej: Cámara I - Santa Fe |
| Ej: Cámara II - Rosario |

---

## 2. PLANES DE COBERTURA
*(una fila por cada plan)*

| Nombre del Plan | Cámara | % Cobertura (0-100) | Meses de Carencia |
|---|---|---|---|
| Ej: Plan General | Cámara I | 80 | 6 |
| Ej: Plan Premium | Cámara I | 100 | 0 |

---

## 3. PADRÓN DE AFILIADOS
*(una fila por afiliado, incluyendo grupo familiar)*

| Nro. Afiliado | Apellido y Nombre | DNI | Fecha Nacimiento | Género (M/F/X) | Parentesco | DNI Titular | Plan | Condiciones Especiales | Fecha Alta | Fecha Baja | Estado | Cámara |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AF-001234 | Pérez, Juan Carlos | 20123456 | 15/05/1980 | M | Titular | — | Plan General | — | 01/01/2020 | — | Activo | Cámara I |
| AF-001235 | Pérez, María Laura | 27654321 | 20/10/1982 | F | Cónyuge | 20123456 | Plan General | — | 01/01/2020 | — | Activo | Cámara I |

**Aclaraciones:**
- **Parentesco** puede ser: Titular, Cónyuge, Hijo, Hijo Estudiante, Hijo Discapacidad, Otro.
- **Estado** puede ser: Activo, Suspendido, Baja.
- **DNI Titular** solo es necesario para miembros del grupo familiar (no titulares).
- **Condiciones Especiales** es opcional (ej: "Discapacidad", "Enfermedad crónica").
- **Fecha Baja** solo completar si el afiliado ya no está activo.

---

## 4. NOMENCLADOR INTERNO DE PRÁCTICAS
*(una hoja/archivo por tipo: Médico, Bioquímico, Odontológico, Medicamentos, Especiales)*

| Código | Nombre | Descripción | Tipo (MED/BIO/ODO/FAR/ESP) | Unidades (Galenos/NBU/UO) | Valor Fijo $ | Categoría | Requiere Autorización (S/N) | Máx. por Mes | Máx. por Año |
|---|---|---|---|---|---|---|---|---|---|
| 42.01.01 | Consulta médica de urgencias | Consulta en guardia diurna | MED | 15.5 | — | Consultas | N | — | — |
| 11.01.01 | Cesárea | Cesárea programada o de urgencia | MED | — | 150000 | Cirugía | S | — | — |

**Aclaraciones:**
- Completar **Unidades** (cantidad de Galenos, NBU, etc.) O **Valor Fijo $**, según corresponda. No ambos.
- **Tipo**: MED = Médico, BIO = Bioquímico, ODO = Odontológico, FAR = Medicamentos, ESP = Especiales.
- **Categoría**: texto libre (ej: Consultas, Cirugía, Salud Mental, Alta Complejidad, Laboratorio, etc.).

---

## 5. NOMENCLADORES EXTERNOS
*(una hoja/archivo por cada nomenclador de obra social que utilicen)*

Primero indicar los datos del nomenclador:

| Código del Nomenclador | Nombre Completo | Descripción |
|---|---|---|
| NUN | Nomenclador Único Nacional | Versión 2026 |

Luego, las prácticas de ese nomenclador:

| Código | Descripción | Valor | Unidad |
|---|---|---|---|
| 040101 | Consulta médica en consultorio | 150.00 | Galeno |

> **Nota:** Si disponen de los nomencladores en formato PDF, el sistema puede importarlos automáticamente mediante extracción inteligente de datos.

---

## 6. VALORES ACTUALES DE UNIDADES
*(Galeno, NBU, UO, etc.)*

| Tipo de Nomenclador | Nombre de Unidad | Valor en $ | Vigente desde | Cámara |
|---|---|---|---|---|
| MED (Médico) | Galeno | 150.00 | 01/01/2026 | Cámara I |
| BIO (Bioquímico) | NBU | 45.00 | 01/01/2026 | Cámara I |
| ODO (Odontológico) | UO | 80.00 | 01/01/2026 | Cámara I |

---

## 7. USUARIOS DEL SISTEMA
*(personas que usarán la plataforma)*

| Email | Nombre Completo | Rol | Cámara |
|---|---|---|---|
| auditor@cpce.org.ar | Dr. García, María | Auditor | Cámara I |
| admin@cpce.org.ar | Lic. López, Carlos | Admin | Cámara I |

**Roles disponibles:** Admin (acceso total), Supervisor (supervisa auditorías), Auditor (realiza auditorías).

---

## Notas importantes

- Los datos serán cargados en un entorno de pruebas seguro, alojado en Supabase (servidores con encriptación en tránsito y en reposo).
- Si disponen de los nomencladores en formato PDF, el sistema puede importarlos automáticamente.
- Con un lote mínimo de **10 afiliados, 2 planes y 20 prácticas** ya podemos realizar pruebas funcionales completas.
- Todos los datos son confidenciales y se manejan según normativas de protección de datos de salud vigentes.
- Quedo a disposición para cualquier consulta sobre los campos o formatos.

---

Agradezco su colaboración.

Saludos cordiales,

**[Tu nombre]**
**[Tu cargo]**
**[Tu teléfono / email de contacto]**
