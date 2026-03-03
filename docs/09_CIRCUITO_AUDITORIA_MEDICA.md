# CIRCUITO DE AUDITORÍA MÉDICA — DOCUMENTO DE DISEÑO

> **Objetivo**: Diseñar el flujo completo y sin fisuras de auditoría médica, desde que
> nace la necesidad del afiliado hasta la resolución final, facturación y estadísticas.
>
> **Estado**: 📋 DISEÑO — pendiente de decisión del usuario.

---

## CONTEXTO: ¿QUÉ EXISTE HOY EN LA BASE DE DATOS?

Antes de diseñar, es vital saber con qué tablas contamos:

| **Tabla**                  | **Función**                                      |
|----------------------------|--------------------------------------------------|
| `affiliates`               | Padrón completo con plan, categoría, condiciones |
| `plans`                    | Planes de cobertura con reglas                   |
| `practices`                | Nomenclador unificado (MED/BIO/ODO/FAR/ESP)      |
| `practice_types`           | Tipos: Médico, Bioquímico, Odontológico, Farmacia|
| `unit_values`              | Valor del Galeno/NBU por jurisdicción y fecha    |
| `providers`                | Prestadores/Efectores con matrícula y tipo       |
| `diseases`                 | CIE-10 con flags: crónica, requiere autorización |
| `authorizations`           | Autorizaciones formales (con detalle en `authorization_details`) |
| `hospitalizations`         | Internaciones (tipo, sanatorio, ingreso/alta)    |
| `lab_orders`               | Órdenes bioquímicas                              |
| `reimbursements`           | Reintegros (con CBU, método de pago)             |
| `pharmacy_records`         | Dispensación de farmacia (troquel, descuento)     |
| `invoices` / `invoice_details` | Facturación de prestadores                   |
| `audits`                   | Auditorías realizadas (motor de cobertura)        |
| `audit_requests`           | Solicitudes de auditoría (actual, incompleto)     |
| `audit_request_notes`      | Notas/comunicaciones de la solicitud             |
| `audit_request_attachments`| Adjuntos (Storage)                               |
| `audit_request_log`        | Log de trazabilidad                              |

---

## LOS 3 ACTORES DEL CIRCUITO

| **Actor**         | **Rol en el sistema**  | **Qué hace**                                           |
|-------------------|------------------------|--------------------------------------------------------|
| 🧑 Afiliado       | (externo, no logueado) | Presenta documentación en mesa de entradas             |
| 🏢 Administrativo | `administrativo`       | Recibe, digitaliza, carga la solicitud, controla datos |
| 🩺 Auditor Médico | `auditor`              | Evalúa, decide, autoriza/deniega, observa              |
| 👔 Supervisor      | `supervisor`           | Supervisa, reasigna, resuelve apelaciones, reportes    |

---

## ═══════════════════════════════════════════
## PROPUESTA A: "LINEAL CON VALIDACIÓN PREVIA"
## ═══════════════════════════════════════════

**Filosofía**: El administrativo hace una pre-validación completa antes de que
llegue al auditor. El auditor recibe expedientes "limpios" y se concentra en
la decisión médica.

### Flujo paso a paso:

