# 📋 PLAN DE DESARROLLO CPCE SALUD - TAREAS PENDIENTES

**Fecha de actualización:** 8 de febrero de 2026  
**Estado general:** App base funcional - En fase de expansión

---

## 🔴 PRIORIDAD ALTA - Funcionalidades Core Faltantes

### 1. NOMENCLADORES EXTERNOS - Mejoras Críticas
- [ ] **PDF Upload & Auto-extracción**
  - Subir PDFs de nomencladores
  - Extracción automática de datos con OCR/parsing
  - Conversión automática a CSV
  - Validación de estructura extraída
  - Preview antes de confirmar importación
  
- [ ] **Sistema de Nomencladores Flexible**
  - ❌ Eliminar nombres hardcodeados (NUN, FAAAR, etc.)
  - ✅ Permitir crear nomencladores personalizados
  - Campo: Nombre, Descripción, Tipo, Jurisdicción
  - CRUD completo de nomencladores externos
  - Historial de versiones por nomenclador

- [ ] **Mapeo Inteligente**
  - Sugerencias automáticas basadas en similitud de texto
  - Aprendizaje de mapeos previos
  - Exportar/importar configuraciones de mapeo

---

### 2. HOMOLOGADOR (MATCHER) - Desarrollar Completo
- [ ] **Interfaz de Homologación**
  - Vista lado a lado: Nomenclador Interno vs Externo
  - Búsqueda rápida en ambos lados
  - Filtros por categoría, código, descripción
  
- [ ] **Motor de Homologación**
  - Mapeo 1:1 de códigos (práctica interna ↔ código externo)
  - Mapeo 1:N (una práctica interna puede tener múltiples códigos externos)
  - Mapeo N:1 (varias prácticas internas → un código externo)
  - Reglas de conversión de unidades/valores
  
- [ ] **Base de Datos de Homologaciones**
  - Tabla: `homologations` (id, internal_practice_id, external_code, external_nomenclator_id, ratio, notes)
  - Historial de cambios
  - Auditoría de quién creó/modificó cada homologación
  
- [ ] **Sugerencias Automáticas**
  - Similitud de texto (fuzzy matching)
  - Coincidencias por palabras clave
  - ML simple para aprender de patrones previos

---

### 3. NOMENCLADORES INTERNOS - Rediseño Completo
- [ ] **Estructura Multi-Nomenclador**
  - Separar por TIPO de nomenclador (no un listado único)
  - Tipos identificados:
    1. **Prácticas Médicas** (actual nomenclador 1)
    2. **Prácticas Bioquímicas** (nomenclador 2)
    3. **Prácticas Odontológicas** (nomenclador 3 - confirmar)
    4. **Medicamentos** (nomenclador 4)
    5. **Especiales** (nuevo)
    6. **Otros** (extensible)
  
- [ ] **Interfaz por Pestañas**
  - Pestaña por cada tipo de nomenclador
  - Contadores independientes
  - Búsqueda global + búsqueda por tipo
  
- [ ] **Base de Datos**
  - Tabla `practice_types` (actualizar con más categorías)
  - Tabla `practices` ya existe, vincular mejor con `practice_type_id`
  - Valores unitarios diferenciados por tipo
  
- [ ] **Configuración Flexible**
  - Permitir agregar nuevos tipos desde UI
  - Definir unidad de medida personalizada por tipo
  - Colores o iconos distintivos por tipo

---

### 4. BACKUP Y SINCRONIZACIÓN - Desarrollar Completo
- [ ] **Backup Manual**
  - Exportar toda la base de datos a JSON/SQL
  - Backup selectivo (solo auditorías, solo nomencladores, etc.)
  - Descarga directa del archivo
  
- [ ] **Backup Automático**
  - Programar backups diarios/semanales
  - Almacenar en Supabase Storage o S3 compatible
  - Retención: últimos 30 días
  
- [ ] **Sincronización entre Cámaras**
  - Exportar configuración de una cámara
  - Importar en otra cámara
  - Incluir: nomencladores, valores, configuraciones, NO incluir afiliados ni auditorías
  
- [ ] **Restauración**
  - Subir backup y restaurar
  - Preview de cambios antes de aplicar
  - Rollback en caso de error

---

### 5. VALORES Y CONFIGURACIÓN - Ampliación
- [ ] **Sistema de Valores Flexible**
  - **Opción 1:** Valor por unidad (Galeno, NBU, etc.) - ✅ Ya existe
  - **Opción 2:** Valor fijo por práctica (ej: $5000 fijos por cirugía X)
  - **Opción 3:** Porcentaje sobre valor de referencia
  - **Opción 4:** Tablas de precios escalonadas (ej: 0-100 unidades = $X, 101+ = $Y)
  - **Opción 5:** Convenios especiales (ej: "con Sanatorio X, 20% descuento")
  
- [ ] **Configuración por Jurisdicción**
  - Cada cámara puede tener su sistema de valores
  - Histórico de cambios de valores con fecha efectiva
  
- [ ] **Cálculo de Cobertura Mejorado**
  - Motor debe soportar todos los métodos de valorización
  - Prioridad de métodos cuando hay conflicto
  - Override manual en auditoría

---

## 🟡 PRIORIDAD MEDIA - Funcionalidades IA Gratuitas

