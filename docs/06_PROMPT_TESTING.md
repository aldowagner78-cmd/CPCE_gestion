# PROMPT PARA TESTING INTEGRAL — CPCE Salud v1.0

Sos un QA Engineer experto. Tu tarea es ejecutar pruebas exhaustivas sobre la aplicación "Suite Integral CPCE Salud", una app Next.js de auditoría médica. El workspace está en `c:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app`.

## STACK TÉCNICO
- **Next.js 16.1.6** (App Router, Turbopack)
- **React 19.2.3** con `useSyncExternalStore` para stores reactivos
- **Tailwind CSS v4** (`@tailwindcss/postcss`, directiva `@theme`)
- **Recharts 3.7** (gráficos en Dashboard)
- **Lucide React** (iconografía)
- **Supabase SSR** configurado pero NO conectado (`USE_MOCK_DATA = true` en `src/services/api.ts`)
- No hay test runner instalado (ni Jest ni Vitest). Las pruebas deben ser **manuales vía `npm run dev`** y/o **scripts TypeScript** que se ejecuten con `npx tsx`.

## FUENTE DE DATOS
- **`src/lib/mockData.ts`** es la ÚNICA fuente de verdad. Contiene:
  - 5 afiliados (3 en jurisdicción 1 / Santa Fe, 2 en jurisdicción 2 / Rosario)
  - 5 planes (`General`, `Premium`, `Básico`, `Integral`, `Corporativo`)
  - 8 prácticas (6 estándar + 2 de Alta Complejidad: ids 7 y 8)
- **`src/services/auditService.ts`** — Store en memoria de auditorías (se vacía al recargar)
- **`src/services/alertService.ts`** — Store en memoria de alertas con 4 reglas predefinidas

## ARQUITECTURA CLAVE
- **JurisdictionContext**: React Context que alterna entre Cámara I (Santa Fe, id=1, theme azul) y Cámara II (Rosario, id=2, theme esmeralda). Toggle en el Header.
- **coverageEngine.ts**: Motor de cálculo con: validación de estado del afiliado, carencia (`waiting_period_months`), `category_overrides` del plan, autorización por categoría (`authorization_required_categories` con fallback a `['Cirugía', 'Alta Complejidad']`).
- **auditPDF.ts**: Generador HTML→Print (abre ventana del navegador con `window.print()`, zero dependencies).
- **alertService.ts**: Motor que evalúa 4 reglas contra auditorías: frecuencia (>4 consultas/mes), monto acumulado (>$500k/3 meses), cirugías frecuentes (>2/6 meses), gasto por categoría (>$1M/mes). Se ejecuta automáticamente tras cada `AuditService.create()`.

## PÁGINAS DE LA APP (17 rutas)

| Ruta | Tipo | Descripción |
|------|------|-------------|
| `/` | Dashboard | StatusPills reactivos, acciones rápidas (links), widget alertas, tabla últimas 5 auditorías |
| `/calculator` | Calculadora | Selects de afiliado/práctica filtrados por jurisdicción, botón calcular, panel resultado, botón "Registrar Auditoría", botón "Exportar PDF" post-registro |
| `/audits` | Historial | Contadores clickeables, búsqueda, tabla completa, acciones Aprobar/Rechazar, ícono PDF por fila |
| `/alerts` | Alertas | Contadores por severidad, panel de reglas (toggle on/off), lista filtrable, acciones Revisar/Descartar |
| `/practices` | Nomenclador | Tabla de prácticas con búsqueda y filtro por categoría |
| `/patients` | Placeholder | Próximamente |
| `/protocols` | Placeholder | Próximamente |
| `/matcher` | Placeholder | Próximamente |
| `/pending` | Placeholder | Próximamente |
| `/users` | Placeholder | Próximamente |
| `/backup` | Placeholder | Próximamente |
| `/settings` | Placeholder | Próximamente |
| `/help` | Ayuda | Manual interactivo con secciones colapsables y búsqueda |
| `/api/practices` | API | GET con query params `q` (búsqueda) y `jurisdiction_id` (filtro) |

---

## PLAN DE PRUEBAS

### GRUPO 1: BUILD Y ESTRUCTURA

**T1.1 — Build limpio**
```bash
npm run build
```
- Esperado: 17/17 páginas, 0 errores TypeScript, compiled successfully.

**T1.2 — Verificar todas las rutas existen**
- Confirmar que el output del build lista: `/`, `/alerts`, `/api/practices`, `/audits`, `/backup`, `/calculator`, `/help`, `/matcher`, `/patients`, `/pending`, `/practices`, `/protocols`, `/settings`, `/users`, `/_not-found`.