```
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 1: RECEPCIÓN (Administrativo)                           │
│                                                                 │
│  1. Afiliado se presenta con documentación                      │
│  2. Administrativo busca afiliado → ve ficha completa           │
│     - Edad, plan, titular/familiar, condiciones especiales      │
│     - Estado (activo/suspendido/baja) → BLOQUEANTE si no activo │
│     - Deuda de coseguro → ALERTA si deuda > 0                  │
│     - Consumos previos de la misma práctica                     │
│  3. Selecciona tipo de solicitud:                               │
│     AMB | BIO | INT | ODO | PROG.ESP | ELEM | REINTEGRO        │
│  4. Busca práctica(s) en nomenclador → agrega al listado       │
│  5. Digitaliza y adjunta documentación:                         │
│     - Orden médica (OBLIGATORIO)                                │
│     - Receta, estudios previos, informes, etc.                  │
│  6. Selecciona prestador/efector y médico prescriptor           │
│  7. El sistema ejecuta PRE-VALIDACIÓN automática:               │
│     ✓ Afiliado activo y al día                                  │
│     ✓ Práctica vigente en nomenclador                           │
│     ✓ Cobertura calculada según plan                            │
│     ✓ No excede frecuencia máxima (min_days_between)            │
│     ✓ No excede topes anuales (max_per_year)                    │
│     ✓ Requiere autorización → SÍ/NO                            │
│  8. Si TODO OK → estado: PENDIENTE_AUDITORIA                   │
│     Si hay alertas → estado: PENDIENTE_REVISION_ADMIN           │
│     (admin debe resolver o justificar las alertas)              │
│                                                                 │
│  📊 RESULTADO: Se crea 1 registro en `audit_requests` por      │
│     cada práctica, con toda la data precargada                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 2: AUDITORÍA (Auditor Médico)                           │
│                                                                 │
│  1. Auditor abre bandeja → ve solicitudes pendientes            │
│     - Ordenadas: urgentes primero, luego por antigüedad         │
│     - Filtros: tipo, estado, afiliado, fecha                    │
│  2. Toma una solicitud → estado: EN_REVISION                    │
│     (se asigna al auditor, otros ya no pueden tomarla)          │
│  3. Ve el expediente completo:                                  │
│     Panel izquierdo: Ficha afiliado + historial                 │
│     Panel central: Práctica(s) + documentación adjunta          │
│     Panel derecho: Resultado motor de cobertura + alertas       │
│  4. Revisa documentación adjunta (visor de PDF/imágenes)        │
│  5. DECIDE:                                                     │
│                                                                 │
│     ✅ AUTORIZAR                                                │
│        - Confirma diagnóstico (CIE-10)                          │
│        - Confirma cobertura (% y montos)                        │
│        - Puede ajustar cantidad si corresponde                  │
│        - Se genera código de autorización automatico             │
│        - Se genera registro en `authorizations`                 │
│        - Se puede imprimir constancia                           │
│        → estado: AUTORIZADA                                     │
│                                                                 │
│     ❌ DENEGAR                                                  │
│        - OBLIGATORIO: seleccionar motivo de denegación          │
│          (fuera de nomenclador, excede topes, plan no cubre,    │
│           documentación insuficiente, no corresponde, otro)     │
│        - Campo de texto obligatorio con justificación           │
│        → estado: DENEGADA                                       │
│                                                                 │
│     ⏸️ OBSERVAR (devolver con pedido de info)                   │
│        - Especificar qué falta o qué debe corregirse            │
│        - Vuelve al administrativo (o al afiliado conceptualm.)  │
│        → estado: OBSERVADA                                      │
│                                                                 │
│     🔄 AUTORIZAR PARCIAL                                        │
│        - Autoriza un subconjunto de las prácticas               │
│        - O autoriza con cobertura reducida + motivo             │
│        → estado: AUTORIZADA_PARCIAL                             │
│                                                                 │
│     ⏰ DIFERIR                                                  │
│        - Requiere junta médica, segunda opinión, o esperar      │
│          resultado de estudio                                   │
│        → estado: DIFERIDA (con fecha de revisión)               │
│                                                                 │
│  6. TODA acción genera:                                         │
│     - Registro en `audit_request_log`                           │
│     - Nota en `audit_request_notes`                             │
│     - Actualización de timestamps                               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 3: POST-RESOLUCIÓN                                      │
│                                                                 │
│  Si AUTORIZADA:                                                 │
│    → Se crea registro en tabla `authorizations`                 │
│    → Se vincula audit_request.authorization_id                  │
│    → Se genera código (AMB-2026-00001) imprimible               │
│    → Si es internación: se crea registro en `hospitalizations`  │
│    → Se puede enviar notificación al prestador (futuro)         │
│    → Queda disponible para facturación del prestador            │
│                                                                 │
│  Si DENEGADA:                                                   │
│    → El afiliado puede APELAR (ver Etapa 4)                     │
│    → El administrativo ve el motivo en la bandeja               │
│    → Se registra para estadísticas                              │
│                                                                 │
│  Si OBSERVADA:                                                  │
│    → Aparece en la bandeja del administrativo como "pendiente"  │
│    → El administrativo puede agregar documentación              │
│    → Una vez completa, la reenvía → vuelve a PENDIENTE_AUDIT    │
│    → El auditor original la ve nuevamente con prioridad         │
│                                                                 │
│  Si DIFERIDA:                                                   │
│    → El sistema agenda una alerta para la fecha indicada        │
│    → Cuando llega la fecha, reaparece en la bandeja del auditor │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 4: APELACIÓN (opcional, ante denegatoria)               │
│                                                                 │
│  1. Afiliado o prestador presentan documentación adicional      │
│  2. Administrativo reabre la solicitud → estado: EN_APELACION   │
│  3. Se asigna a un SUPERVISOR (no al mismo auditor original)    │
│  4. Supervisor revisa expediente original + nueva documentación │
│  5. Decide: confirmar denegación o revertir a autorizada        │
│  6. La decisión es FINAL (no se permite segunda apelación)      │
└─────────────────────────────────────────────────────────────────┘
```

### Estados del circuito A:

```
               ┌──────────────────────────────────────┐
               │          PENDIENTE                    │
               │  (admin cargó, pasa a auditoría)      │
               └──────────────┬───────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   EN_REVISION     │
                    │   (auditor tomó)  │
                    └─────────┬─────────┘
                              │
         ┌────────┬───────────┼───────────┬───────────┐
         ▼        ▼           ▼           ▼           ▼
    AUTORIZADA  DENEGADA   OBSERVADA   PARCIAL    DIFERIDA
         │        │           │           │           │
         │        ├→ APELACIÓN│           │           │
         │        │     │     │           │           │
         │        │  CONFIRMADA           │     (fecha)→ PENDIENTE
         │        │  o REVERTIDA          │
         │        │           │           │
         ▼        ▼           ▼           ▼
      [FIN]    [FIN]    → PENDIENTE    [FIN]
                        (reenvío)
```

