# 8. ESTRATEGIA DE INFRAESTRUCTURA Y COSTOS (Bases de Datos)

> Análisis de opciones para alojar los datos de CPCE Salud priorizando bajo costo, facilidad de uso y escalabilidad.

---

## 1. El Dilema: ¿Dónde guardamos los datos?

Actualmente, la app usa "Datos Mock" (en memoria). Si cierras la ventana, los cambios se pierden. Para uso real, necesitamos una Base de Datos (DB) persistente en la nube.

Aquí las 3 mejores opciones del mercado para tu caso:

---

## OPCIÓN A: Supabase (Recomendada 🌟)

Supabase es una alternativa "Open Source" a Firebase. Te da una base de datos PostgreSQL real con un panel de control tipo Excel muy fácil de usar.

### ✅ Ventajas
- **Costo CERO (Free Tier)**:
    - Base de datos de **500 MB** (Suficiente para ~5 millones de registros de auditoría).
    - Ancho de banda ilimitado para uso normal.
    - Proyectos inactivos se "pausan" tras 1 semana sin uso (pero se reactivan en segundos al entrar).
- **Panel Visual**: Puedes ver, editar y filtrar tus tablas como si fuera un Excel online.
- **Importación CSV**: Arrastrar y soltar para cargas masivas.
- **SQL Power**: Si el día de mañana quieres reportes complejos, tienes un motor SQL completo.

### ❌ Contras
- La pausa automática del Free Tier (si no usas la app en 7 días, el primer arranque tarda unos segundos extra). *Solución: Pagar $25/mes o simplemente "despertarla" entrando al panel.*

### 🛠 Esfuerzo de Implementación
- **Bajo**. La app ya está diseñada pensando en tipos de datos relacionales.

---

## OPCIÓN B: Google Sheets como Backend

Usar una hoja de cálculo de Google como base de datos. La app lee y escribe en el Sheet.

### ✅ Ventajas
- **Familiaridad Total**: Ya sabes usar Excel/Sheets.
- **Costo CERO Absoluto**: Sin límites de "pausa".
- **Edición**: Editas un valor en el Sheet y la app lo refleja.

### ❌ Contras
- **Lentitud**: Es mucho más lento que una DB real.
- **Fragilidad**: Si alguien borra una columna o cambia un nombre de hoja por error, la app deja de funcionar ("rompe" fácil).
- **Relaciones**: Cruzar datos (ej. "Traeme todas las prácticas de tal afiliado") es difícil y lento.
- **Seguridad**: Menos control sobre quién puede ver qué.

### 🛠 Esfuerzo de Implementación
- **Medio/Alto**. Requiere configurar APIs de Google Cloud y lidiar con cuotas de lectura/escritura.

---

## OPCIÓN C: Vercel Postgres

Usar la base de datos integrada de Vercel (donde probablemente alojemos la web).

### ✅ Ventajas
- **Integración Nativa**: Todo queda en el mismo lugar (Vercel).

### ❌ Contras
- **Free Tier Limitado**: Solo 256 MB de almacenamiento y límites más estrictos de horas de cómputo (60 horas/mes).
- **Sin Panel Visual**: No tiene un panel tan amigable como Supabase ("Table Editor") para importar CSVs manualmente. Es más para desarrolladores ("Code-first").

---

## 🏆 Conclusión y Recomendación

**Ganador Indiscutible: SUPABASE (Free Tier)**

Por qué:
1.  **Capacidad Generosa**: 500MB es muchísimo para datos de texto. Tardarás años en llenarlo.
2.  **Facilidad de Gestión**: Su importador de CSV es clave para tu necesidad de "meter datos reales".
3.  **Escalabilidad**: Si el CPCE decide oficializar esto y pagar, el plan Pro ($25) es barato para una institución.
4.  **Seguridad**: Manejo profesional de usuarios y permisos (RLS).

---

## Plan de Acción Sugerido

1.  **Cuenta**: Crear cuenta en [supabase.com](https://supabase.com) (Necesitas GitHub o Email).
2.  **Proyecto**: Crear "cpce-salud-db".
3.  **Configuración**: Te pasaré el script SQL para crear las tablas (`practices`, `affiliates`, etc.) en un click.
4.  **Carga**: Usarás la *Guía de Gestión de Datos* para subir tus CSVs.
5.  **Conexión**: Actualizaremos la app (`src/services/api.ts`) con las credenciales de Supabase.

¿Procedemos con este plan?
