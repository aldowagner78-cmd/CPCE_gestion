# 5. SUGERENCIAS DE MEJORA PROACTIVA

> 3 funcionalidades avanzadas priorizadas por impacto y viabilidad técnica.

---

## Mejora 1: Exportación PDF de Informe de Auditoría

### Descripción
Generar un documento PDF profesional con el resultado de la auditoría de cobertura, incluyendo: datos del afiliado, práctica auditada, resultado del motor, observaciones, firma digital del auditor y fecha/hora.

### Valor de Negocio
- Elimina procesos manuales en Word/Excel para documentar auditorías.
- Genera trazabilidad legal de cada decisión de cobertura.
- Acelera la comunicación con prestadores y afiliados.

### Implementación Técnica

```
Librería: @react-pdf/renderer (para generación client-side)
   o bien: puppeteer (para server-side rendering con Next.js API Routes)

Recomendación: @react-pdf/renderer (sin dependencia de servidor)
```

**Estructura del PDF:**

```
┌─────────────────────────────────────────────┐
│ LOGO CPCE          INFORME DE AUDITORÍA     │
│                    N° 2026-00142             │
├─────────────────────────────────────────────┤
│ DATOS DEL AFILIADO                          │
│ Nombre: Juan Pérez                          │
│ DNI: 20.123.456 | Plan: General | Cámara I  │
├─────────────────────────────────────────────┤
│ PRÁCTICA AUDITADA                           │
│ 42.01.01 - CONSULTA MÉDICA DIURNA           │
│ Valor: $10,500.00 | Categoría: Consultas    │
├─────────────────────────────────────────────┤
│ RESULTADO                                   │
│ ✅ APROBADA | Cobertura: 100%               │
│ Monto cubierto: $10,500.00                  │
│ Copago: $0.00                               │
├─────────────────────────────────────────────┤
│ OBSERVACIONES                               │
│ Sin observaciones.                          │
├─────────────────────────────────────────────┤
│ Auditor: Admin Sistema                      │
│ Fecha: 08/02/2026 14:30hs                    │
│ Firma: ________________                     │
└─────────────────────────────────────────────┘
```

**Esfuerzo estimado:** 2-3 días de desarrollo.

**Dependencias a instalar:**
```bash
npm install @react-pdf/renderer
```

### Integración en la App
- Agregar botón "Exportar PDF" en el panel de resultados de la Calculadora.
- Crear componente `AuditReport.tsx` con el template del PDF.
- Registrar cada exportación como "auditoría completada" en la base de datos.

---

## Mejora 2: Sistema de Alertas de Desvíos Presupuestarios

### Descripción
Dashboard inteligente que detecta anomalías en el consumo de prestaciones por afiliado, prestador o categoría, y genera alertas automáticas cuando se exceden umbrales configurables.

### Valor de Negocio
- Detección temprana de sobreprestación o fraude.
- Control presupuestario por cámara y por período.
- Cumplimiento de regulaciones de auditoría médica.

### Tipos de Alertas

| Tipo | Trigger | Ejemplo |
|------|---------|---------|
| **Frecuencia** | Afiliado excede N prácticas/mes en una categoría | >4 consultas de Salud Mental en un mes |
| **Monto** | Gasto acumulado de un afiliado supera umbral | >$500,000 en 3 meses |
| **Prestador** | Un prestador factura fuera del rango normal | Facturación 3x superior al promedio |
| **Categoría** | Incremento interanual >30% en una categoría | Cirugías +40% vs. mismo mes del año anterior |

### Implementación Técnica

```typescript
// Nuevo modelo: AlertRule
type AlertRule = {
  id: number;
  name: string;
  type: 'frequency' | 'amount' | 'provider' | 'category';
  threshold: number;
  period_months: number;
  jurisdiction_id: number;
  severity: 'info' | 'warning' | 'critical';
  is_active: boolean;
}

// Nuevo modelo: Alert (generada automáticamente)
type Alert = {
  id: number;
  rule_id: number;
  affiliate_id?: number;
  description: string;
  detected_value: number;
  threshold_value: number;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'reviewed' | 'dismissed';
  created_at: string;
}
```