### Ventajas:
- ✅ Simple y lineal, fácil de implementar
- ✅ El administrativo filtra basura antes de que llegue al auditor
- ✅ Pre-validación automática reduce errores
- ✅ Apelación con supervisor diferente garantiza objetividad

### Desventajas:
- ⚠️ El administrativo puede bloquear el flujo si demora
- ⚠️ No contempla solicitudes que llegan por vía electrónica (portal web)
- ⚠️ La autorización parcial puede ser confusa en el nomenclador

---

## ═══════════════════════════════════════════════
## PROPUESTA B: "DOBLE COLA CON MOTOR DE REGLAS"
## ═══════════════════════════════════════════════

**Filosofía**: Hay solicitudes que NO necesitan auditor humano. Si el motor de
reglas dice que está todo OK (cobertura contemplada, sin excesos, práctica sin
requisito de autorización), se auto-aprueba en segundos. Solo lo complejo va
al auditor.

### Flujo paso a paso:

```
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 1: CARGA (Administrativo)                               │
│                                                                 │
│  Igual que Propuesta A: busca afiliado, selecciona tipo,        │
│  busca prácticas, adjunta documentación, selecciona prestador.  │
│                                                                 │
│  AL ENVIAR, el sistema ejecuta el MOTOR DE REGLAS:              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MOTOR DE REGLAS AUTOMÁTICO                               │  │
│  │                                                           │  │
│  │  1. ¿Afiliado activo y habilitado?          ✓/✗          │  │
│  │  2. ¿Plan cubre esta práctica?              ✓/✗          │  │  
│  │  3. ¿Práctica requiere autorización previa? SÍ/NO        │  │
│  │  4. ¿Hay carencia vigente?                  SÍ/NO        │  │
│  │  5. ¿Supera tope mensual?                   SÍ/NO        │  │
│  │  6. ¿Supera tope anual?                     SÍ/NO        │  │
│  │  7. ¿Cumple frecuencia mínima?              SÍ/NO        │  │
│  │  8. ¿El monto supera umbral de autorizac.?  SÍ/NO        │  │
│  │  9. ¿Afiliado tiene condición especial?     SÍ/NO        │  │
│  │  10. ¿Es patología oncológica/crónica?      SÍ/NO        │  │
│  │                                                           │  │
│  │  RESULTADO:                                               │  │
│  │    VERDE → Auto-aprobación inmediata                      │  │
│  │    AMARILLO → Requiere revisión de auditor                │  │
│  │    ROJO → Rechazada automáticamente (sin cobertura)       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  📗 VERDE:  estado → AUTORIZADA_AUTO                            │
│     Se genera autorización inmediata, se notifica               │
│     El auditor puede revisarla ex-post (auditoría retrospectiva)│
│                                                                 │
│  📙 AMARILLO: estado → PENDIENTE_AUDITORIA                      │
│     Va a la cola del auditor                                    │
│                                                                 │
│  📕 ROJO: estado → RECHAZADA_SISTEMA                            │
│     Se muestra motivo al administrativo en pantalla             │
│     Admin puede "forzar envío a auditoría" (override manual)    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
     AUTORIZADA_AUTO    COLA AUDITOR      RECHAZADA_SISTEMA
     (inmediato)        (manual)          (con opción override)
            │                  │
            │        ┌─────────▼──────────┐
            │        │ ETAPA 2: AUDITORÍA │
            │        │ (igual Propuesta A)│
            │        └─────────┬──────────┘
            │                  │
            ▼                  ▼
     ┌──────────────────────────────┐
     │  ETAPA 3: AUDITORÍA          │
     │  RETROSPECTIVA               │
     │  (revisión ex-post de        │
     │   autorizaciones automáticas) │
     │                              │
     │  El supervisor revisa un %   │
     │  aleatorio de auto-aprobadas │
     │  → confirma o revoca         │
     └──────────────────────────────┘
```

### Estados del circuito B:

```
SOLICITUD NUEVA
      │
      ├──→ AUTORIZADA_AUTO (verde, inmediata)
      │         │
      │         └──→ REVOCADA (si auditoría retrospectiva falla)
      │
      ├──→ PENDIENTE_AUDITORIA (amarillo)
      │         │
      │         ├──→ EN_REVISION → AUTORIZADA / DENEGADA / OBSERVADA / DIFERIDA
      │         │                     │
      │         │                     └──→ APELACION → CONFIRMADA / REVERTIDA
      │         │
      │         └──→ OBSERVADA → (admin completa) → PENDIENTE_AUDITORIA
      │
      └──→ RECHAZADA_SISTEMA (rojo)
                │
                └──→ OVERRIDE_MANUAL → PENDIENTE_AUDITORIA (admin fuerza)
```

