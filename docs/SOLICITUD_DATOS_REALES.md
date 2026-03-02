# Solicitud de Datos Reales — CPCE Salud

**De:** Equipo de Desarrollo  
**Para:** [Responsable de datos CPCE]  
**Asunto:** Solicitud de datos reales para carga en CPCE Salud  
**Fecha:** Marzo 2026

---

Estimado/a,

El sistema **CPCE Salud** se encuentra en fase de pruebas funcionales con datos ficticios. Para avanzar a la etapa de **validación con datos reales** y posterior puesta en producción, necesitamos recibir la información que detallamos a continuación.

> **Nota:** Los datos pueden enviarse en el formato que les resulte más cómodo: **Excel (.xlsx), CSV, o exportación SQL** de la base actual. Nosotros nos encargamos de la transformación y carga.

---

## 1. DATOS PRIORITARIOS (necesarios para arrancar)

### 1.1 Padrón de Afiliados
Todos los afiliados activos (titulares y grupo familiar), con los siguientes campos:

| Campo | Ejemplo | Obligatorio |
|-------|---------|:-----------:|
| Número de afiliado | 10001-00 | ✅ |
| Nombre completo | García, Juan Carlos | ✅ |
| DNI | 25.432.189 | ✅ |
| Fecha de nacimiento | 15/03/1976 | ✅ |
| Sexo | M / F | ✅ |
| Parentesco | Titular / Cónyuge / Hijo | ✅ |
| Nro. afiliado titular (si es familiar) | 10001-00 | Si aplica |
| Plan asignado | Plan General / Plan Premium | ✅ |
| Cámara/Jurisdicción | Cámara I / Cámara II | ✅ |
| Estado | Activo / Suspendido / Baja | ✅ |
| Fecha de alta | 01/06/2020 | ✅ |
| Fecha de baja | (si corresponde) | Opcional |
| Teléfono | 342-4551234 | Opcional |
| Email | juan@email.com | Opcional |
| Domicilio | Av. Freyre 2150 | Opcional |
| Localidad | Santa Fe | Opcional |
| CUIT | 20-25432189-5 | Opcional |
| Nro. en sistema anterior | 5432 | Si existe |
| Categoría | A / B / C | Si aplica |
| Convenio/Empresa | (si aplica) | Opcional |
| Observaciones | Patología crónica, etc. | Opcional |

---

### 1.2 Nomencladores (Prácticas)
Listado completo de prácticas vigentes, separadas por tipo:

**a) Nomenclador Médico**
| Campo | Ejemplo | Obligatorio |
|-------|---------|:-----------:|
| Código | 01.01.01 | ✅ |
| Descripción | Consulta en consultorio | ✅ |
| Unidades (Galenos) | 15 | ✅ |
| Categoría/Capítulo | Consultas | ✅ |
| Requiere autorización | Sí / No | ✅ |
| Límite mensual/anual | (si aplica) | Opcional |

**b) Nomenclador Bioquímico** (misma estructura, unidades en NBU)

**c) Nomenclador Odontológico** (misma estructura, unidades en UO)

**d) Nomenclador de Medicamentos (Farmacia)**
| Campo | Ejemplo | Obligatorio |
|-------|---------|:-----------:|
| Código / Troquel | 12345 | ✅ |
| Droga | Amoxicilina | ✅ |
| Nombre comercial | Amoxidal 500 | ✅ |
| Laboratorio | Roemmers | ✅ |
| Presentación | Comp. x 12 | ✅ |
| Precio de referencia | $4.500 | ✅ |
| % Descuento según plan | 40% / 70% | ✅ |
| Código de barras | (si tienen) | Opcional |

---

### 1.3 Planes de Cobertura
| Campo | Ejemplo | Obligatorio |
|-------|---------|:-----------:|
| Nombre del plan | Plan General | ✅ |
| Cámara | I / II | ✅ |
| % Cobertura base | 80% | ✅ |
| Meses de carencia | 6 | ✅ |
| Categorías con cobertura especial | Oncología: 100%, etc. | Si aplica |
| Categorías que requieren autorización | Internación, Cirugía | Si aplica |
| Topes anuales por categoría | Kinesiología: 30 sesiones | Si aplica |