**Visualización sugerida:**
- Badge rojo en el ícono de campana del Header (ya existe el placeholder).
- Panel dedicado en `/alerts` con tabla filtrable por severidad.
- Widget en el Dashboard con top 5 alertas activas.

**Esfuerzo estimado:** 5-7 días de desarrollo.

---

## Mejora 3: Módulo de Historial y Trazabilidad de Auditorías

### Descripción
Sistema completo de registro, consulta y seguimiento de todas las auditorías realizadas, con estados, timestamps, auditor asignado y capacidad de re-auditar.

### Valor de Negocio
- Trazabilidad completa requerida por normativas de salud.
- Métricas reales para el Dashboard (reemplaza datos estáticos actuales).
- Base para reportes mensuales y anuales.
- Permite auditoría de los auditores (meta-auditoría).

### Modelo de Datos

```typescript
type Audit = {
  id: number;
  // Referencias
  affiliate_id: number;
  practice_id: number;
  plan_id: number;
  jurisdiction_id: number;
  // Resultado del motor
  coverage_result: CoverageResult; // JSONB
  // Estado del flujo
  status: 'pending' | 'approved' | 'rejected' | 'partial' | 'requires_auth';
  // Trazabilidad
  auditor_id: string; // FK → UserProfile
  notes: string;
  authorization_code?: string;
  // Timestamps
  created_at: string;
  reviewed_at?: string;
  updated_at: string;
}
```

### Flujo de Trabajo

```
1. Auditor ejecuta cálculo en Calculadora
          ↓
2. Resultado se muestra en pantalla
          ↓
3. Auditor presiona "Registrar Auditoría"
          ↓
4. Se crea registro con status = 'pending' (o auto-approved si cumple criterios)
          ↓
5. Si requiere autorización → status = 'requires_auth'
          ↓
6. Supervisor revisa en `/audits` → Aprueba/Rechaza
          ↓
7. Se actualiza status + reviewed_at + authorization_code
```

### Pantallas Nuevas

- `/audits` — Lista de todas las auditorías con filtros (estado, fecha, cámara, afiliado).
- `/audits/[id]` — Detalle de una auditoría individual con timeline de cambios.
- Modificar `/calculator` para agregar botón "Registrar Auditoría" post-cálculo.
- Modificar Dashboard para mostrar contadores reales en lugar de ceros.

**Esfuerzo estimado:** 7-10 días de desarrollo.

---

## Matriz Comparativa

| Criterio | PDF Export | Alertas Presupuestarias | Historial Auditorías |
|----------|-----------|------------------------|---------------------|
| Impacto en usuario | ⭐⭐⭐ Alto | ⭐⭐⭐ Alto | ⭐⭐⭐⭐ Muy Alto |
| Complejidad | ⭐⭐ Media | ⭐⭐⭐ Alta | ⭐⭐⭐ Alta |
| Esfuerzo (días) | 2-3 | 5-7 | 7-10 |
| Dependencias externas | @react-pdf | Ninguna | Supabase tables |
| Prerequisito | Ninguno | Historial de auditorías | Ninguno |
| **Prioridad recomendada** | **2° (Quick Win)** | **3° (necesita datos)** | **1° (fundacional)** |

### Orden de Implementación Recomendado

```
SPRINT 1 (Semana 1-2):  Historial de Auditorías ← FUNDACIONAL
SPRINT 2 (Semana 3):    Exportación PDF          ← QUICK WIN
SPRINT 3 (Semana 4-5):  Alertas Presupuestarias  ← AVANZADO
```

> El Historial de Auditorías es fundacional porque habilita todas las demás funcionalidades: sin datos históricos, no hay alertas que generar, no hay PDFs que exportar, y el Dashboard seguirá mostrando ceros.
