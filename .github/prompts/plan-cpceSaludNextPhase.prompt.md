# Plan: CPCE Salud — Revisión Integral y Próxima Fase

## Estado real al 2/03/2026

- ✅ App productiva en Vercel con **23 rutas** compiladas (incluye `/buscador`).
- ✅ Migraciones aplicadas en Supabase:
	- `008_protocols_table.sql` (tabla `protocols` creada)
	- `009_practice_normativa.sql` (columnas `normativa`, `coseguro` en `practices`)
- ✅ Buscador integrado en sidebar y command palette.
- ✅ Módulo de protocolos ya migrado a DB (sin hardcode).

## Resultado de pruebas automatizadas ejecutadas

### Exitosas
- `npx next build` → OK (23/23 páginas)
- `npx tsx scripts/testCoverage.ts` → OK
- `npx tsx scripts/finalCheck.ts` → OK
- `npx tsx scripts/testSupabase.ts` → OK (14/14 tablas esperadas)

### Observadas
- `npm run lint` → falla por deuda técnica preexistente (no bloqueante para build).
- `scripts/testAll.ts` fallaba por uso síncrono de servicios asíncronos; corregido en esta sesión.

## Enfoque de la próxima etapa (sin romper lo construido)

### Objetivo
Hacer una **revisión integral de usabilidad + permisos + datos reales** antes de abrir nuevos módulos grandes.

### Track A — Estabilidad técnica (automática)
1. Ejecutar suite smoke en cada ronda:
	 - `npm run test:coverage`
	 - `npm run test:all`
	 - `npm run test:final`
	 - `npm run test:supabase`
2. Mantener `next build` como gate obligatorio antes de merge.
3. Tratar `lint` como deuda gradual (no frenar feature delivery mientras build esté verde).

#### Política de calidad de pruebas (regla obligatoria)
- Las pruebas existen para detectar fallos reales, inconsistencias y regresiones.
- Si una prueba falla, la acción por defecto es **corregir la app**, no “maquillar” la prueba.
- Solo se modifica una prueba cuando está objetivamente mal especificada o desactualizada respecto a una regla de negocio aprobada.
- Cualquier cambio en tests debe dejar explícito qué contrato valida y por qué cambió.
- No se aceptan cambios que solo busquen “poner todo en verde” sin corregir la causa raíz en producto.

### Track B — Revisión funcional integral (manual guiada)
Revisión por módulos críticos en este orden:
1. Login + navegación + permisos visibles
2. Calculator + Pending + Audits (flujo núcleo)
3. Patients + Agenda + Alerts + Chat
4. Practices + External + Matcher + Protocols + Buscador
5. Settings + Users + Backup + Help

Cada módulo se valida con 4 preguntas:
- ¿Se entiende en menos de 10 segundos?
- ¿La acción principal está clara?
- ¿Hay duplicación de pasos?
- ¿El rol correcto puede/ no puede operar?

### Track C — Simplificación UX (sin tirar código)
1. Reducir fricción de navegación (menú + textos + CTAs)
2. Homogeneizar patrones de alta/edición/borrado
3. Priorizar pantallas de uso diario (administrativo y auditor)
4. Dejar backlog de mejoras visuales no críticas

## Matriz de roles vigente para pruebas

Roles existentes hoy en el sistema:
- `superuser`
- `admin`
- `supervisor`
- `auditor`
- `administrativo`
- `gerencia`

Alcance operativo recomendado por rol (base para UAT):
- `superuser`: acceso total, validación transversal de todos los módulos.
- `admin`: operación completa de negocio + configuración + gestión de usuarios.
- `supervisor`: auditorías/pendientes/alertas con foco en control y aprobación.
- `auditor`: calculadora, auditorías, pendientes, protocolos, buscador, pacientes (solo consulta).
- `administrativo`: pacientes, agenda, calculadora y seguimiento operativo diario.
- `gerencia`: dashboard + vistas de lectura para indicadores y trazabilidad.

Usuarios detectados en DB para pruebas:
- `aldowagner@gmail.com` → superuser
- `admin@cpce.org.ar` → admin
- `carlos.lopez@cpce.org.ar` → supervisor
- `maria.garcia@cpce.org.ar` → auditor
- `ana.rodriguez@cpce.org.ar` → auditor

> Nota: la contraseña no puede recuperarse por código cliente; para pruebas por rol usar reset de password desde Supabase Auth (Dashboard) o crear cuentas test dedicadas desde Dashboard.

## Preparación de usuarios de prueba (recomendado)

Crear 1 usuario por rol con naming estable:
- `test.superuser@cpce.org.ar`
- `test.admin@cpce.org.ar`
- `test.supervisor@cpce.org.ar`
- `test.auditor@cpce.org.ar`
- `test.administrativo@cpce.org.ar`
- `test.gerencia@cpce.org.ar`

Convención sugerida de password (entorno test):
- `CpceTest!2026-ROL`

## Integración futura afiliado/prestador (pregunta abierta)

Es técnicamente viable y queda como **fase posterior**:
- Portal afiliado (consultas, documentos, estado de trámite)
- Portal prestador (autorizaciones, facturación, seguimiento)
- Unificación en mismo backend con roles y RLS por tipo de usuario

## Próximos pasos inmediatos

1. Correr `npm run test:smoke` y congelar baseline de resultados.
2. Hacer revisión integral por rol (sesión guiada módulo por módulo).
3. Consolidar lista corta de ajustes UX de alto impacto.
4. Recién después de eso, arrancar nuevos módulos (providers/support/authorizations).

## Cierre de fase de pruebas (para evitar alargue)

### Estado de avance estimado
- Progreso actual de esta fase: **~85% completado**.
- Falta real para cierre: **~15%** (1 a 2 sesiones de revisión guiada).

### Criterio de salida (Definition of Done)
Se da por concluida esta fase cuando se cumplan estas 4 condiciones:
1. `next build` en verde.
2. `npm run test:smoke` en verde.
3. Checklist funcional por rol completada (superuser, admin, supervisor, auditor, administrativo, gerencia).
4. Lista priorizada de hallazgos UX cerrada en:
	- Críticos (bloqueantes): resueltos
	- Medios/Bajos: backlog con prioridad

### Regla de corte
- Si las condiciones 1, 2 y 3 están cumplidas, **no** se extiende la fase por temas cosméticos.
- Lo visual no bloqueante pasa a fase UI/UX.

## Próxima fase inmediata: UI/UX integral (prioridad 1)

Objetivo: interfaz moderna, profesional, intuitiva y totalmente interconectada, sin romper lógica existente.

### Orden propuesto
1. Definir arquitectura de navegación global (mapa de flujos entre módulos).
2. Definir patrón único de pantalla (header, acciones, filtros, tabla, detalle, feedback).
3. Definir sistema de ayuda contextual:
	- tips inline
	- tutorial guiado por rol (primer ingreso)
4. Aplicar rediseño por tandas (primero módulos de uso diario: Dashboard, Calculator, Pending, Audits, Patients).

### Dependencias previas mínimas (antes de rediseñar todo)
- Mantener verde build + smoke.
- Acordar guía de estilo UX (espaciados, densidad, jerarquía visual, microcopy).
- Confirmar flujo principal por rol (qué hace cada uno en 3-5 pasos).