### Ventajas:
- ✅ **Velocidad**: 60-70% de solicitudes se resuelven en segundos
- ✅ El auditor solo ve casos complejos que realmente necesitan criterio humano
- ✅ Auditoría retrospectiva mantiene control de calidad
- ✅ Escalable: las reglas se configuran sin tocar código

### Desventajas:
- ⚠️ Requiere diseñar e implementar motor de reglas configurable
- ⚠️ Las reglas mal configuradas pueden auto-aprobar lo que no se debe
- ⚠️ Mayor complejidad técnica
- ⚠️ El afiliado/prestador podría "aprender" las reglas y optimizar

---

## ═══════════════════════════════════════════════════
## PROPUESTA C: "EXPEDIENTE DIGITAL CON WORKFLOW"
## ═══════════════════════════════════════════════════

**Filosofía**: Cada solicitud es un "EXPEDIENTE" con vida propia, que puede
contener múltiples prácticas, múltiples adjuntos, múltiples actores, y un
timeline completo. El expediente viaja por etapas configurables.

### Concepto clave: EL EXPEDIENTE

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPEDIENTE Nro. EXP-2026-00042                                │
│                                                                 │
│  ┌─ CABECERA ─────────────────────────────────────────────┐    │
│  │ Afiliado: LÓPEZ JUAN (DNI 25.333.444) - Plan Premium   │    │
│  │ Tipo: Ambulatoria  |  Prioridad: ⚡ Urgente            │    │
│  │ Creado: 03/03/2026 14:30 por María González (admin)    │    │
│  │ Estado actual: EN REVISIÓN AUDITORÍA                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ PRÁCTICAS SOLICITADAS ────────────────────────────────┐    │
│  │ #1  420101 - Resonancia magnética cerebral    ×1  $X   │    │
│  │     Estado: ✅ Autorizada (AMB-2026-00105)             │    │
│  │ #2  420301 - Resonancia magnética cervical    ×1  $X   │    │
│  │     Estado: ⏳ En revisión                             │    │
│  │ #3  110201 - Consulta especialista            ×1  $X   │    │
│  │     Estado: ✅ Autorizada (AMB-2026-00106)             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ DOCUMENTACIÓN ADJUNTA ────────────────────────────────┐    │
│  │ 📄 orden_medica.pdf     (Orden médica, verificada ✓)   │    │
│  │ 📄 estudio_previo.pdf   (Estudio, verificado ✓)        │    │
│  │ 📄 informe_neuro.pdf    (Informe, pendiente revisión)   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ VALIDACIÓN AUTOMÁTICA ────────────────────────────────┐    │
│  │ ✅ Afiliado activo                                      │    │
│  │ ✅ Plan cubre las prácticas (100%)                      │    │
│  │ ⚠️ RMN cerebral: última vez hace 15 días (min: 30)     │    │
│  │ ✅ Sin topes anuales excedidos                          │    │
│  │ ℹ️ Práctica requiere autorización previa                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ TIMELINE (HISTORIAL COMPLETO) ────────────────────────┐    │
│  │ 14:30 📥 Solicitud creada (María González, admin)       │    │
│  │ 14:30 📎 Adjunto: orden_medica.pdf                      │    │
│  │ 14:31 📎 Adjunto: estudio_previo.pdf                    │    │
│  │ 14:31 🤖 Pre-validación: 1 alerta (frecuencia RMN)     │    │
│  │ 14:45 👁️ Tomada por Dr. Pérez (auditor)                │    │
│  │ 14:50 ✅ Práctica #1 autorizada (AMB-2026-00105)       │    │
│  │ 14:50 ✅ Práctica #3 autorizada (AMB-2026-00106)       │    │
│  │ 14:52 📝 Nota: "RMN cervical: solicitar justificación  │    │
│  │            clínica adicional por frecuencia"            │    │
│  │ 14:52 ⏸️ Práctica #2 observada                         │    │
│  │ 15:20 📎 Adjunto: informe_neuro.pdf (María, admin)     │    │
│  │ 15:30 👁️ Retomada por Dr. Pérez                        │    │
│  │ 15:35 ✅ Práctica #2 autorizada (AMB-2026-00107)       │    │
│  │ 15:35 📗 Expediente completo: TODAS AUTORIZADAS        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ RESULTADO ECONÓMICO ──────────────────────────────────┐    │
│  │ Total solicitado:     $XX.XXX                           │    │
│  │ Cobertura (100%):     $XX.XXX                           │    │
│  │ Coseguro afiliado:    $0                                │    │
│  │ Autorizaciones: AMB-2026-00105, 00106, 00107           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo del Expediente:

