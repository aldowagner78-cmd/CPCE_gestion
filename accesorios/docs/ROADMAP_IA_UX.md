# ROADMAP — Rediseño UX + Capacidades IA

> **Proyecto:** CPCE Gestión de Expedientes  
> **Fecha:** Marzo 2026  
> **Objetivo:** Simplificar la experiencia de usuario y potenciar las capacidades de IA  

---

## DECISIONES DE DISEÑO UX (Acordadas)

### Flujo de Creación de Expedientes

| Decisión | Elección | Detalle |
|----------|----------|---------|
| **Modo IA vs Manual** | Tabs superiores alternables | Se puede cambiar entre modos en cualquier momento, los datos se conservan |
| **Flujo IA** | Pantalla dividida → Accordion | Imagen izquierda + campos extraídos derecha. Campos con checkboxes (todos seleccionados por defecto). Editar = aceptar automáticamente. Botón "Agregar datos" → transiciona a accordion con secciones pre-llenadas |
| **Flujo Manual** | Secciones colapsables + auto-avance | Al completar una sección, se colapsa sola y abre la siguiente. Mínimos clics. Se puede volver atrás clickeando sección anterior |
| **Cantidad de secciones** | 3 secciones mínimas | (1) Tipo + Afiliado, (2) Prácticas + Prescripción + Diagnóstico, (3) Adjuntos + Comunicación + Enviar |
| **Estilo visual** | Limpio-profesional | Fondo blanco con tarjetas sutiles, coherente con la app existente |
| **Semáforo prácticas** | Badges con color y texto | `🟢 Aprobable` `🟡 Requiere revisión` `🔴 Sin cobertura` + más clasificaciones para automatización futura |
| **Médico prescriptor** | Dos campos separados + búsqueda futura | Nombre (texto libre) + Matrícula (numérico). Preparado para autocompletado cuando exista padrón |
| **Fechas** | Datepicker dd/mm/aaaa + validación | Calendario + tipeo manual. Validación instantánea |
| **Coseguro** | Cálculo automático en tiempo real | Muestra cobertura/coseguro por práctica al agregarla. Porcentaje editable manualmente, recalcula automáticamente |
| **Código autorización** | 100% automático | Sistema genera código. Preparado para seguir secuencia real cuando haya BD real |
| **Auto-aprobación** | Automática si cumple TODOS los criterios | Prácticas verdes se auto-aprueban solo si cumplen todos los requisitos. Caso contrario → pendiente auditoría médica |
| **Tutorial** | Tour guiado + tooltips permanentes | Primer login: overlay interactivo paso a paso. Siempre: iconos "?" con explicaciones |
| **Comunicación** | Se mantiene, pero simplificado | Notas internas + para afiliado. Reducir clics: textarea directo sin tabs innecesarios |
| **Internaciones** | Derivación automática a auditoría | Comportamiento igual a ambulatorios por ahora. Futuro: análisis IA de facturación vs documentación respaldatoria |

### Flujo de Revisión de Expedientes

| Decisión | Elección | Detalle |
|----------|----------|---------|
| **Layout** | Ficha tipo historia clínica a pantalla completa | Al seleccionar expediente, se abre ficha completa. Lista accesible via botón atrás o sidebar toggle |
| **Encabezado** | Barra header con datos clave | Nombre afiliado, DNI, plan, edad, nro expediente siempre visibles arriba |
| **Contenido** | Tabs horizontales limpios | Prácticas, Documentos, Comunicación, Historial |
| **Principio** | Menos es más | Mínima cantidad de pasos, información jerárquica, sin abrumar |

---

## CLASIFICACIÓN DE PRÁCTICAS (Sistema de Semáforo Extendido)

> **CLAVE PARA AUTOMATIZACIÓN FUTURA** — Esta clasificación determina el circuito de cada práctica.

