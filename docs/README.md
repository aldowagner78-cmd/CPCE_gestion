# Suite Integral CPCE Salud — Documentación Técnica Completa

> Generado: 8 de febrero de 2026 | Versión: v1.0.0-alpha

---

## Índice de Documentos

| # | Documento | Archivo | Descripción |
|---|-----------|---------|-------------|
| 1 | **Auditoría de Código e UX** | [`01_AUDITORIA_CODIGO_UX.md`](./01_AUDITORIA_CODIGO_UX.md) | 10 bugs/hallazgos, 5 puntos ciegos en reglas de negocio, 8 issues de UX, análisis de rendimiento y seguridad |
| 2 | **Manual de Usuario** | [`02_MANUAL_USUARIO.md`](./02_MANUAL_USUARIO.md) | Guía completa para usar Dashboard, Calculadora, Nomenclador y Jurisdicciones. Incluye glosario y FAQ |
| 3 | **Diccionario de Datos** | [`03_DICCIONARIO_DATOS.md`](./03_DICCIONARIO_DATOS.md) | Estructura CSV/Excel para importar Afiliados, Planes, Prácticas y Jurisdicciones. Guía de transformación paso a paso |
| 4 | **Plan de Pruebas** | [`04_TEST_PLAN.md`](./04_TEST_PLAN.md) | 22 tests organizados en 7 escenarios: Carencia, Cobertura, Autorización, Cambio de Cámara, Nomenclador, Edge Cases, Responsive |
| 5 | **Mejoras Sugeridas** | [`05_MEJORAS_SUGERIDAS.md`](./05_MEJORAS_SUGERIDAS.md) | 3 funcionalidades avanzadas: Exportación PDF, Alertas Presupuestarias, Historial de Auditorías |

---

## Fixes Aplicados al Código

Además de la documentación, se realizaron las siguientes correcciones directas:

### Fix 1: Tipado fuerte para `PlanRules` (BUG-03)
- **Archivo:** `src/types/database.ts`
- **Cambio:** Creado tipo `PlanRules` con propiedades tipadas. `Plan.rules` ahora usa `PlanRules` en lugar de `Record<string, any>`.

### Fix 2: `category` obligatorio en `Practice` (BUG-02)  
- **Archivo:** `src/types/database.ts`
- **Cambio:** `category` pasó de `string | undefined` a `string` (obligatorio).

### Fix 3: Datos mock de Alta Complejidad (RN-05)
- **Archivo:** `src/lib/mockData.ts`
- **Cambio:** Agregadas 2 prácticas de categoría "Alta Complejidad" para permitir probar esa rama del motor.

### Fix 4: Ruta de Nomencladores (UX-02)
- **Archivo:** `src/components/layout/Sidebar.tsx`
- **Cambio:** `/nomenclators` → `/practices` para que el link del sidebar apunte a la página existente.

### Fix 5: Página de Ayuda (Nueva)
- **Archivo:** `src/app/help/page.tsx`
- **Cambio:** Página funcional con manual de usuario interactivo, búsqueda, secciones colapsables.

### Fix 6: Link de Ayuda en Sidebar
- **Archivo:** `src/components/layout/Sidebar.tsx`  
- **Cambio:** Agregado "Ayuda" con ícono `HelpCircle` en la categoría SISTEMA.

---

## Próximos Pasos Recomendados

1. **Ejecutar el Plan de Pruebas** (Documento 4) con 22 tests completos.
2. **Preparar datos reales** según el Diccionario de Datos (Documento 3).
3. **Implementar Historial de Auditorías** como primera mejora fundacional (Documento 5).
4. **Conectar Supabase** reemplazando `USE_MOCK_DATA = true` por `false` en `services/api.ts`.
5. **Resolver bugs restantes** según la Matriz de Prioridades (Documento 1).
