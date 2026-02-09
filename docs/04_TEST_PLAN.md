# 4. GUÍA DE PRUEBAS (TEST PLAN) — Suite Integral CPCE Salud

> Protocolo de testing exhaustivo para validación funcional.  
> Ejecutar cada escenario y marcar ✅ o ❌ según resultado.

---

## 4.1 Prerequisitos

Antes de ejecutar las pruebas:

1. Asegúrese de que la app esté corriendo: `npm run dev`
2. Abra el navegador en `http://localhost:3000`
3. Verifique que la Cámara I (Santa Fe) esté seleccionada por defecto
4. Tenga abierta la consola del navegador (F12) para verificar logs

---

## 4.2 ESCENARIO 1: Prueba de Carencia (Período de Espera)

> **Objetivo:** Validar que el motor rechaza prácticas cuando el afiliado no cumplió el período de carencia del plan.

### Test 1.1: Afiliado nuevo con carencia activa

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Ir a `/calculator` | Se carga la Calculadora de Cobertura |
| 2 | Verificar que la Cámara activa es **Cámara I (Santa Fe)** | Toggle azul activo |
| 3 | Seleccionar afiliado: **Pedro Nuevo (C1-Básico)** | Aparece en el dropdown |
| 4 | Seleccionar práctica: **CONSULTA MÉDICA DIURNA DE URGENCIAS/EMERGENCIAS** | Código 42.01.01 |
| 5 | Presionar **"Calcular Cobertura"** | Panel de resultado aparece |
| 6 | Verificar estado | 🔴 **RECHAZADA** |
| 7 | Verificar porcentaje | **0%** |
| 8 | Verificar observación | `Período de carencia no cumplido. Requiere 6 meses, tiene X.` |

**Datos del test:**
- Pedro Nuevo: `start_date = 2026-01-01`, Plan Básico: `waiting_period_months = 6`
- A fecha 2026-02-08: antigüedad ≈ 1 mes → Rechazado

**Resultado:** ☐ PASS / ☐ FAIL  
**Notas:** _______________________________________________

---

### Test 1.2: Afiliado que YA cumplió carencia

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Seleccionar afiliado: **María García (C1-Básico)** | `start_date = 2025-01-01` |
| 2 | Seleccionar práctica: **CONSULTA MÉDICA DIURNA** | Código 42.01.01 |
| 3 | Presionar **"Calcular Cobertura"** | - |
| 4 | Verificar estado | 🟢 **APROBADA** |
| 5 | Verificar porcentaje | **80%** (Plan Básico) |
| 6 | Verificar copago | **$2,100.00** (20% de $10,500) |
| 7 | Verificar observación | `El afiliado debe abonar un copago de $2100.00` |

**Datos del test:**
- María García: `start_date = 2025-01-01`, antigüedad ≈ 13 meses → Carencia cumplida (req. 6)
- Plan Básico: 80% cobertura

**Resultado:** ☐ PASS / ☐ FAIL  
**Notas:** _______________________________________________

---

### Test 1.3: Afiliado con plan sin carencia

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Seleccionar afiliado: **Juan Pérez (C1-General)** | `start_date = 2020-01-01` |
| 2 | Seleccionar práctica: **CONSULTA MÉDICA DIURNA** | - |
| 3 | Presionar **"Calcular Cobertura"** | - |
| 4 | Verificar estado | 🟢 **APROBADA** |
| 5 | Verificar porcentaje | **100%** |
| 6 | Verificar copago | **$0.00** |
| 7 | Verificar observaciones | Sin mensajes de carencia |

**Datos del test:**
- Juan Pérez: Plan General → `waiting_period_months = 0`

**Resultado:** ☐ PASS / ☐ FAIL  
**Notas:** _______________________________________________

---

## 4.3 ESCENARIO 2: Prueba de Cobertura 100% vs. Copagos

> **Objetivo:** Validar el cálculo correcto de montos cubiertos y copagos.

### Test 2.1: Cobertura 100% — Sin copago

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Cámara I activa | Azul |
| 2 | Afiliado: **Juan Pérez (C1-General)** | Plan General (100%) |
| 3 | Práctica: **CONSULTA MÉDICA DIURNA** | Valor: $10,500 |
| 4 | Calcular | - |
| 5 | Monto cubierto | **$10,500.00** |
| 6 | Copago | **$0.00** |
| 7 | Observaciones copago | No debe aparecer mensaje de copago |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 2.2: Cobertura 80% — Copago del 20%

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Cámara I activa | - |
| 2 | Afiliado: **María García (C1-Básico)** | Plan Básico (80%), carencia cumplida |
| 3 | Práctica: **CESÁREA** | Valor: $150,000 |
| 4 | Calcular | - |
| 5 | Monto cubierto | **$120,000.00** |
| 6 | Copago | **$30,000.00** |
| 7 | Observación copago | `El afiliado debe abonar un copago de $30000.00` |
| 8 | Autorización | ⚠️ **Sí** — Categoría "Cirugía" |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 2.3: Cobertura 90% — Cámara II

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | **Cambiar a Cámara II** (Rosario) | Toggle verde |
| 2 | Afiliado: **Ana Torres (C2-Joven)** | Plan Joven (90%) |
| 3 | Práctica: **CONSULTA MÉDICA (ROSARIO)** | Valor: $12,000 |
| 4 | Calcular | - |
| 5 | Porcentaje | **90%** |
| 6 | Monto cubierto | **$10,800.00** |
| 7 | Copago | **$1,200.00** |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 2.4: Tabla de verificación cruzada de cálculos