| Estado | Color | Significado | Acción automática |
|--------|-------|-------------|-------------------|
| `auto_aprobable` | 🟢 Verde | Cumple TODOS los criterios del plan | Auto-aprobación inmediata |
| `requiere_revision` | 🟡 Amarillo | Cumple parcialmente, necesita evaluación | Derivar a auditor |
| `sin_cobertura` | 🔴 Rojo | No cubierta por el plan | Derivar a auditor con alerta |
| `limite_excedido` | 🟠 Naranja | Supera límite de sesiones/año o frecuencia | Derivar a auditor con historial |
| `requiere_mesa_control` | 🟣 Púrpura | Alta complejidad / internación / monto alto | Derivar a mesa de control |
| `duplicada_reciente` | ⚫ Gris | Práctica similar en periodo reciente | Alertar posible duplicado |
| `carencia` | 🔵 Azul | Afiliado en período de carencia para esta categoría | Bloquear con aviso |

### Reglas de clasificación (a implementar en RulesEngine):
1. ✅ Afiliado activo y al día
2. ✅ Fuera de período de carencia
3. ✅ Práctica cubierta por el plan
4. ✅ Cobertura >= umbral mínimo
5. ✅ No supera límite de sesiones/año
6. ✅ Respeta frecuencia mínima entre prácticas
7. ✅ Monto no supera auto-aprobación
8. ✅ No requiere autorización especial por categoría
9. ✅ No es internación (siempre va a auditoría)
10. ✅ No hay duplicado reciente (misma práctica < 48hs)
11. ✅ Diagnóstico es coherente con la práctica
12. ✅ Documentación respaldatoria completa

**Solo si TODAS las reglas son ✅ → 🟢 auto_aprobable**

---

## FASE 1 — Rediseño UX (Prioridad ALTA)

> **Objetivo:** Implementar el nuevo diseño de creación de expedientes con mínimos clics.

### 1.1 Refactorizar formulario de creación
- [ ] Implementar tabs IA/Manual alternables
- [ ] Restructurar en 3 secciones con auto-avance
- [ ] Sección 1: Selector de tipo + Búsqueda de afiliado (en un solo panel)
- [ ] Sección 2: Prácticas + Prescripción + Diagnóstico (panel unificado)
- [ ] Sección 3: Adjuntos + Comunicación + Enviar (panel final)
- [ ] Auto-colapso al completar sección + apertura automática de la siguiente
- [ ] Indicadores de sección completa (✅) y pendiente

### 1.2 Rediseñar AIUploadModal → Pantalla IA
- [ ] Pantalla dividida: imagen izquierda, campos extraídos derecha
- [ ] Checkboxes por campo (todos seleccionados por defecto)
- [ ] Editar campo = se acepta automáticamente (sin botón aceptar)
- [ ] Botón único "Agregar datos" → inserta solo campos seleccionados
- [ ] Eliminar botones Accept/Edit/Delete individuales (simplificar)

### 1.3 Implementar fechas dd/mm/aaaa
- [ ] Datepicker con máscara dd/mm/aaaa
- [ ] Validación: prescripción no futura, vencimiento > prescripción
- [ ] Formato consistente en toda la app

### 1.4 Coseguro en tiempo real
- [ ] Mostrar cobertura/coseguro al agregar cada práctica
- [ ] Porcentaje editable manualmente → recalcula montos
- [ ] Desglose: valor | cobertura% | monto cubierto | coseguro

### 1.5 Médico prescriptor
- [ ] Separar en: Nombre (texto) + Matrícula (numérico) + Especialidad (select/texto)
- [ ] Preparar interface para futura búsqueda por matrícula (adapter pattern)

### 1.6 Simplificar panel comunicación
- [ ] Mantener dos canales (interna + afiliado)
- [ ] Eliminar tabs, usar toggle simple o split directo
- [ ] Textarea expandible en lugar de input + botón
- [ ] Mantener botón "Pulir con IA"

---

## FASE 2 — Mejoras IA (Prioridad ALTA)

> **Objetivo:** Hacer la extracción IA más inteligente, confiable y rápida.

### 2.1 Confianza por campo
- [ ] Agregar `confidence: number` (0-100) a cada campo extraído
- [ ] Campos con confianza < 70% → marcados con ⚠️
- [ ] Prompt engineering: instruir a Gemini a reportar confianza
- [ ] UI: indicador visual de confianza (barra o color)

### 2.2 Alternativas para campos inciertos
- [ ] Campos con confianza < 50% → mostrar hasta 3 alternativas
- [ ] UI: dropdown con alternativas, usuario elige la correcta
- [ ] Prompt: `"alternatives": ["opcion1", "opcion2", "opcion3"]`

