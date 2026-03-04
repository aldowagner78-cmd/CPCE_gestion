# 1. AUDITORÍA DE CÓDIGO E UX — Suite Integral CPCE Salud

> Fecha de revisión: 8 de febrero de 2026  
> Versión analizada: v1.0.0-alpha

---

## 1.1 Resumen Ejecutivo

La aplicación presenta una arquitectura sólida basada en Next.js 16 (App Router), con separación clara entre capas (tipos, servicios, motor lógico, UI). El diseño visual sigue el estilo "Auditor-IA" con éxito. Sin embargo, se detectan **puntos críticos** en la lógica de negocio, inconsistencias de datos entre capas y oportunidades de mejora en accesibilidad y rendimiento.

---

## 1.2 Hallazgos Críticos

### BUG-01: Valores financieros inconsistentes entre API Route y Mock Data

| Archivo | Práctica | Valor |
|---------|----------|-------|
| `src/lib/mockData.ts` | Consulta Médica (C1) | `$10,500` |
| `src/app/api/practices/route.ts` | Consulta Médica (C1) | `$10.50` |
| `src/lib/mockData.ts` | Cesárea (C1) | `$150,000` |
| `src/app/api/practices/route.ts` | Cesárea (C1) | `$150.00` |

**Impacto:** Si algún componente consume la API Route en lugar del mock centralizado, los cálculos de cobertura serán incorrectos por un factor de ~1000x.

**Solución:** Eliminar los datos duplicados en `route.ts` y que la API Route importe desde `mockData.ts`, o unificar la fuente de verdad.

---

### BUG-02: `category` es opcional en el tipo `Practice` pero obligatorio en el motor

```typescript
// database.ts → Practice.category es opcional
category?: string

// coverageEngine.ts → Se compara directamente sin null-check
if (practice.category === 'Cirugía' || practice.category === 'Alta Complejidad') {
```

**Impacto:** Si una práctica no tiene categoría asignada, el motor **nunca** requerirá autorización, incluso si debería. No genera error de runtime, pero causa un **fallo silencioso en reglas de negocio**.

**Solución:** Hacer `category` obligatorio en el tipo, o agregar un fallback explícito:
```typescript
const cat = practice.category ?? 'General';
if (cat === 'Cirugía' || cat === 'Alta Complejidad') { ... }
```

---

### BUG-03: `plan.rules` es `Record<string, any>` — Sin tipado seguro

El tipo `Plan.rules` es genérico (`Record<string, any>`), lo que permite acceder a propiedades inexistentes sin error de compilación:

```typescript
const waitingPeriodMonths = plan.rules.waiting_period_months || 0;
// Si se escribe mal: plan.rules.waiting_period_month → undefined → 0 → sin carencia
```

**Impacto:** Cualquier typo en las claves de reglas pasará desapercibido, produciendo resultados de cobertura incorrectos.

**Solución:** Definir una interfaz tipada:
```typescript
export type PlanRules = {
  coverage_percent: number;
  waiting_period_months?: number;
  category_overrides?: Record<string, number>; // Para excepciones por categoría
  max_sessions_per_year?: Record<string, number>; // Ej: Salud Mental
  authorization_required_categories?: string[];
}

export type Plan = {
  id: number;
  name: string;
  jurisdiction_id: number;
  rules: PlanRules; // ← Tipado fuerte
  created_at: string;
}
```

---

### BUG-04: Cálculo de carencia no considera años bisiestos ni edge cases

```typescript
let months = (today.getFullYear() - startDate.getFullYear()) * 12;
months -= startDate.getMonth();
months += today.getMonth();
if (today.getDate() < startDate.getDate()) { months--; }
```

**Impacto:** El cálculo es razonablemente correcto para la mayoría de casos, pero falla en edge cases:
- Si `start_date` es el 31 de enero y hoy es 28 de febrero, el resultado puede ser 0 meses cuando debería ser 1.
- No valida que `start_date` sea una fecha válida.

**Solución recomendada:** Usar una función auxiliar robusta o la librería `date-fns`:
```typescript
import { differenceInMonths } from 'date-fns';
const months = differenceInMonths(new Date(), new Date(affiliate.start_date));
```

---

## 1.3 Puntos Ciegos en Reglas de Negocio

### RN-01: Sin excepciones por categoría en cobertura
El motor aplica un **porcentaje plano** (`coverage_percent`) a todas las prácticas. No hay lógica para:
- Planes que cubren 100% consultas pero 80% cirugías.
- Topes máximos de cobertura por categoría.
- Límites de sesiones (ej: Salud Mental — máximo 20 sesiones/año).

El código tiene un comentario `// Future: Check for specific practice category overrides` pero no está implementado.

### RN-02: Sin validación de estado del afiliado
No se verifica si el afiliado está **activo, suspendido o dado de baja**. El tipo `Affiliate` no incluye un campo `status`.