| Afiliado | Plan | % | Práctica | Valor | Cubierto | Copago |
|----------|------|---|----------|-------|----------|--------|
| Juan Pérez (C1) | General | 100 | Consulta ($10,500) | $10,500.00 | $10,500.00 | $0.00 |
| Juan Pérez (C1) | General | 100 | Cesárea ($150,000) | $150,000.00 | $150,000.00 | $0.00 |
| María García (C1) | Básico | 80 | Consulta ($10,500) | $10,500.00 | $8,400.00 | $2,100.00 |
| María García (C1) | Básico | 80 | Cesárea ($150,000) | $150,000.00 | $120,000.00 | $30,000.00 |
| Carlos López (C2) | Integral | 100 | Consulta ROS ($12,000) | $12,000.00 | $12,000.00 | $0.00 |
| Ana Torres (C2) | Joven | 90 | Consulta ROS ($12,000) | $12,000.00 | $10,800.00 | $1,200.00 |
| Ana Torres (C2) | Joven | 90 | Cesárea ROS ($180,000) | $180,000.00 | $162,000.00 | $18,000.00 |

---

## 4.4 ESCENARIO 3: Prueba de Autorización Automática

> **Objetivo:** Validar que las prácticas de Cirugía y Alta Complejidad requieren autorización.

### Test 3.1: Cirugía requiere autorización

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Cámara I activa | - |
| 2 | Afiliado: **Juan Pérez (C1-General)** | Plan 100% |
| 3 | Práctica: **CESÁREA** | Categoría: Cirugía |
| 4 | Calcular | - |
| 5 | Estado | 🟢 APROBADA |
| 6 | `authorizationRequired` | **true** |
| 7 | Observación | `Requiere autorización previa por ser práctica compleja.` |
| 8 | Panel amarillo visible | ⚠️ Sí, con icono de advertencia |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 3.2: Consulta NO requiere autorización

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Afiliado: **Juan Pérez (C1-General)** | Plan 100% |
| 2 | Práctica: **CONSULTA MÉDICA DIURNA** | Categoría: Consultas |
| 3 | Calcular | - |
| 4 | `authorizationRequired` | **false** |
| 5 | Observaciones | Sin panel amarillo (copago es $0, sin autorización) |

**Verificar en consola:** `console.log` debe mostrar `authorizationRequired: false`

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 3.3: Salud Mental NO requiere autorización

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Afiliado: **Juan Pérez (C1-General)** | - |
| 2 | Práctica: **PSICOTERAPIA INDIVIDUAL** | Categoría: Salud Mental |
| 3 | Calcular | - |
| 4 | Estado | 🟢 APROBADA |
| 5 | `authorizationRequired` | **false** |
| 6 | Copago | $0.00 (Plan es 100%) |

**Resultado:** ☐ PASS / ☐ FAIL

---

## 4.5 ESCENARIO 4: Prueba de Cambio de Cámara

> **Objetivo:** Validar el switch completo entre jurisdicciones.

### Test 4.1: Cambiar de Cámara I a Cámara II

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Verificar Cámara I activa | Botón azul resaltado |
| 2 | Ir a `/calculator` | - |
| 3 | Verificar afiliados | Solo aparecen: Juan Pérez, María García, Pedro Nuevo |
| 4 | Verificar prácticas | Solo Cámara I (3 prácticas) |
| 5 | **Clic en "Cámara II (Rosario)"** | - |
| 6 | Toggle cambia | Verde esmeralda activo |
| 7 | Afiliados cambian | Solo: Carlos López, Ana Torres |
| 8 | Prácticas cambian | Solo Cámara II (3 prácticas diferentes) |
| 9 | Verify `data-theme` en `<html>` | Debe ser `camera-ii` |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 4.2: Persistencia del selector al navegar

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Seleccionar **Cámara II** | Verde activo |
| 2 | Ir a `/practices` | - |
| 3 | Verificar prácticas | Solo prácticas de Rosario |
| 4 | Ir a `/` (Dashboard) | - |
| 5 | Toggle sigue en Cámara II | ✅ Persiste al navegar |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 4.3: Jurisdicción cruzada (validación de seguridad)

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Cámara I activa | - |
| 2 | Intentar calcular un afiliado C1 con práctica C2 | ⚠️ Esto NO debería ser posible desde la UI porque las listas se filtran por jurisdicción |
| 3 | **Test de motor directo** (consola): | - |
| 4 | Ejecutar en consola del navegador: | - |