### 2.3 Campos faltantes y advertencias
- [ ] Prompt: agregar `missing_fields: string[]` a la respuesta
- [ ] Prompt: agregar `warnings: string[]` (letra ilegible, imagen borrosa, etc.)
- [ ] UI: banner de advertencias sobre la extracción
- [ ] Si faltan campos críticos (afiliado, prácticas) → aviso prominente

### 2.4 Búsqueda de afiliado por IA
- [ ] IA extrae número de afiliado + nombre + DNI
- [ ] Sistema hace búsqueda fuzzy en Supabase con los datos extraídos
- [ ] Si encuentra match único → auto-selecciona
- [ ] Si encuentra múltiples → muestra lista para que el usuario elija
- [ ] Si no encuentra → permite ingreso manual con los datos extraídos como sugerencia

### 2.5 Búsqueda de diagnóstico por IA
- [ ] IA devuelve texto diagnóstico + código CIE-10/CIE-11 sugerido
- [ ] Sistema busca en tabla de diagnósticos y ofrece los más cercanos
- [ ] Si confianza alta → auto-selecciona + permite cambiar
- [ ] Si confianza baja → muestra 3 opciones candidatas

### 2.6 Clasificación automática de documentos
- [ ] Antes de extraer datos, IA identifica tipo de documento
- [ ] Tipos: orden_medica | receta | laboratorio | estudio | hc | factura | otro
- [ ] Aplica prompt específico según tipo detectado
- [ ] UI: badge indicando tipo detectado

### 2.7 Optimización de velocidad
- [ ] Implementar streaming de respuesta (mostrar campos a medida que llegan)
- [ ] Caché de documentos ya procesados (hash del archivo)
- [ ] Compresión adaptativa: 800px para órdenes simples, 1200px para HC/estudios
- [ ] Considerar Gemini 2.0 Flash como fallback rápido para documentos simples

---

## FASE 3 — Rediseño Revisión de Expedientes (Prioridad MEDIA)

> **Objetivo:** Transformar el monolito de 1700 líneas en una ficha clínica intuitiva.

### 3.1 Fragmentar page.tsx de revisión
- [ ] Extraer ExpedientList → componente independiente
- [ ] Extraer ExpedientDetail → componente independiente
- [ ] Extraer cada tab → componente independiente
- [ ] Extraer paneles de acción → componentes por rol

### 3.2 Implementar ficha clínica
- [ ] Header persistente: afiliado, DNI, plan, edad, nro expediente
- [ ] Vista a pantalla completa al seleccionar expediente
- [ ] Botón volver a lista / sidebar toggle
- [ ] Tabs limpios: Prácticas | Documentos | Comunicación | Historial
- [ ] Acciones agrupadas en menú contextual (no botones dispersos)

### 3.3 Semáforo extendido en revisión
- [ ] Badges con la clasificación extendida (7 colores)
- [ ] Filtrar prácticas por estado en la lista
- [ ] Acciones rápidas por estado (verde → confirmar, rojo → justificar)

### 3.4 Simplificar acciones del auditor
- [ ] Un clic para resolver práctica (autorizar/denegar inline)
- [ ] Resolución en lote: seleccionar múltiples prácticas → acción masiva
- [ ] Plantillas de resolución para casos comunes

---

## FASE 4 — Tutorial y Onboarding (Prioridad MEDIA)

### 4.1 Tour guiado (primer login)
- [ ] Integrar librería de tours (Intro.js, Shepherd.js, o React Joyride)
- [ ] Tour para flujo de creación (5-7 pasos)
- [ ] Tour para flujo de revisión (5-7 pasos)
- [ ] Guardar en perfil de usuario si ya completó el tour
- [ ] Botón "Repetir tutorial" en menú de ayuda

### 4.2 Tooltips permanentes
- [ ] Icono "?" en cada sección y campo complejo
- [ ] Tooltip con explicación breve al hover
- [ ] No intrusivos — desaparecen al alejar el cursor
- [ ] Consistentes en toda la app

---

## FASE 5 — Internaciones (Prioridad FUTURA)

> **Objetivo:** Sistema de análisis IA de facturación vs documentación respaldatoria.