```
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 1: APERTURA DEL EXPEDIENTE (Administrativo)             │
│                                                                 │
│  1. Busca afiliado → se abre ficha completa automáticamente     │
│  2. Selecciona tipo de solicitud                                │
│  3. Agrega N prácticas desde nomenclador                        │
│  4. Adjunta N documentos clasificados                           │
│     Cada documento tiene:                                       │
│     - Tipo (orden, receta, estudio, informe, consentimiento)    │
│     - Estado de verificación (pendiente/verificado/rechazado)   │
│  5. Selecciona prestador y médico prescriptor                   │
│  6. El sistema PRE-VALIDA cada práctica individualmente         │
│  7. El administrativo ve alertas y puede:                       │
│     - Resolver alertas menores (adjuntando más documentación)   │
│     - Enviar igualmente marcando "se justifica por..."          │
│  8. SE CREA EL EXPEDIENTE como unidad                           │
│     → Estado global: PENDIENTE                                  │
│     → Cada práctica tiene su propio mini-estado                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 2: MESA DE CONTROL (Admin supervisor, OPCIONAL)         │
│                                                                 │
│  Algunos expedientes pueden pasar por un control previo:        │
│  - Montos superiores a un umbral configurable                   │
│  - Internaciones                                                │
│  - Patologías oncológicas                                       │
│  - Afiliados con condiciones especiales                         │
│                                                                 │
│  El admin supervisor verifica:                                  │
│  ✓ Documentación completa y legible                             │
│  ✓ Datos del expediente correctos                               │
│  ✓ Orden médica válida y firmada                                │
│                                                                 │
│  → Si OK: ENVIA A AUDITORIA                                    │
│  → Si incompleto: DEVUELVE con observación                      │
│                                                                 │
│  (Esta etapa es opcional y configurable por jurisdicción)       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 3: AUDITORÍA MÉDICA (Auditor)                           │
│                                                                 │
│  Bandeja del auditor muestra:                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Pendientes (12)  │ En revisión (3)  │ Observadas (5)    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ⚡ EXP-2026-042  │ López Juan   │ 3 prácticas │ Urgente │  │
│  │    EXP-2026-041  │ García María │ 1 práctica  │ Normal  │  │
│  │    EXP-2026-040  │ Pérez Carlos │ 2 prácticas │ Normal  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  El auditor abre un expediente y decide POR PRÁCTICA:           │
│                                                                 │
│  Para cada práctica puede:                                      │
│    ✅ Autorizar (con o sin ajuste de cantidad/monto)            │
│    ❌ Denegar (con motivo estructurado + texto)                 │
│    ⏸️ Observar (pedir más info)                                │
│    🔄 Autorizar parcial (menor cantidad o monto reducido)       │
│    ⏰ Diferir (fecha de revisión)                               │
│                                                                 │
│  Cuando TODAS las prácticas tienen resolución:                  │
│    → Expediente pasa a estado RESUELTO                          │
│    → Se generan las autorizaciones correspondientes             │
│                                                                 │
│  Si ALGUNA queda observada:                                     │
│    → Expediente queda PARCIALMENTE_RESUELTO                     │
│    → Las autorizadas ya generan código                          │
│    → Las observadas esperan respuesta del admin                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 4: GENERACIÓN DE AUTORIZACIONES                         │
│                                                                 │
│  Por cada práctica AUTORIZADA:                                  │
│  1. Se crea registro en `authorizations`                        │
│  2. Se crea detalle en `authorization_details`                  │
│     (con práctica, cantidad, monto, cobertura, coseguro)        │
│  3. Se genera código de autorización único                      │
│  4. Se registra vencimiento (configurable: 30/60/90 días)       │
│  5. Si es internación: se pre-crea `hospitalizations`           │
│  6. Si es reintegro: se vincula a `reimbursements`              │
│                                                                 │
│  Outputs disponibles:                                           │
│  📄 Constancia de autorización (PDF imprimible)                 │
│  📄 Orden de prestación para el efector                         │
│  📧 Notificación al prestador (email, futuro)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 5: SEGUIMIENTO Y CIERRE                                 │
│                                                                 │
│  La autorización queda VIGENTE hasta:                           │
│  - Se vence (fecha de expiración)                               │
│  - Se factura (prestador presenta factura → `invoices`)         │
│  - Se anula (admin o auditor)                                   │
│                                                                 │
│  El prestador factura:                                          │
│  → Se cruza `invoice_details.authorization_id`                  │
│  → Se descuenta del saldo de la autorización                    │
│  → Cuando saldo = 0 → autorización CONSUMIDA                   │
│                                                                 │
│  Apelación (ante denegación):                                   │
│  → Se reabre expediente → estado: EN_APELACION                 │
│  → Va a supervisor distinto                                     │
│  → Decisión final inapelable                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Estados del Expediente (Propuesta C):

```
EXPEDIENTE:
  BORRADOR → PENDIENTE → EN_REVISION → RESUELTO
                  │                       ↑
                  │         PARCIALMENTE_RESUELTO
                  │               │
                  └── OBSERVADA ──┘

