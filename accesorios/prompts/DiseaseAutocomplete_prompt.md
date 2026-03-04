# Prompt — Componente DiseaseAutocomplete

## Descripción General

El componente `DiseaseAutocomplete` permite la búsqueda y selección inteligente de diagnósticos médicos (CIE-10, CIE-11, DSM-5) en la app CPCE Salud. Está diseñado para usarse en formularios de auditoría médica, solicitudes de afiliados y cualquier circuito donde se requiera ingresar un diagnóstico presuntivo.

---

## Características

- **Búsqueda inteligente:** Autocomplete con debounce (300ms) sobre la tabla `diseases` en Supabase. Permite buscar por nombre o código.
- **Dropdown interactivo:** Muestra resultados con código (monospace), nombre y clasificación. Navegación por teclado (flechas, Enter, Escape).
- **Selección y limpieza:** Al seleccionar un diagnóstico, se muestra como chip con ícono y botón para limpiar. Permite volver a buscar.
- **Integración IA:** Prop `initialSearch` para disparar búsqueda automática cuando la IA extrae un diagnóstico desde un archivo adjunto.
- **Accesibilidad:** Soporte para navegación por teclado y cierre automático al hacer click fuera.
- **Estados visuales:** Indicadores de búsqueda, sin resultados, y mensajes amigables.
- **Estilo institucional:** Tipografía mono para códigos, colores neutros, diseño limpio y profesional.
- **Indicador `requires_authorization`:** Muestra ícono de candado (🔒) para diagnósticos que requieren autorización previa.
- **Footer con conteo:** Muestra cantidad de resultados y avisa si se llegó al límite de 15 ("Refiná la búsqueda para ver más").

---

## Props

| Prop | Tipo | Requerido | Descripción |
|---|---|---|---|
| `value` | `string` | No | Nombre del diagnóstico seleccionado |
| `code` | `string` | No | Código del diagnóstico seleccionado |
| `onSelect` | `(sel: DiseaseSelection) => void` | Sí | Callback al seleccionar |
| `onClear` | `() => void` | Sí | Callback al limpiar selección |
| `initialSearch` | `string` | No | Texto inicial para búsqueda automática (IA) |
| `label` | `string` | No | Etiqueta personalizada |
| `placeholder` | `string` | No | Placeholder personalizado |
| `disabled` | `boolean` | No | Deshabilita el campo |

---

## Ejemplo de Uso

```tsx
<DiseaseAutocomplete
  value={diagnosisName}
  code={diagnosisCode}
  onSelect={handleDiseaseSelect}
  onClear={handleDiseaseClear}
  initialSearch={aiDiagnosis}
  label="Diagnóstico presuntivo"
  placeholder="Buscar diagnóstico por código o nombre..."
/>
```

---

## Integración

- Usado en `/src/app/audits/requests/new/page.tsx` para el campo de diagnóstico presuntivo.
- Compatible con extracción automática de diagnóstico por IA desde archivos adjuntos.
- Puede integrarse en cualquier circuito que requiera diagnóstico médico estructurado.

---

## Consideraciones Técnicas

- Consulta la tabla `diseases` en Supabase (requiere migración 017 que agrega `classification`).
- Limita resultados a 15 por búsqueda.
- Evita búsquedas con menos de 2 caracteres.
- **Fast-clear (10ms):** Los resultados se limpian casi instantáneamente cuando el texto baja de 2 caracteres, sin esperar los 300ms del debounce.
- **Debounce (300ms):** Solo se ejecuta la llamada a Supabase cuando hay 2+ caracteres.
- Limpia resultados y estado al seleccionar o limpiar.
- No requiere backend adicional, todo el procesamiento es client-side.
- Compatible con React Compiler (todos los `setState` dentro de callbacks `setTimeout`).

---

## Columnas BD relevantes (`diseases`)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `int` | ID |
| `code` | `varchar(20)` | Código CIE/DSM (ej: `E11`, `1A00`, `F32`) |
| `name` | `varchar(200)` | Denominación oficial |
| `classification` | `varchar(20)` | `CIE-10`, `CIE-11` o `DSM-5` (desde migración 017) |
| `level` | `varchar(20)` | Nivel de severidad/grupo |
| `is_chronic` | `boolean` | Si es enfermedad crónica |
| `requires_authorization` | `boolean` | Si requiere autorización previa en el sistema |
| `description` | `text` | Descripción extendida (opcional) |

---

## Mejoras Futuras Sugeridas

1. **Resaltado de texto**: Subrayar la parte del texto que coincide con la búsqueda en el dropdown.
2. **Filtro por clasificación**: Dropdown/toggle para filtrar solo CIE-10, CIE-11 o DSM-5.
3. **Historial reciente**: Mostrar los últimos N diagnósticos seleccionados por el usuario (localStorage).
4. **Validación de coherencia**: Incorporar verificación práctica↔diagnóstico en tiempo real (ya existe `checkCoherence` en `aiService.ts`).

---

## Visión

Facilitar la carga precisa y rápida de diagnósticos médicos, reducir errores de tipeo, estandarizar la información clínica y potenciar la integración con IA para automatización de procesos en auditoría médica.

---

*Última actualización: 04/03/2026*