### 5.1 Análisis de facturación por IA
- [ ] Upload múltiple: factura + HC + estudios + documentación
- [ ] IA analiza cada documento por separado (tipo auto-detectado)
- [ ] Cruce automático: ítems facturados vs prácticas autorizadas
- [ ] Detección de discrepancias: cobros no autorizados, montos incorrectos, fechas inconsistentes
- [ ] Reporte generado por IA con hallazgos

### 5.2 Modelo de datos para internaciones
- [ ] Tabla `internaciones` con campos específicos (fecha ingreso, egreso, diagnóstico, etc.)
- [ ] Relación con expediente padre
- [ ] Registro de días cama, prácticas diarias, medicación

### 5.3 Dashboard de internaciones
- [ ] Vista por internación (no por expediente)
- [ ] Timeline de la internación con hitos
- [ ] Comparativo facturado vs autorizado en gráfico

### 5.4 Modo batch de documentos
- [ ] Upload de carpeta completa (todos los documentos de una internación)
- [ ] IA procesa en paralelo y cruza información
- [ ] Vista consolidada de hallazgos

---

## FASE 6 — Automatización Avanzada (Prioridad FUTURA)

### 6.1 Detección de duplicados inteligente
- [ ] Antes de crear expediente: buscar prácticas similares del mismo afiliado en últimos N días
- [ ] Alerta: "Este afiliado tiene una consulta similar hace 3 días"
- [ ] Permitir continuar o cancelar

### 6.2 Aprendizaje de formatos recurrentes
- [ ] Registrar qué campos fueron corregidos por usuarios
- [ ] Métricas de precisión IA por tipo de documento y origen
- [ ] Dashboard de calidad: "Precisión promedio: 87%" con tendencia

### 6.3 Motor de IA intercambiable (Adapter Pattern)
- [ ] Interface `IADocumentParser` abstracta
- [ ] Implementación Gemini 2.5 Flash (actual)
- [ ] Implementación Gemini 2.0 Flash (fallback rápido)
- [ ] Preparado para futuras implementaciones (Grok, Claude, OpenAI, Llama)
- [ ] Config por tipo de documento: qué motor usar para cada tipo

### 6.4 Códigos de autorización secuenciales
- [ ] Cuando se disponga de BD real: migrar de timestamp+random a secuencia numérica
- [ ] Formato configurable por jurisdicción
- [ ] Prefijo por tipo de expediente mantenido
- [ ] Tabla `authorization_sequences` con contadores por tipo

---

## LÍMITES Y COSTOS — Gemini API

| Plan | Requests/min | Requests/día | Tokens/min | Costo |
|------|-------------|-------------|------------|-------|
| **Gratis** | 15 | ~1.500 | 1M | $0 |
| **Pay-as-you-go** | 2.000 | Ilimitado | 4M | ~$0.15/1M tokens input |

**Estimación para CPCE:**
- 50-100 expedientes/día = 50-100 requests/día
- Tier gratuito soporta 15x más de lo necesario
- No se necesita plan pago salvo crecimiento exponencial

**Estrategia de contingencia:**
- Si se acercan al límite: implementar cola de procesamiento
- Priorizar documentos de internación (más complejos) sobre ambulatorios simples
- Caché agresivo para documentos re-subidos

---

## CRONOGRAMA SUGERIDO

| Fase | Descripción | Dependencias |
|------|------------|-------------|
| **Fase 1** | Rediseño UX creación | Ninguna — empezar ya |
| **Fase 2** | Mejoras IA | Puede hacerse en paralelo con Fase 1 |
| **Fase 3** | Rediseño revisión | Después de Fase 1 (reutilizar patrones) |
| **Fase 4** | Tutorial/onboarding | Después de Fase 1 y 3 (necesita UI estable) |
| **Fase 5** | Internaciones | Después de Fase 2 (necesita IA mejorada) |
| **Fase 6** | Automatización avanzada | Después de todo lo anterior |

---

## NOTAS TÉCNICAS

- **Framework:** Next.js 16 + React + Tailwind CSS + Supabase
- **Motor IA actual:** Gemini 2.5 Flash (`@google/generative-ai@0.24.1`)
- **Deploy:** Vercel (free tier, maxDuration 60s)
- **Arquitectura:** Preparar adapter pattern para IA intercambiable
- **Principio rector:** MENOS es MÁS — mínimos clics, máxima automatización