**T1.3 — Lint**
```bash
npm run lint
```
- Esperado: Sin errores bloqueantes.

---

### GRUPO 2: MOTOR DE COBERTURA (`coverageEngine.ts`)

Crear un script `scripts/testCoverage.ts` (o usar el existente) y ejecutar con `npx tsx scripts/testCoverage.ts`.

**T2.1 — Afiliado activo, práctica Consultas, Plan General (Cámara I)**
- Afiliado: Juan Pérez (id 1), Plan General (coverage_percent: 80, waiting_period_months: 3)
- Práctica: 42.01.01 Consulta Médica Diurna ($10,500)
- Juan tiene `start_date: '2024-01-15'`, más de 3 meses → SIN carencia
- Esperado: `covered: true`, `percentage: 80`, `coveredAmount: 8400`, `copay: 2100`, `authorizationRequired: false`

**T2.2 — Afiliado activo, práctica Cirugía (requiere autorización)**
- Afiliado: Juan Pérez (id 1), Plan General
- Práctica: 42.04.01 Cirugía Menor ($85,000) — categoría "Cirugía"
- Esperado: `covered: true`, `percentage: 80`, `authorizationRequired: true`, `messages` incluye "Requiere autorización"

**T2.3 — Afiliado con plan Premium + category_overrides**
- Afiliado: María García (id 2), Plan Premium (coverage_percent: 100, category_overrides: { "Consultas": 100, "Cirugía": 90 })
- Práctica Cirugía Menor: esperado `percentage: 90` (no 100, porque override de Cirugía es 90)
- Práctica Consulta Diurna: esperado `percentage: 100` (override de Consultas es 100)

**T2.4 — Afiliado en carencia**
- Crear test con afiliado cuyo `start_date` sea hace menos de `waiting_period_months`
- Esperado: `covered: false`, `messages` incluye "carencia"

**T2.5 — Afiliado suspendido**
- Usar un afiliado con `status: 'suspendido'` (si no hay en mockData, crear uno en el test)
- Esperado: `covered: false`, `messages` incluye "no está activo"

**T2.6 — Afiliado dado de baja**
- `status: 'baja'`
- Esperado: `covered: false`

**T2.7 — `getMonthsDifference` edge cases**
- Misma fecha → 0 meses
- Fecha fin antes de fecha inicio → 0 meses
- Fecha inválida → 0 meses
- 31 enero a 28 febrero → 0 meses (no completó el mes)
- 15 enero a 16 febrero → 1 mes

**T2.8 — Alta Complejidad requiere autorización**
- Práctica id 7 u 8 (Cirugía Cardiovascular, categoría "Alta Complejidad")
- Esperado: `authorizationRequired: true`

**T2.9 — Plan con `authorization_required_categories` custom**
- Crear plan de test con `rules.authorization_required_categories: ['Consultas']`
- Esperado: Consultas requiere auth, Cirugía NO requiere auth (override del default)

---

### GRUPO 3: SERVICIO DE AUDITORÍAS (`auditService.ts`)

**T3.1 — Crear auditoría aprobada**
- `AuditService.create(affiliate, plan, practice, resultAprobado)`
- Donde `resultAprobado = { covered: true, percentage: 100, coveredAmount: X, copay: 0, authorizationRequired: false, messages: [] }`
- Esperado: record con `status: 'approved'`

**T3.2 — Crear auditoría rechazada**
- Resultado con `covered: false`
- Esperado: `status: 'rejected'`

**T3.3 — Crear auditoría que requiere autorización**
- Resultado con `covered: true, authorizationRequired: true`
- Esperado: `status: 'requires_auth'`

**T3.4 — Crear auditoría parcial**
- Resultado con `covered: true, copay > 0, authorizationRequired: false`
- Esperado: `status: 'partial'`

**T3.5 — Actualizar estado**
- Crear auditoría pending → `updateStatus(id, 'approved')`
- Esperado: `status: 'approved'`, `reviewed_at` no es undefined

**T3.6 — getAll filtra por jurisdicción**
- Crear 2 auditorías en jurisdicción 1 y 1 en jurisdicción 2
- `getAll(1)` → 2 resultados, `getAll(2)` → 1 resultado, `getAll()` → 3

**T3.7 — getById**
- Crear auditoría, recuperar por ID → coincide
- ID inexistente → `null`

**T3.8 — getStatusCounts**
- Crear mix de auditorías → verificar que los conteos coinciden

---

