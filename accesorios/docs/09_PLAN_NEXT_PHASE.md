# Plan: CPCE Salud — Próxima Etapa de Evolución

## Contexto Actual

La app está live en https://cpce-gestion.vercel.app/ con 22 páginas compiladas, 100% migrada a Supabase. Stack: Next.js 16 + TypeScript + Tailwind + Supabase (free tier) + Vercel.

**Módulos existentes:** Login, Dashboard, Calculator, Audits, Patients, Agenda, Alerts, Chat, Pending, Backup, Protocols, Practices, External Nomenclators, Matcher, Settings, Users, Help.

---

## 1. Interfaz de Bienvenida + Botón Home Global

### 1.1 Landing/Welcome Page
- Splash screen animado con logo CPCE al entrar
- Resumen visual del rol del usuario (qué puede hacer)
- Accesos directos personalizados según rol
- Noticias/avisos del sistema (tabla `announcements`)
- Indicadores clave del día (auditorías pendientes, alertas activas, turnos próximos)

### 1.2 Botón Home Persistente
- Botón/logo fijo en el header que siempre lleva a https://cpce-gestion.vercel.app/
- Breadcrumb dinámico en todas las páginas
- Navegación por teclado (Ctrl+H = Home)

---

## 2. Dashboard Expandido — Centro de Comando

### 2.1 KPIs en Tiempo Real
- **Auditorías hoy/semana/mes** con gráfico de tendencia (sparklines)
- **Tasa de aprobación** (% aprobadas vs rechazadas)
- **Monto total cubierto** por período con comparativa interanual
- **Afiliados activos** vs suspendidos vs bajas (gráfico de dona)
- **Top 10 prácticas** más solicitadas (bar chart horizontal)
- **Gasto por categoría** (Consultas, Cirugías, Estudios, Farmacia)

### 2.2 Módulo de Estadísticas Avanzadas `/stats`
- Filtros dinámicos: jurisdicción, período, plan, categoría, prestador
- Gráficos: línea temporal, barras comparativas, torta por categoría
- **Costeo por afiliado:** gasto promedio, desvío, outliers
- **Siniestralidad:** ratio costo/ingreso por plan
- **Estacionalidad:** patrones de consumo por mes
- Exportación a PDF/Excel de cualquier reporte

### 2.3 Panel de Control Gerencial `/executive`
- Vista C-level: 4-6 indicadores clave con semáforo (verde/amarillo/rojo)
- Comparativa Cámara I vs Cámara II
- Proyección de gasto a 3/6/12 meses (regresión lineal simple)
- Detección automática de anomalías (desvíos > 2σ)

---

## 3. Nuevos Módulos Propuestos

### 3.1 Prestadores `/providers`
- CRUD de prestadores (médicos, clínicas, laboratorios, farmacias)
- Categorización: conveniados vs no conveniados
- Tarifario por prestador
- Historial de servicios prestados
- Geolocalización (mapa de red prestacional)
- Calificación interna del prestador

### 3.2 Facturación y Débitos `/billing`
- Carga de facturas de prestadores
- Conciliación automática: factura vs auditoría aprobada
- Débitos por diferencia de aranceles
- Estado de pago: pendiente / pagado / en disputa
- Reporte mensual de liquidación

### 3.3 Farmacia `/pharmacy`
- Catálogo de medicamentos (vademécum)
- Cobertura por plan (% según tipo: genérico, marca, crónico)
- Validación de recetas (vigencia, dosis, interacciones)
- Control de frecuencia de dispensación
- Integración futura con droguerías

### 3.4 Autorizaciones `/authorizations`
- Workflow completo: solicitud → evaluación → autorización/rechazo
- Formularios diferenciados por tipo de práctica
- Adjuntos: órdenes médicas, estudios previos, presupuestos
- Firma digital del auditor
- Trazabilidad completa del expediente
- Notificación al afiliado y prestador

### 3.5 Reportes Regulatorios `/reports`
- Generación automática de reportes para Superintendencia de Salud
- SUR (Sistema Único de Reintegros)
- PAMI / INSSJP si aplica
- Informes mensuales obligatorios
- Exportación en formatos requeridos (CSV, XML, PDF)

### 3.6 Coseguros y Copagos `/copayments`
- Configuración de coseguros por plan/práctica
- Simulador de copago para el afiliado
- Historial de copagos por afiliado
- Bonificaciones y excepciones