### 6. INTEGRACIÓN DE IA - APIs Sin Costo
- [ ] **Asistente de Auditoría (IA)**
  - **API:** OpenRouter (modelos gratuitos como Llama 3, Mixtral)
  - **Funcionalidad:** Analizar contexto de auditoría y sugerir decisión
  - Inputs: Datos del afiliado, práctica, historial
  - Output: Recomendación (aprobar/rechazar) + justificación
  
- [ ] **Detección de Anomalías (IA)**
  - **API:** Usar modelo local o Hugging Face Inference (gratuito)
  - Detectar patrones inusuales en auditorías
  - Ej: Frecuencia anormal de misma práctica, valores fuera de rango
  - Alerta automática cuando detecta anomalía
  
- [ ] **Chat de Consultas Mejorado con IA**
  - **API:** Groq (Llama 3 gratis, muy rápido)
  - Responder preguntas sobre nomencladores
  - "¿Qué código uso para radiografía de tórax?"
  - "¿Cuál es el valor actual del Galeno?"
  - Contexto: Base de datos de nomencladores + valores
  
- [ ] **Homologación Asistida por IA**
  - **API:** OpenAI Embeddings (tier gratuito limitado) o alternativa CLIP de HF
  - Generar embeddings de descripciones
  - Sugerir homologaciones por similitud semántica
  - Aprender de homologaciones confirmadas
  
- [ ] **Extracción de PDF con IA**
  - **API:** LlamaParse (gratuito hasta 1000 páginas/día) o Gemini Flash (gratis)
  - Parsear PDFs complejos de nomencladores
  - Extraer tablas automáticamente
  - Estructurar en CSV sin intervención manual

---

## 🟢 PRIORIDAD BAJA - Mejoras y Escalabilidad

### 7. MEJORAS GENERALES
- [ ] **Dashboard Mejorado**
  - Gráficos de tendencias (auditorías por mes)
  - Comparativa entre cámaras
  - KPIs principales en cards grandes
  
- [ ] **Reportes Personalizados**
  - Generador de reportes con filtros dinámicos
  - Exportar a Excel/PDF
  - Templates guardados
  
- [ ] **Notificaciones Push**
  - Notificaciones en navegador
  - Email para alertas críticas
  - Resumen diario opcional
  
- [ ] **Auditoría de Cambios**
  - Log completo de todas las acciones
  - Quién modificó qué y cuándo
  - Filtrable por usuario/fecha/tipo
  
- [ ] **Permisos Granulares**
  - Más roles (ej: "Auditor Junior" con permisos limitados)
  - Permisos por módulo
  - Control de acceso a nomencladores específicos

---

## 📊 SUGERENCIAS ADICIONALES DE MEJORA

### 8. OPTIMIZACIONES
- [ ] **Performance**
  - Paginación en listados grandes (>1000 registros)
  - Lazy loading de tablas
  - Cache de consultas frecuentes
  
- [ ] **UX/UI**
  - Tooltips explicativos en campos complejos
  - Tutoriales interactivos (onboarding)
  - Accesibilidad (ARIA labels, contraste)
  
- [ ] **Integraciones**
  - API REST para terceros
  - Webhooks para eventos importantes
  - Exportar datos a sistemas contables

---

## 🎯 ROADMAP SUGERIDO

### Fase 1 (2-3 semanas)
1. Nomencladores Externos: PDF upload + auto-extracción
2. Nomencladores Internos: Rediseño multi-tipo con pestañas
3. Valores: Sistema flexible con múltiples métodos

### Fase 2 (2-3 semanas)
4. Homologador completo
5. Backup y Sincronización
6. IA: Chat de consultas + Detección de anomalías

### Fase 3 (1-2 semanas)
7. IA: Asistente de auditoría + Homologación asistida
8. Dashboard mejorado
9. Reportes personalizados

---

## 📝 NOTAS TÉCNICAS

### APIs Gratuitas Recomendadas
1. **Groq** (Llama 3.1 70B) - Gratis, rapidísimo, ideal para chat
2. **Together AI** - Tier gratuito generoso, varios modelos
3. **Hugging Face Inference** - Modelos open source gratis
4. **LlamaParse** - PDF parsing, 1000 páginas/día gratis
5. **Gemini Flash** - Google, tier gratuito con límites
6. **OpenRouter** - Acceso a múltiples modelos, algunos gratis

### Stack Tecnológico para IA
- **Embeddings:** `@xenova/transformers` (corre en el navegador, gratis)
- **OCR:** Tesseract.js (JavaScript, totalmente gratuito)
- **ML Local:** TensorFlow.js para patrones simples
- **Vector DB:** Supabase pgvector (ya incluido)

---

## ✅ COMPLETADO
- Sistema base de auditorías
- Dashboard reactivo
- Calculadora de cobertura
- Alertas presupuestarias
- Chat básico (sin IA todavía)
- Agenda
- Sistema de usuarios y roles
- Nomencladores (versión básica)
- PDF Export de auditorías
- Realtime con Supabase
- Diseño dinámico por jurisdicción (celeste/verde)
- Modo oscuro

---

**Total de tareas pendientes:** ~45 tareas principales  
**Tiempo estimado total:** 6-8 semanas de desarrollo intensivo