### GRUPO 4: SERVICIO DE ALERTAS (`alertService.ts`)

**T4.1 — Sin auditorías, evaluate no genera alertas**
- `AlertService.evaluate()` con store vacío
- `AlertService.getAll()` → []

**T4.2 — Alerta de frecuencia (regla 1: >4 consultas/mes)**
- Crear 5 auditorías aprobadas del mismo afiliado en el último mes
- `AlertService.evaluate()`
- Esperado: 1 alerta generada con `severity: 'warning'`, `rule_id: 1`

**T4.3 — Alerta de monto acumulado (regla 2: >$500k/3 meses)**
- Crear auditorías cuyo `covered_amount` sume >$500,000 para un afiliado
- Esperado: 1 alerta `severity: 'critical'`, `rule_id: 2`

**T4.4 — No duplicar alertas activas**
- Evaluar 2 veces → debe tener solo 1 alerta (no duplicada)

**T4.5 — Regla desactivada no genera alertas**
- `AlertService.toggleRule(1)` (desactiva regla 1)
- Evaluar → no debe generar alerta de frecuencia
- `AlertService.toggleRule(1)` (reactiva)

**T4.6 — updateStatus de alerta**
- Generar alerta → `updateStatus(id, 'reviewed')` → `status: 'reviewed'`, `reviewed_at` no undefined
- `updateStatus(id, 'dismissed')` → `status: 'dismissed'`

**T4.7 — getActiveCounts**
- Generar mix de alertas → verificar conteos por severidad

**T4.8 — Alertas se generan automáticamente al registrar auditoría**
- Registrar 5+ auditorías del mismo afiliado vía `AuditService.create()`
- Verificar que `AlertService.getAll()` tiene alertas sin llamar `evaluate()` manualmente (se llama internamente)

---

### GRUPO 5: API ROUTE (`/api/practices`)

**T5.1 — GET sin parámetros**
```bash
curl http://localhost:3000/api/practices
```
- Esperado: JSON con las 8 prácticas

**T5.2 — Filtro por jurisdicción**
```bash
curl "http://localhost:3000/api/practices?jurisdiction_id=1"
```
- Esperado: solo prácticas con `jurisdiction_id: 1` (4 prácticas)

**T5.3 — Búsqueda por texto**
```bash
curl "http://localhost:3000/api/practices?q=consulta"
```
- Esperado: prácticas cuyo `description` o `code` contenga "consulta" (case-insensitive)

**T5.4 — Filtro combinado**
```bash
curl "http://localhost:3000/api/practices?q=cirugia&jurisdiction_id=2"
```

---

### GRUPO 6: UI — NAVEGACIÓN Y LAYOUT

Ejecutar `npm run dev` y probar en navegador.

**T6.1 — Sidebar tiene todos los links**
- PRINCIPAL: Dashboard, Pacientes
- CATÁLOGOS: Nomencladores, Protocolos, Homologador
- GESTIÓN: Auditorías, Alertas, Calculadora
- SISTEMA: Pendientes, Usuarios, Backup/Sync, Configuración, Ayuda

**T6.2 — Cada link navega a su ruta correcta**
- Verificar que TODOS los 14 links del Sidebar navegan correctamente

**T6.3 — Active state en Sidebar**
- Al estar en `/calculator`, el link "Calculadora" debe tener fondo naranja y borde izquierdo

**T6.4 — Header muestra título dinámico**
- En `/` → "Dashboard"
- En `/calculator` → "Calculadora de Cobertura"
- En `/audits` → "Auditorías"
- En `/alerts` → "Alertas Presupuestarias"
- En `/help` → "Centro de Ayuda"

**T6.5 — Jurisdiction Toggle**
- Cámara I (Santa Fe) = tema azul
- Cámara II (Rosario) = tema esmeralda
- Cambiar jurisdicción y verificar que los colores del theme cambian globalmente

**T6.6 — Placeholders**
- `/patients`, `/protocols`, `/matcher`, `/pending`, `/users`, `/backup`, `/settings` → todas muestran "Próximamente" con el componente PlaceholderPage

---

### GRUPO 7: UI — CALCULADORA (`/calculator`)

**T7.1 — Selects filtran por jurisdicción**
- En Cámara I: deben verse 3 afiliados y 4 prácticas
- Cambiar a Cámara II: deben verse 2 afiliados y 4 prácticas
- Los selects se resetean al cambiar jurisdicción

**T7.2 — Botón calcular deshabilitado sin selección**
- Sin afiliado o sin práctica seleccionada → botón disabled