### 3.7 Convenios y Contratos `/agreements`
- Gestión de convenios con prestadores
- Vigencia, renovación, cláusulas
- Aranceles pactados vs nomenclador
- Alertas de vencimiento de convenios

### 3.8 Mesa de Ayuda al Afiliado `/support`
- Tickets de consulta del afiliado
- Estado de trámites en curso
- FAQ autoservicio
- Chat con operador (ya tenemos base de chat)

### 3.9 Auditoría Médica Avanzada `/medical-audit`
- Integrar el sistema actual de auditoría de la obra social
- Auditoría concurrente (durante la internación)
- Auditoría retrospectiva (post-prestación)
- Protocolos clínicos automatizados
- Score de riesgo por afiliado
- Comité de auditoría: votación y actas

### 3.10 Credenciales Digitales `/credentials`
- Generación de credencial digital del afiliado
- QR code para validación en prestadores
- Verificación online de cobertura vigente
- Historial de credenciales emitidas

---

## 4. Sistema de Roles y Permisos

### 4.1 Roles Propuestos
| Rol | Acceso |
|-----|--------|
| `superadmin` | Todo. Ambas jurisdicciones. Configuración global. |
| `admin` | Todo dentro de su jurisdicción. Gestión de usuarios. |
| `auditor_medico` | Calculator, Audits, Pending, Authorizations, Protocols, Medical Audit. Solo lectura en Patients. |
| `administrativo` | Patients, Billing, Copayments, Support. No puede auditar. |
| `prestador` | Solo ve sus propias prácticas, facturas y autorizaciones. |
| `afiliado` | Portal del afiliado: credencial, copagos, autorizaciones propias, tickets. |
| `gerencia` | Dashboard ejecutivo, Stats, Reports. Solo lectura. |
| `farmacia` | Módulo de farmacia, recetas, dispensación. |

### 4.2 Implementación Técnica
- Tabla `roles` y `user_roles` en Supabase (many-to-many)
- Middleware Next.js que valida rol en cada ruta
- RLS policies por rol (ya tenemos la base en 005_rls_policies.sql)
- Componente `<RequireRole roles={['admin','auditor']}>` wrapper
- Menú lateral dinámico: solo muestra módulos permitidos
- Audit log de accesos sensibles

### 4.3 Matriz de Permisos
- Definir acción × módulo × rol (CRUD)
- UI de configuración para que el admin modifique permisos sin código
- Granularidad: ver / crear / editar / eliminar / exportar / aprobar

---

## 5. Integración del Sistema de Auditoría Actual

> **Pendiente:** El usuario mostrará el sistema actual para entender qué integrar.

### 5.1 Preguntas a resolver
- ¿Es un sistema externo (web, Excel, papel)? ¿API disponible?
- ¿Qué datos maneja que CPCE Salud no tiene hoy?
- ¿Hay que importar histórico?
- ¿Coexisten o se reemplaza?

### 5.2 Estrategia de integración
- Mapeo de campos: sistema actual → tablas Supabase
- Migración de datos históricos (script ETL)
- Período de uso paralelo con validación cruzada
- Cutover cuando ambos sistemas coincidan

---

## 6. Mejoras Técnicas Prioritarias

### 6.1 Performance
- Server Components donde no haya interactividad
- Lazy loading de módulos pesados (charts, PDF)
- Optimistic UI en operaciones CRUD
- Cache con React Query / SWR

### 6.2 UX
- Tema oscuro/claro
- Responsive completo (mobile-first para prestadores/afiliados)
- Notificaciones push (web push via Supabase Edge Functions)
- Onboarding wizard para usuarios nuevos
- Shortcuts de teclado (Ctrl+K command palette)

### 6.3 Seguridad
- MFA (Multi-Factor Authentication) via Supabase Auth
- Session timeout configurable
- IP whitelist para admin
- Audit trail completo de cada operación
- Encriptación de datos sensibles (DNI, datos médicos)

---

## 7. Roadmap de Implementación (Priorizado según decisiones)

### Fase 1 — Fundación (prioridad máxima)
- [ ] Sistema de roles y permisos (DB + middleware + menú dinámico)
- [ ] Welcome page: combo KPIs arriba + grid módulos abajo
- [ ] Botón Home global persistente
- [ ] Dashboard expandido con KPIs reales de Supabase
- [ ] Módulo de ingresos/recaudación por plan

