# 🔄 Migración de Homologaciones - Instrucciones

## ✅ ¿Qué se ha completado?

Se ha implementado el sistema completo de **Homologador** (Task 4 del ROADMAP):

### 📦 Archivos nuevos creados:
1. **Migración SQL**: `/supabase/migrations/003_homologations.sql`
   - Tabla `homologations` con soporte 1:N (una práctica interna → múltiples códigos externos)
   - Índices optimizados para búsquedas rápidas
   - Constraint único en (external_nomenclator_id, external_code)

2. **Servicio Backend**: `/src/services/homologationService.ts`
   - 8 métodos CRUD completos
   - Sistema de sugerencias con fuzzy matching
   - Bulk import de homologaciones
   - Estadísticas de homologación

3. **Componente UI**: `/src/components/practices/Homologator.tsx`
   - Interfaz side-by-side (práctica externa ← → práctica interna)
   - Sugerencias automáticas con scoring
   - Buscador de prácticas internas
   - Ratio de conversión configurable
   - Confirmación con modal

4. **Página**: `/src/app/practices/external/[id]/homologate/page.tsx`
   - Ruta: `/practices/external/{id}/homologate`
   - Integración completa con el Homologator

5. **Hook personalizado**: `/src/hooks/use-toast.ts`
   - Para notificaciones toast en toda la app

### 🔧 Archivos modificados:
- `/src/app/practices/external/[id]/page.tsx`
  - Botón "Homologador" agregado
  - Tab "Homologaciones" para ver vínculos existentes
  - Tabla de homologaciones con paginación
  - Opción de eliminar homologaciones

---

## 🚨 ACCIÓN REQUERIDA: Ejecutar Migración SQL

La tabla `homologations` **aún no existe en tu base de datos**. Debes ejecutar la migración manualmente.

### ✅ Opción 1: Dashboard de Supabase (RECOMENDADO)

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto **CPCE Salud**
3. En el menú lateral, haz clic en **SQL Editor**
4. Haz clic en **+ New Query**
5. Copia y pega TODO el contenido de: `supabase/migrations/003_homologations.sql`
6. Haz clic en **Run** (o presiona `Ctrl+Enter`)
7. Deberías ver: ✅ **"Tabla homologations creada exitosamente"**

### ⚙️ Opción 2: Script de Node (alternativa)

```bash
# Instalar dependencias (si no están instaladas)
npm install

# Ejecutar script de migración
npx ts-node scripts/runHomologationsMigration.ts
```

**Nota**: El script puede fallar si Supabase no tiene la función `exec_sql`. En ese caso, usa la Opción 1.

---

## 🧪 Verificar que la migración funcionó

Después de ejecutar la migración, verifica en el **Table Editor** de Supabase que existe la tabla:

```
homologations
├── id (uuid)
├── internal_practice_id (bigint)
├── external_nomenclator_id (int)
├── external_code (varchar)
├── external_description (text)
├── ratio (decimal)
├── mapping_type (varchar)
├── confidence_score (decimal)
├── notes (text)
├── created_by (int)
├── updated_by (int)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

---

## 🎯 Cómo usar el Homologador

1. Ve a **Prácticas > Nomencladores Externos**
2. Selecciona un nomenclador (ej: NUN, FAAAR, etc.)
3. Haz clic en el botón **"Homologador"** (arriba a la derecha)
4. En la columna izquierda, selecciona una práctica externa sin homologar
5. El sistema mostrará **sugerencias automáticas** con % de coincidencia
6. O busca manualmente una práctica interna usando el buscador
7. Haz clic en la práctica interna deseada
8. Configura el **ratio de conversión** (por defecto 1.0)
9. Agrega notas opcionales
10. Confirma la homologación

### 📊 Ver homologaciones existentes

1. Ve a la página del nomenclador
2. Haz clic en el tab **"Homologaciones"**
3. Verás todas las homologaciones con código externo → código interno
4. Puedes eliminar homologaciones con el botón de acción

---

## 🚀 Siguiente paso

Una vez ejecutada la migración, prueba el Homologador:

```bash
# Iniciar app en desarrollo
npm run dev

# Ir a:
http://localhost:3000/practices/external
```

---

## 📝 Próximas Tareas (ROADMAP)

- [x] Task 1: Sistema flexible nomencladores externos
- [x] Task 2: PDF upload con extracción automática
- [x] Task 3: Nomencladores internos multi-tipo
- [x] Task 4: Homologador con sugerencias automáticas ✨ **COMPLETADO**
- [ ] Task 5: Sistema valores flexible (fijo, porcentaje, escalonado)
- [ ] Task 6: Backup y sincronización
- [ ] Task 7-9: Integraciones IA (chat, anomalías, auditoría)