### RN-03: Sin diferenciación de prestadores
No hay concepto de "prestador" (médico/clínica). En auditoría real, la cobertura puede variar según si el prestador está en cartilla o es "fuera de cartilla".

### RN-04: Sin historial de auditorías
El Dashboard muestra contadores en cero y "Sin auditorías". No existe modelo de datos para almacenar resultados de auditoría, lo cual es crítico para el flujo completo.

### RN-05: Categoría 'Alta Complejidad' está en el motor pero no en los datos mock
El `coverageEngine.ts` verifica `practice.category === 'Alta Complejidad'`, pero ninguna práctica en `mockData.ts` tiene esa categoría. Esto hace imposible probar esa rama del código con los datos actuales.

---

## 1.4 Hallazgos de UX / Accesibilidad

### UX-01: Sidebar tiene rutas sin implementar
El Sidebar define 10+ rutas (`/patients`, `/nomenclators`, `/protocols`, `/matcher`, `/audits`, `/pending`, `/users`, `/backup`, `/settings`), pero solo `/`, `/calculator` y `/practices` tienen páginas. Al hacer clic en las demás, Next.js mostrará un 404.

**Solución:** Crear páginas placeholder (`coming-soon`) o deshabilitar visualmente los links sin destino.

### UX-02: Nomenclador en Sidebar apunta a `/nomenclators`, pero la página existe en `/practices`
El menú del Sidebar define `{ name: "Nomencladores", href: "/nomenclators" }`, pero la página del nomenclador está en `src/app/practices/page.tsx`.

### UX-03: Header muestra título estático "Dashboard"
El Header siempre dice "Dashboard" sin importar la página activa. Debería reflejar la ruta actual.

### UX-04: Sin feedback de carga al calcular cobertura
El botón "Calcular Cobertura" no muestra estado de carga. Con datos reales y latencia de red, el usuario no sabrá si la acción se procesó.

### UX-05: Gráficos del dashboard usan datos estáticos
`Charts.tsx` tiene datos hardcodeados que no se conectan con ningún estado real ni responden al cambio de jurisdicción.

### UX-06: Falta estado vacío diferenciado
Cuando no hay resultados en el buscador de prácticas, se muestra un texto simple. Con muchas prácticas, sería útil paginación.

### UX-07: Select nativo sin accesibilidad ARIA
Los `<select>` en la calculadora usan elementos HTML nativos sin labels asociados con `htmlFor`/`id`.

### UX-08: Card de "Últimas Auditorías" usa `absolute` dentro de contenedor relativo
```tsx
<div className="flex w-full justify-between items-start absolute top-6 px-6">
```
Este `absolute` puede causar overlap con el contenido si el contenedor cambia de tamaño.

---

## 1.5 Rendimiento

| Área | Estado | Nota |
|------|--------|------|
| Filtrado con `useMemo` | ✅ Correcto | Tanto Calculator como Practices usan `useMemo` para filtrar datos |
| Bundle size (Recharts) | ⚠️ Vigilar | Recharts importa todo; con tree-shaking debería estar OK |
| Imágenes | ⚠️ `<img>` nativo | Sidebar usa `<img>` en lugar de `next/image` — sin lazy loading ni optimización |
| API Route con mock duplicado | ⚠️ Redundante | `route.ts` duplica datos que ya están en `mockData.ts` |
| `DataService` no utilizado | ⚠️ Código muerto | `services/api.ts` define un servicio completo pero ningún componente lo consume |

---

## 1.6 Seguridad

- **Variables de entorno Supabase:** `supabase.ts` usa `process.env.NEXT_PUBLIC_SUPABASE_URL!` con non-null assertion. Si no están definidas, la app crasheará en runtime.
- **Sin autenticación:** No hay middleware ni protección de rutas. El tipo `UserProfile` existe pero no se usa.
- **API Route sin rate limiting ni validación:** La API de prácticas acepta cualquier query sin sanitización.

---

## 1.7 Matriz de Prioridades

| # | Hallazgo | Severidad | Esfuerzo | Prioridad |
|---|----------|-----------|----------|-----------|
| BUG-01 | Valores inconsistentes API/Mock | 🔴 Alta | Bajo | P0 |
| BUG-02 | Category opcional vs. obligatorio | 🔴 Alta | Bajo | P0 |
| BUG-03 | Rules sin tipado | 🟡 Media | Medio | P1 |
| BUG-04 | Cálculo de meses edge cases | 🟡 Media | Bajo | P1 |
| RN-01 | Sin excepciones por categoría | 🔴 Alta | Alto | P1 |
| RN-02 | Sin estado de afiliado | 🟡 Media | Medio | P1 |
| RN-05 | Alta Complejidad sin datos | 🟡 Media | Bajo | P1 |
| UX-02 | Ruta Nomenclador incorrecta | 🟡 Media | Bajo | P0 |
| UX-01 | Rutas sin páginas | 🟡 Media | Medio | P2 |
| UX-03 | Header estático | 🟢 Baja | Bajo | P2 |