### Fase 2 — Estadísticas y Comunicación
- [ ] Estadísticas avanzadas `/stats` (gráficos, filtros, exportación)
- [ ] Panel ejecutivo `/executive` (semáforos, comparativa cámaras, proyecciones)
- [ ] Tablero de anuncios / noticias del sistema
- [ ] Mejoras al chat interno
- [ ] Notificaciones por email automáticas

### Fase 3 — Integración + Módulos Core
- [ ] **Integrar sistema de auditoría actual** (post-review del software)
- [ ] Prestadores `/providers` (CRUD + tarifario)
- [ ] Autorizaciones `/authorizations` con workflow completo
- [ ] Facturación y débitos `/billing`

### Fase 4 — Operaciones Extendidas
- [ ] Coseguros y copagos `/copayments`
- [ ] Farmacia `/pharmacy`
- [ ] Convenios y contratos `/agreements`
- [ ] Reportes regulatorios `/reports`

### Fase 5 — Portales Externos (escala masiva)
- [ ] Portal del prestador (facturas, autorizaciones, comunicación)
- [ ] Portal del afiliado (credencial digital, trámites, WhatsApp)
- [ ] Mesa de ayuda al afiliado `/support`
- [ ] Integración WhatsApp Business

---

## 8. Restricciones

- **Costo $0:** Mantener todo en free tier (Supabase + Vercel)
- **Sin dependencias externas:** No APIs pagas, no servicios premium
- **Offline-capable:** Considerar PWA para uso en zonas sin conexión estable
- **Regulatorio:** Cumplir normativa de datos de salud (Ley 25.326 Protección de Datos Personales)

---

## 9. Decisiones del Usuario (Brainstorm 02/03/2026)

### Usuarios y Roles
- **Ahora:** Gerente (controla todo), auditores, administrativos
- **Fase futura 1:** Incorporar rol prestador (comunicación financiador ↔ prestador)
- **Fase futura 2:** Portal de afiliados (comunicación directa afiliado ↔ financiador)
- **Alcance inicial:** 5-20 usuarios internos
- **Alcance final:** Decenas de miles (al incluir portales de prestadores y afiliados)

### Prioridad de Implementación
1. **Sistema de roles y permisos** (lo más urgente)
2. **Dashboard con estadísticas reales** (segundo)
3. Autorizaciones con workflow y sistema de auditoría actual → más adelante

### Pantalla de Bienvenida
- **Decisión:** Combo — Dashboard con KPIs arriba + grid de módulos disponibles abajo
- Personalizado por rol (cada rol ve solo sus módulos)
- Botón Home siempre visible para volver a https://cpce-gestion.vercel.app/

### Estética Visual
- **Decisión:** Mantener la estética actual (azul/indigo + naranjas)
- No rediseñar ahora

### Canales de Comunicación (TODOS)
- Chat interno entre usuarios (ya existe, mejorar)
- Tablero de anuncios / noticias del sistema
- Notificaciones por email automáticas
- Integración con WhatsApp Business (fase futura)
- Filosofía: **todas las vías de comunicación posibles**

### Estadísticas y Métricas (EXHAUSTIVO)
- Productividad de auditoría (volumen, tiempos, resultados)
- Análisis financiero / costos (gasto por plan, categoría, afiliado)
- Patrones de consumo y detección de anomalías
- Demografía del padrón (activos, altas/bajas, composición)
- **Adicionales pedidos por el usuario:**
  - Tasas de uso por servicio
  - Población etaria y gasto por edad
  - Evolución de gastos mensuales
  - Ingresos y recaudación por plan
  - Costo de programas implementados
  - "Cientos de variables" → sistema de métricas extensible y configurable

### Módulo de Ingresos
- **Decisión:** SÍ — Cargar recaudación por plan para calcular siniestralidad real
- Ratio ingreso/gasto por plan como KPI gerencial clave

### Sistema de Auditoría Actual
- Es un **software web externo** (otra app)
- El usuario lo mostrará cuando tenga acceso (está fuera de oficina)
- **No avanzar con integración hasta que lo muestre**

### Inicio de Implementación
- **Hoy:** Solo planificación completa
- **Después:** El usuario mostrará el sistema actual de auditoría
- **Luego:** Arrancar Fase 1 (roles + welcome + dashboard)

---

## Próximos Pasos Inmediatos

1. El usuario muestra el sistema de auditoría actual
2. Definimos juntos qué módulos priorizar
3. Arrancamos Fase 1: welcome + roles + dashboard