**T7.3 — Cálculo muestra resultado correcto**
- Seleccionar Juan Pérez + Consulta Médica Diurna → resultado APROBADA, 80%, copago $2,100

**T7.4 — Resultado RECHAZADA se muestra en rojo**
- Simular un caso rechazado (afiliado en carencia, si hay) → badge rojo

**T7.5 — Observaciones muestran autorización**
- Seleccionar práctica de Cirugía → panel amarillo con "Requiere autorización previa"

**T7.6 — Registrar Auditoría**
- Calcular → hacer click en "Registrar Auditoría" → aparece confirmación verde "Auditoría registrada correctamente"
- El botón desaparece y es reemplazado por la confirmación

**T7.7 — Exportar PDF post-registro**
- Después de registrar → aparece botón "Exportar PDF"
- Click → abre ventana nueva con el informe formateado y diálogo de impresión

**T7.8 — Loading spinner**
- Al calcular, debe verse brevemente un spinner con texto "Calculando..."

**T7.9 — ARIA labels**
- Los selects deben tener `aria-label` y los labels deben tener `htmlFor` que coincida con el `id` del select

---

### GRUPO 8: UI — AUDITORÍAS (`/audits`)

**T8.1 — Estado inicial vacío**
- Sin auditorías registradas → mensaje "Sin auditorías" con instrucciones

**T8.2 — Registrar desde calculadora y verificar en /audits**
- Ir a `/calculator` → calcular → registrar → ir a `/audits` → debe aparecer en la tabla

**T8.3 — Contadores reactivos**
- Registrar varias auditorías con distintos estados → los 5 contadores (Aprobada, Rechazada, Parcial, Pendiente, Req. Autorización) se actualizan

**T8.4 — Filtro por estado (clickando contadores)**
- Click en "Aprobada" → tabla muestra solo aprobadas
- Click de nuevo → quita filtro

**T8.5 — Búsqueda**
- Buscar por nombre de afiliado → filtra
- Buscar por DNI → filtra
- Buscar por código de práctica → filtra

**T8.6 — Acciones: Aprobar/Rechazar**
- Auditoría con status `pending` o `requires_auth` muestra botones Aprobar/Rechazar
- Click en Aprobar → status cambia a "Aprobada", botones desaparecen, muestra "Revisada"
- Auditoría aprobada directamente NO muestra botones de acción

**T8.7 — Botón PDF por fila**
- Cada fila tiene un ícono de descarga (FileDown)
- Click → abre ventana de impresión con el informe de esa auditoría

**T8.8 — Conteo inferior**
- Texto "Mostrando X de Y auditorías" con números correctos

---

### GRUPO 9: UI — ALERTAS (`/alerts`)

**T9.1 — Estado inicial vacío**
- Sin auditorías → mensaje "Sin alertas" con botón "Evaluar Reglas"

**T9.2 — Generar alertas mediante auditorías**
- Ir a `/calculator`, registrar 5+ auditorías del mismo afiliado (misma práctica)
- Ir a `/alerts` → debe haber al menos 1 alerta de frecuencia

**T9.3 — Contadores por severidad**
- 4 cards: Total Activas, Crítica, Advertencia, Informativa
- Valores coinciden con alertas generadas

**T9.4 — Filtro por severidad (click en cards)**
- Click en "Crítica" → solo muestra alertas critical
- Click de nuevo → quita filtro

**T9.5 — Filtro por estado (dropdown)**
- "Activas" / "Revisadas" / "Descartadas" / "Todos los estados"

**T9.6 — Búsqueda de alertas**
- Por descripción, nombre de afiliado, nombre de regla

**T9.7 — Acciones: Revisar / Descartar**
- Alerta activa → click "Revisar" → status cambia a "Revisada"
- Alerta activa → click "Descartar" → status cambia a "Descartada"
- Botones desaparecen después de actuar

**T9.8 — Panel de Reglas**
- Click en botón "Reglas" (header) → muestra las 4 reglas predefinidas
- Cada regla muestra: nombre, descripción, severidad, umbral, período
- Toggle on/off funciona

**T9.9 — Evaluar Reglas manualmente**
- En el panel de reglas, botón "Evaluar Reglas Ahora" → ejecuta evaluación

---

### GRUPO 10: UI — DASHBOARD (`/`)

**T10.1 — StatusPills muestran contadores reales**
- Registrar auditorías → volver al Dashboard → pills muestran los conteos correctos (no ceros)

**T10.2 — Acciones Rápidas navegan**
- "Nuevo Paciente" → `/patients`
- "Nueva Auditoría" → `/calculator`
- "Calculadora" → `/calculator`