Cada PRÁCTICA dentro del expediente:
  PENDIENTE → EN_REVISION → AUTORIZADA
                           → DENEGADA → EN_APELACION → CONFIRMADA/REVERTIDA
                           → OBSERVADA → PENDIENTE (loop)
                           → PARCIAL
                           → DIFERIDA → PENDIENTE (en fecha)
```

### Ventajas:
- ✅ **Expediente como unidad**: múltiples prácticas, resolución individual
- ✅ **Granularidad**: cada práctica tiene su propio ciclo de vida
- ✅ **Trazabilidad total**: timeline completo del expediente
- ✅ **Flexibilidad**: mesa de control opcional por jurisdicción
- ✅ **Vinculación real**: genera `authorizations`, `hospitalizations`, `reimbursements`
- ✅ **Facturación**: la autorización se cruza directamente con facturas
- ✅ **Profesional**: es como funcionan los sistemas de obras sociales reales

### Desventajas:
- ⚠️ Mayor complejidad en la UI (pero más profesional)
- ⚠️ Necesita tabla intermedia `expedient_practices` (NEW)
- ⚠️ El admin debe entender el concepto de "expediente"

---

## ═══════════════════════════════════════
## COMPARATIVA RÁPIDA
## ═══════════════════════════════════════

| Criterio                       | A: Lineal     | B: Motor Reglas | C: Expediente  |
|--------------------------------|:-------------:|:---------------:|:--------------:|
| Complejidad de desarrollo      | 🟢 Baja       | 🟡 Media        | 🟡 Media-Alta  |
| Velocidad para el afiliado     | 🟡 Media      | 🟢 Alta (auto)  | 🟢 Alta        |
| Control del auditor            | 🟢 Total      | 🟡 Parcial      | 🟢 Total       |
| Múltiples prácticas por pedido | ❌ Separadas  | ❌ Separadas    | ✅ Agrupadas   |
| Resolución parcial             | ❌ No          | ❌ No           | ✅ Sí          |
| Auto-aprobación                | ❌ No          | ✅ Sí           | (Configurable) |
| Vinculación con authorizations | 🟡 Manual     | 🟡 Manual       | ✅ Automática  |
| Vinculación con facturación    | ❌ No          | ❌ No           | ✅ Sí          |
| Apelación                      | ✅ Sí         | ✅ Sí           | ✅ Sí          |
| Trazabilidad                   | 🟢 Buena      | 🟢 Buena        | 🟢 Excelente   |
| Auditoría retrospectiva        | ❌ No          | ✅ Sí           | (Configurable) |
| Escalabilidad                  | 🟢 Simple     | 🟢 Buena        | 🟢 Excelente   |
| Impresión de constancias       | 🟡 Básica     | 🟡 Básica       | ✅ Completa    |
| Profesionalismo                | 🟡 Medio      | 🟢 Alto         | 🟢 Muy Alto    |

---

## MI RECOMENDACIÓN

**Propuesta C (Expediente Digital)** con elementos de la B (motor de reglas configurable).

Es decir: **C+B** = Expediente con motor de reglas.

- El expediente agrupa las prácticas como unidad.
- Cada práctica se puede resolver individualmente.
- El motor de reglas pre-valida y puede auto-aprobar las simples.
- Las complejas van al auditor con toda la información ya cargada.
- Se genera autorización real vinculada a `authorizations`.
- La autorización tiene vida propia para facturación posterior.

Pero la decisión es tuya.

---

## PREGUNTAS PENDIENTES PARA VOS

Una vez que elijas la propuesta base, necesito que me confirmes:

1. **¿La solicitud puede llegar desde un portal web del afiliado en el futuro?**
   (afecta si necesitamos un estado "borrador" editable por el afiliado)

2. **¿Quién carga el PRESTADOR?: ¿el admin al crear, o el afiliado ya trae prefijado quién lo atiende?**

3. **¿Las autorizaciones tienen vencimiento configurable?** (30, 60, 90 días)

4. **¿Necesitan auditoría retrospectiva (revisar auto-aprobadas)?**

5. **¿La orden médica es SIEMPRE obligatoria, o depende del tipo de solicitud?**

6. **¿Quieren notificaciones (email/push) cuando cambia el estado?**

7. **¿Los supervisores pueden reasignar solicitudes entre auditores?**

8. **¿Necesitan reportes/estadísticas del circuito?** (tiempos promedio, tasas
   de aprobación/denegación, productividad por auditor, etc.)

9. **¿Las internaciones se manejan como un sub-flujo especial dentro del
   expediente, o igual que una ambulatoria pero con más datos?**

10. **¿Quieren impresión de constancias de autorización directamente desde la app?**

---

---

## ═══════════════════════════════════════
## DECISIONES TOMADAS (03/03/2026)
## ═══════════════════════════════════════

**Propuesta elegida: C+B (Expediente Digital + Motor de Reglas)**

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Portal web afiliado futuro | ✅ Sí (estado borrador) |
| 2 | Prestador quién lo carga | A veces admin, a veces ya viene → campo OPCIONAL |
| 3 | Vencimiento autorizaciones | 30 días default, configurable hasta 1 año |
| 4 | Auditoría retrospectiva | ✅ Sí, casi siempre |
| 5 | Orden médica obligatoria | ✅ SIEMPRE obligatoria |
| 6 | Notificaciones | ✅ Sí (futuro) |
| 7 | Reasignación por supervisor | ✅ Sí, como opción |
| 8 | Reportes/estadísticas | ✅ Sí |
| 9 | Internaciones | Flujo casi idéntico + AUDITORÍA POSTERIOR de facturación |
| 10 | Impresión constancias | ✅ Siempre |

**Decisiones adicionales (ronda 2):**

| Tema | Decisión |
|------|----------|
| Expediente vs coseguro | Lo llaman "coseguro". Siempre son expedientes separados por presentación |
| Mesa de control | ✅ Solo para casos complejos (internaciones, montos altos, oncología) |
| Auditoría posterior | Con débitos automáticos + revisión manual + IA como asistente (parametrizable) |
| Auto-aprobación | ✅ Sí para simples (configurable por jurisdicción: topes, tasas de uso) |
| Coseguro (cálculo) | % fijo según plan por defecto, pero configurable por práctica/regla |
| Constancias | Ambas opciones: por expediente completo Y por práctica individual |
| IA en auditoría | Depende del caso: asistente para simples, decisor-con-validación para complejos |
| Nomenclador | BD con datos de prueba; migrarán los reales desde sistema viejo |

---

## ═══════════════════════════════════════
## PLAN DE TRABAJO — DESARROLLO
## ═══════════════════════════════════════

### FASE 1: FUNDAMENTOS (Día 1-2)
> Migración SQL + tipos + servicio base

| # | Tarea | Detalle | Estimación |
|---|-------|---------|------------|
| 1.1 | **Migración SQL 011** | Nueva tabla `expedients` (cabecera del expediente) + `expedient_practices` (prácticas individuales con estado propio). Adaptar `audit_requests` o reemplazar. Triggers para nro. correlativo `EXP-2026-XXXXX`. Relaciones con `authorizations`, `authorization_details`. | ~1h |
| 1.2 | **Tipos TypeScript** | `Expedient`, `ExpedientPractice`, `ExpedientStatus`, `PracticeResolution` en `database.ts` y `supabase.ts` | ~30min |
| 1.3 | **Servicio `expedientService.ts`** | CRUD completo: crear expediente con N prácticas, tomar para revisión, resolver práctica individual, autorizar/denegar/observar/diferir, generar autorización real en `authorizations`, re-enviar observada, apelar, anular. Log y notas automáticos. | ~2h |
| 1.4 | **Motor de reglas `rulesEngine.ts`** | Pre-validación: afiliado activo, cobertura %, frecuencia mínima, topes anuales/mensuales, práctica requiere autorización. Resultado: VERDE/AMARILLO/ROJO por práctica. Reglas configurables por jurisdicción (tabla `audit_rules_config`). | ~2h |

### FASE 2: UI FORMULARIO (Día 2-3)
> Página de carga del expediente (administrativo)

| # | Tarea | Detalle | Estimación |
|---|-------|---------|------------|
| 2.1 | **Rediseñar `/audits/requests/new`** | Formulario de apertura de expediente: tipo, afiliado (ficha completa + consumos), N prácticas desde nomenclador, prestador (opcional), adjuntos clasificados (orden médica obligatoria), observaciones. Al enviar: motor de reglas muestra resultado por práctica (verde/amarillo/rojo) y pide confirmación. | ~3h |
| 2.2 | **Validaciones inline** | Orden médica obligatoria (no se puede enviar sin ella). Afiliado debe estar activo. Alertas visuales si hay topes excedidos o frecuencia violada. | ~1h |
| 2.3 | **Auto-aprobación visual** | Si todas las prácticas son VERDE, mostrar confirmación de auto-aprobación con códigos de autorización generados. Si hay AMARILLAS, mostrar qué va al auditor y qué se auto-aprueba. | ~1h |

### FASE 3: BANDEJA DEL AUDITOR (Día 3-4)
> Panel de resolución con vista de expediente

| # | Tarea | Detalle | Estimación |
|---|-------|---------|------------|
| 3.1 | **Rediseñar `/audits/requests`** | Bandeja con expedientes (no prácticas sueltas). Contadores: Pendientes/En revisión/Observadas. Filtros: tipo, prioridad, fecha, afiliado, auditor asignado. Ordenamiento: urgentes primero, luego por antigüedad. | ~2h |
| 3.2 | **Vista de expediente** | Panel completo: cabecera (afiliado+plan), lista de prácticas con estado individual, documentación adjunta (visor de PDF/imágenes inline), resultado del motor de reglas, timeline del expediente, panel de resolución por práctica. | ~3h |
| 3.3 | **Resoluciones por práctica** | Cada práctica: Autorizar (confirmar cobertura + diagnóstico CIE-10) / Denegar (motivo estructurado obligatorio) / Observar (especificar qué falta + devolver al admin) / Autorizar parcial (ajustar cantidad/monto) / Diferir (fecha de revisión). | ~2h |
| 3.4 | **Generación de autorizaciones** | Al autorizar: crear registro en `authorizations` + `authorization_details`, vincular al expediente, generar código, calcular vencimiento. | ~1h |

### FASE 4: POST-RESOLUCIÓN (Día 4-5)
> Constancias, mesa de control, observaciones

| # | Tarea | Detalle | Estimación |
|---|-------|---------|------------|
| 4.1 | **Constancias PDF** | Generar constancia por expediente (listando todas las prácticas autorizadas) y por práctica individual. Formato profesional con logo, datos del afiliado, código de autorización, vencimiento, prestador. | ~2h |
| 4.2 | **Flujo de observaciones** | Cuando el auditor observa: aparece en bandeja del admin como "requiere respuesta". Admin puede adjuntar documentación adicional y reenviar. El auditor original la ve de vuelta con prioridad. | ~1.5h |
| 4.3 | **Mesa de control** | Para casos complejos (configurable): paso intermedio donde admin supervisor verifica documentación antes del auditor. Activar/desactivar por jurisdicción y tipo de solicitud. | ~1.5h |
| 4.4 | **Apelación** | Reapertura de denegadas → va a supervisor (no al auditor original) → confirma o revierte. Decisión final. | ~1h |

### FASE 5: AUDITORÍA POSTERIOR (Día 5-6)
> Módulo nuevo para facturación + HC

| # | Tarea | Detalle | Estimación |
|---|-------|---------|------------|
| 5.1 | **Diseño del módulo** | El prestador presenta factura + historias clínicas → se cruza contra autorizaciones emitidas → se detectan diferencias → se generan débitos o se aprueba el pago. | Diseñar primero |
| 5.2 | **Migración SQL** | Tabla `post_audits` (vincula invoice + authorization + expedient), `post_audit_items` (detalle línea a línea), `debit_notes` (notas de débito). | ~1h |
| 5.3 | **Servicio + IA** | Cruce automático: ¿la factura coincide con lo autorizado? IA sugiere inconsistencias: montos distintos, prácticas no autorizadas, cantidades mayores, fechas fuera de vigencia. | ~3h |
| 5.4 | **UI de auditoría posterior** | Pantalla donde el auditor ve factura vs autorizaciones, con marcas de la IA, y confirma/ajusta débitos. | ~3h |

### FASE 6: REPORTES Y ESTADÍSTICAS (Día 6-7)
> Dashboard de control

| # | Tarea | Detalle | Estimación |
|---|-------|---------|------------|
| 6.1 | **Dashboard de auditoría** | Métricas: total expedientes, tasa de aprobación/denegación, tiempo promedio de resolución, expedientes por tipo/estado, productividad por auditor. Gráficos interactivos. | ~3h |
| 6.2 | **Reportes exportables** | PDF/Excel: expedientes por período, autorizaciones emitidas, débitos generados, consumos por afiliado/prestador. | ~2h |

### FASE 7: NOTIFICACIONES + PORTAL AFILIADO (Futuro)
> Se planifica pero no se implementa aún

| # | Tarea | Detalle |
|---|-------|---------|
| 7.1 | Notificaciones email | Cambio de estado → email al administrativo/afiliado |
| 7.2 | Portal web afiliado | El afiliado puede ver estado de sus solicitudes, subir documentación |
| 7.3 | Push notifications | Alertas en tiempo real en la app |

---

## RESUMEN EJECUTIVO

```
Día 1-2: SQL + Tipos + Servicio + Motor de Reglas     (FUNDAMENTOS)
Día 2-3: Formulario de carga del expediente            (UI CARGA)
Día 3-4: Bandeja del auditor + resoluciones            (UI AUDITORÍA)
Día 4-5: Constancias + Observaciones + Mesa control    (POST-RESOLUCIÓN)
Día 5-6: Auditoría posterior de facturación             (MÓDULO NUEVO)
Día 6-7: Dashboard + Reportes                          (CONTROL)
```

**Total estimado: ~35 horas de desarrollo**

El motor de reglas y la auditoría posterior son las piezas más complejas.
Todo lo demás es UI + CRUD que sigue patrones ya establecidos en la app.

---

*Documento creado: 03/03/2026*
*Autor: GitHub Copilot*
*Versión: 2.0 — Decisiones tomadas, plan de trabajo definido*
*Próximo paso: Implementar Fase 1 (mañana)*