---

### 1.4 Valores de Unidades (vigentes)
| Campo | Ejemplo | Obligatorio |
|-------|---------|:-----------:|
| Tipo | Galeno / NBU / UO | ✅ |
| Valor actual ($) | $150,00 | ✅ |
| Vigencia desde | 01/01/2026 | ✅ |
| Cámara | I / II | ✅ |

---

### 1.5 Prestadores
| Campo | Ejemplo | Obligatorio |
|-------|---------|:-----------:|
| Nombre / Razón Social | Dr. Pérez, Juan | ✅ |
| CUIT | 20-18765432-1 | Opcional |
| Matrícula | MP 12345 | ✅ |
| Especialidad | Cardiología | ✅ |
| Tipo | Médico / Clínica / Lab / Farmacia | ✅ |
| Dirección | Bv. Gálvez 1500 | Opcional |
| Teléfono | 342-4567890 | Opcional |
| Cámara | I / II | ✅ |
| Activo | Sí / No | ✅ |

---

## 2. DATOS SECUNDARIOS (pueden esperar a la 2da carga)

### 2.1 Usuarios del Sistema
Lista de personas que usarán el sistema con su **nombre, email y rol** (admin, supervisor, auditor, administrativo, gerencia).

### 2.2 Enfermedades / CIE-10
Si manejan un listado propio de patologías con códigos, necesitamos el catálogo. Si usan CIE-10 estándar, lo cargamos nosotros.

### 2.3 Categorías de Afiliado
Si existen categorías con coeficientes de cuota distintos (A, B, C, etc.), necesitamos:
- Código y nombre de cada categoría
- Coeficiente de cuota
- Límite de edad (si aplica)

### 2.4 Reglas de Alerta
Criterios de desvío presupuestario que quieran monitorear:
- "Más de X prácticas del mismo tipo en Y meses"
- "Gasto mensual superior a $X por afiliado"
- etc.

---

## 3. DATOS HISTÓRICOS (opcionales pero valiosos)

Si disponen de **exportaciones de la base anterior**, los siguientes datos nos permiten arrancar con historial precargado:

- **Auditorías/Liquidaciones pasadas** (últimos 6–12 meses)
- **Autorizaciones emitidas** (pendientes y resueltas)
- **Facturación a prestadores** (últimos períodos)
- **Internaciones activas**
- **Recetas de farmacia** (último trimestre)
- **Órdenes de laboratorio**

> No es imprescindible tener todo esto desde el día 1. Podemos priorizar y cargar por etapas.

---

## Formato de entrega

Cualquiera de estos formatos sirve:

| Formato | Preferencia |
|---------|:-----------:|
| Excel (.xlsx) con una pestaña por tabla | ⭐ Ideal |
| CSV (un archivo por tabla) | ✅ Bien |
| Export SQL (de la base actual) | ✅ Bien |
| Access (.mdb / .accdb) | ✅ Bien |
| PDF con tablas | ⚠️ Último recurso |

---

## Confidencialidad

Todos los datos serán tratados con absoluta confidencialidad. La base de datos está alojada en **Supabase** con encriptación en tránsito y en reposo. Solo el equipo autorizado tendrá acceso.

---

## Prioridad sugerida de carga

```
Etapa 1 → Nomencladores + Planes + Valores de unidades + Prestadores
Etapa 2 → Padrón de afiliados
Etapa 3 → Usuarios del sistema
Etapa 4 → Datos históricos (auditorías, autorizaciones, facturación)
```

La **Etapa 1** es la que más nos urge porque sin nomencladores y planes, no podemos validar el motor de cálculo de cobertura con datos reales.

---

Quedamos a disposición para cualquier consulta. Podemos coordinar una reunión para revisar dudas sobre los datos o formatos.

Saludos cordiales,  
**Equipo de Desarrollo — CPCE Salud**