**T10.3 — Últimas Auditorías**
- Sin auditorías → "Sin auditorías" (empty state)
- Con auditorías → tabla con las últimas 5, columnas: Afiliado, Práctica, Cobertura, Estado (badge color), Fecha

**T10.4 — "Ver todas" navega a /audits**

**T10.5 — Widget Alertas Presupuestarias**
- Sin alertas → mensaje "Sin alertas activas"
- Con alertas → muestra hasta 3 alertas con ícono de severidad y colores
- "Ver todas" → navega a `/alerts`

**T10.6 — Badge de alertas en Header**
- Bell icon en Header → si hay alertas activas, muestra número rojo
- Si no hay → dot gris
- Click en bell → navega a `/alerts`

**T10.7 — Reactividad cross-page**
- Registrar auditoría en `/calculator` → ir a `/` → StatusPills actualizados, tabla muestra la auditoría, widget alertas puede mostrar nueva alerta

---

### GRUPO 11: UI — NOMENCLADOR (`/practices`)

**T11.1 — Lista todas las prácticas de la jurisdicción activa**
**T11.2 — Búsqueda por código o descripción funciona**
**T11.3 — Filtro por categoría funciona**
**T11.4 — Cambiar jurisdicción actualiza la lista**

---

### GRUPO 12: UI — AYUDA (`/help`)

**T12.1 — Todas las secciones del manual están presentes**
**T12.2 — Secciones son colapsables (click para expandir/contraer)**
**T12.3 — Búsqueda filtra secciones por contenido**

---

### GRUPO 13: PDF EXPORT

**T13.1 — Contenido del PDF tiene todos los campos**
- Cabecera CPCE con número de informe (formato YYYY-NNNNN)
- Sección "Datos del Afiliado": nombre, DNI, plan, jurisdicción
- Sección "Práctica Auditada": código, descripción, categoría, valor
- Banner de resultado: status con color, cobertura %, monto cubierto, copago
- Observaciones (si aplica): autorización requerida, mensajes del motor
- Sección "Trazabilidad": auditor, fecha creación, fecha revisión, código autorización
- Footer con firma

**T13.2 — PDF de auditoría aprobada muestra verde**
**T13.3 — PDF de auditoría rechazada muestra rojo**
**T13.4 — PDF con autorización requerida muestra observaciones en amarillo**

---

### GRUPO 14: RESPONSIVIDAD Y ACCESIBILIDAD

**T14.1 — Sidebar se oculta en mobile (< md breakpoint)**
**T14.2 — Tablas tienen overflow-x-auto para scroll horizontal en mobile**
**T14.3 — Todos los selects tienen aria-label**
**T14.4 — Imágenes y SVGs tienen alt/sr-only text**
**T14.5 — Contraste de colores legible en badges de estado**

---

### GRUPO 15: EDGE CASES

**T15.1 — Recargar página limpia los stores en memoria (esperado, son in-memory)**
**T15.2 — Ruta inexistente → página 404 de Next.js**
**T15.3 — Cambiar jurisdicción NO pierde auditorías de la otra jurisdicción (store global)**
**T15.4 — Registrar misma auditoría 2 veces crea 2 registros distintos (no deduplica, es by-design)**
**T15.5 — El motor maneja correctamente valores de práctica = $0**
**T15.6 — Botón PDF no falla si `window.open` está bloqueado (verificar que no crashea)**

---

## INSTRUCCIONES DE EJECUCIÓN

1. `cd c:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app`
2. `npm run build` → verificar T1.1 y T1.2
3. `npm run dev` → abrir `http://localhost:3000` para pruebas UI (Grupos 6-15)
4. Para Grupos 2-4: crear script `scripts/testAll.ts` con los tests unitarios y ejecutar `npx tsx scripts/testAll.ts`
5. Para Grupo 5: usar `curl` o el navegador contra `http://localhost:3000/api/practices`

## FORMATO DE REPORTE

Para cada test, reportar:
```
[PASS ✅ / FAIL ❌] T{grupo}.{número} — {nombre}
   Esperado: ...
   Obtenido: ...
   (solo si FAIL) Detalle del error: ...
```

Al final, generar resumen:
- Total: X/Y tests
- PASS: X
- FAIL: Y
- Lista de FAILs con causa raíz y fix sugerido

---

**Son 76 tests distribuidos en 15 grupos.** Cubren: motor de cobertura, servicios, API, UI completa, PDF, alertas, reactividad y edge cases.