```javascript
// Test directo del motor (ejecutar en consola del navegador)
// Importar desde mockData y coverageEngine no es posible directamente,
// pero puede validarse que el dropdown NUNCA muestra prácticas de otra cámara
```

**Validación UI:** Al seleccionar Cámara I, las prácticas del dropdown NO deben contener "(ROSARIO)" ni "(MÓDULO)".

**Resultado:** ☐ PASS / ☐ FAIL

---

## 4.6 ESCENARIO 5: Prueba del Nomenclador de Prácticas

### Test 5.1: Búsqueda por código

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Ir a `/practices` | Se carga el Nomenclador |
| 2 | Escribir `42.01` en el buscador | - |
| 3 | Verificar resultados | Solo prácticas con código que contenga "42.01" |
| 4 | Contador inferior | Número correcto de resultados |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 5.2: Búsqueda por descripción

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Limpiar búsqueda | Todos los resultados visibles |
| 2 | Escribir `cesárea` | - |
| 3 | Verificar | Aparece la cesárea de la cámara activa |
| 4 | Verificar case-insensitive | Escribir `CESÁREA` debe dar mismo resultado |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 5.3: Sin resultados

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Escribir `xyz999` | - |
| 2 | Verificar | Mensaje "No se encontraron prácticas con ese criterio." |
| 3 | Contador | `0 resultados` |

**Resultado:** ☐ PASS / ☐ FAIL

---

## 4.7 ESCENARIO 6: Pruebas de Edge Cases

### Test 6.1: Calcular sin selección

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Ir a `/calculator` | - |
| 2 | NO seleccionar afiliado ni práctica | - |
| 3 | Verificar botón | **Deshabilitado** (gris, no clickeable) |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 6.2: Solo afiliado seleccionado

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Seleccionar solo afiliado | - |
| 2 | Verificar botón | **Deshabilitado** |

**Resultado:** ☐ PASS / ☐ FAIL

---

### Test 6.3: Cambiar cámara con formulario lleno

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Cámara I, seleccionar afiliado y práctica | Formulario completo |
| 2 | Cambiar a Cámara II | - |
| 3 | Verificar selecciones | ⚠️ Las selecciones previas deberían resetearse o el dropdown debe actualizarse |

> **NOTA:** Actualmente el estado del formulario (`selectedAffiliateId`, `selectedPracticeId`) NO se resetea al cambiar de cámara. Esto puede causar que el usuario tenga un ID seleccionado que ya no existe en la nueva jurisdicción. **Este es un bug potencial a documentar.**

**Resultado:** ☐ PASS / ☐ FAIL

---

## 4.8 ESCENARIO 7: Pruebas Visuales / Responsive

### Test 7.1: Desktop (>1024px)

| Verificación | Resultado |
|-------------|-----------|
| Sidebar visible | ☐ |
| Header con barra de búsqueda | ☐ |
| Dashboard con 2 columnas side-by-side | ☐ |
| Calculadora con 2 paneles (input + resultado) | ☐ |
| Gráficos renderizados correctamente | ☐ |

### Test 7.2: Tablet (768px-1024px)

| Verificación | Resultado |
|-------------|-----------|
| Sidebar colapsada | ☐ |
| Botón hamburguesa visible | ☐ |
| Contenido usa ancho completo | ☐ |

### Test 7.3: Móvil (<768px)

| Verificación | Resultado |
|-------------|-----------|
| Sidebar oculta | ☐ |
| Búsqueda del header oculta | ☐ |
| Cards apiladas verticalmente | ☐ |
| Toggle de cámara accesible | ☐ |

---

## 4.9 Resumen de Resultados

| Escenario | Tests | PASS | FAIL |
|-----------|-------|------|------|
| 1. Carencia | 3 | _ | _ |
| 2. Cobertura/Copagos | 4 | _ | _ |
| 3. Autorización | 3 | _ | _ |
| 4. Cambio de Cámara | 3 | _ | _ |
| 5. Nomenclador | 3 | _ | _ |
| 6. Edge Cases | 3 | _ | _ |
| 7. Responsive | 3 | _ | _ |
| **TOTAL** | **22** | **_** | **_** |

---

## 4.10 Criterios de Aceptación

- ✅ **PASS General**: 22/22 tests pasados
- ⚠️ **PASS Condicional**: ≥ 18/22 con bugs documentados
- ❌ **FAIL**: < 18/22 — Requiere correcciones antes de integrar datos reales
