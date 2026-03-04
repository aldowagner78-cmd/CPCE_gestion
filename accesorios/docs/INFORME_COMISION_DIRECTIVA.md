# INFORME DE AVANCE — SISTEMA DE GESTIÓN CPCE SALUD

> **Documento para**: Comisión Directiva del CPCE  
> **Fecha de emisión**: 3 de marzo de 2026  
> **Versión del sistema**: 0.1.0 (MVP en desarrollo)  
> **Estado general**: Operativo en entorno de pruebas — pendiente carga de datos reales  

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Visión del Proyecto](#2-visión-del-proyecto)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Arquitectura General](#4-arquitectura-general)
5. [Sistema de Roles y Permisos](#5-sistema-de-roles-y-permisos)
6. [Módulos del Sistema — Manual Funcional](#6-módulos-del-sistema--manual-funcional)
   - 6.1 Autenticación y Bienvenida
   - 6.2 Dashboard y Módulos
   - 6.3 Agenda
   - 6.4 Pacientes (Afiliados)
   - 6.5 Historial de Consumos
   - 6.6 Calculadora de Cobertura
   - 6.7 Homologador de Nomencladores
   - 6.8 Nomencladores
   - 6.9 Protocolos
   - 6.10 Circuito de Auditoría Médica (Core)
   - 6.11 Facturación (Auditoría Posterior)
   - 6.12 Reportes y Estadísticas
   - 6.13 Chat Interno
   - 6.14 Alertas
   - 6.15 Gestión de Usuarios
   - 6.16 Valores y Configuración
   - 6.17 Backup
7. [Base de Datos — Modelo de Datos](#7-base-de-datos--modelo-de-datos)
8. [Historial de Desarrollo](#8-historial-de-desarrollo)
9. [Métricas del Proyecto](#9-métricas-del-proyecto)
10. [Roadmap y Próximos Pasos](#10-roadmap-y-próximos-pasos)

---

## 1. RESUMEN EJECUTIVO

Se ha desarrollado un sistema integral de gestión para CPCE Salud orientado a digitalizar y automatizar el circuito completo de auditoría médica, desde la recepción de la solicitud del afiliado hasta la facturación y generación de estadísticas.

El sistema está construido como una **aplicación web moderna** (accesible desde cualquier navegador sin instalación) e incluye:

- **31 pantallas/páginas** funcionales
- **14 migraciones** de base de datos
- **~26.000 líneas de código** TypeScript/React
- **~2.600 líneas** de SQL para modelo de datos
- **56 commits** de desarrollo documentados
- **6 roles de usuario** con permisos granulares
- **Soporte multi-jurisdicción** (Cámara I Santa Fe / Cámara II Rosario)

### Funcionalidades destacadas ya implementadas:

| Funcionalidad | Estado |
|---|---|
| Autenticación con roles | ✅ Operativo |
| Padrón de afiliados con búsqueda | ✅ Operativo |
| Nomenclador interno multi-tipo | ✅ Operativo |
| Nomencladores externos (PDF upload) | ✅ Operativo |
| Homologador de nomencladores | ✅ Operativo |
| Calculadora de cobertura | ✅ Operativo |
| Protocolos de auditoría | ✅ Operativo |
| **Solicitud de expediente digital** | ✅ Operativo |
| **Motor de reglas automático (semáforo)** | ✅ Operativo |
| **Bandeja del auditor** | ✅ Operativo |
| **Resolución por práctica individual** | ✅ Operativo |
| **Constancias PDF + Observaciones** | ✅ Operativo |
| **Apelaciones y mesa de control** | ✅ Operativo |
| **Auditoría posterior (facturación)** | ✅ Operativo |
| **Dashboard de reportes con gráficos** | ✅ Operativo |
| **Historial de consumos por afiliado** | ✅ Operativo |
| Diagnóstico CIE-10 buscable | ✅ Operativo |
| Exportación PDF y CSV | ✅ Operativo |
| Chat interno entre usuarios | ✅ Operativo |
| Agenda | ✅ Operativo |
| Backup de datos | ✅ Operativo |

---

## 2. VISIÓN DEL PROYECTO

### Objetivo General
Proveer al CPCE Salud de una herramienta digital unificada que permita gestionar todo el ciclo de vida de la auditoría médica de obra social, eliminando procesos manuales, reduciendo tiempos de respuesta y proporcionando trazabilidad completa de cada expediente.

### Objetivos Específicos
1. **Digitalizar la recepción**: El administrativo carga la solicitud en formato digital (afiliado, prácticas, adjuntos) en lugar de papel.
2. **Automatizar la pre-validación**: Un motor de reglas evalúa automáticamente cobertura, frecuencia, topes y requisitos *antes* de que llegue al auditor.
3. **Auto-aprobar lo que corresponda**: Prácticas en "semáforo verde" se autorizan instantáneamente, liberando al auditor para los casos complejos.
4. **Centralizar la decisión del auditor**: Bandeja unificada con toda la información necesaria para decidir (ficha del afiliado, consumos previos, reglas evaluadas, adjuntos).
5. **Garantizar trazabilidad**: Cada acción queda registrada con usuario, fecha y motivo. Se puede auditar quién hizo qué y cuándo.
6. **Controlar la facturación**: Cruce automático de facturas de prestadores contra autorizaciones emitidas, generación de notas de débito.
7. **Generar indicadores de gestión**: Dashboard en tiempo real con KPIs, tendencias mensuales, productividad por auditor, top prácticas.

### Premisas de Diseño
- **Multi-jurisdicción**: Soporta Cámara I (Santa Fe) y Cámara II (Rosario) con datos, configuración y estética separados.
- **Basado en roles**: Cada usuario ve solo lo que le corresponde según su rol.
- **Sin instalación**: Funciona en cualquier navegador moderno (Chrome, Firefox, Edge).
- **Diseño responsive**: Se adapta a pantallas de escritorio, tablet y celular.
- **Seguridad**: Autenticación por email/contraseña, Row Level Security en base de datos.

---

## 3. STACK TECNOLÓGICO

| Componente | Tecnología | Versión | Propósito |
|---|---|---|---|
| **Frontend** | Next.js (React) | 16.1.6 | Framework web de última generación |
| **Lenguaje** | TypeScript | 5.x | Tipado estático, prevención de errores |
| **UI** | Tailwind CSS 4 | 4.x | Estilos modernos y responsivos |
| **Íconos** | Lucide React | 0.563 | Librería de íconos consistente |
| **Gráficos** | Recharts | 3.7.0 | Charts interactivos (barras, tortas, áreas) |
| **Backend/DB** | Supabase | 2.95.3 | PostgreSQL + Auth + Storage + Realtime |
| **Hosting** | Vercel | — | Deploy automático desde GitHub |
| **Repositorio** | GitHub | — | Control de versiones y colaboración |

### ¿Por qué estas tecnologías?

- **Next.js 16 + React 19**: La versión más reciente del framework web líder mundial. Rendimiento optimizado con Turbopack y React Compiler.
- **Supabase**: Alternativa open-source a Firebase basada en PostgreSQL. Ofrece base de datos relacional robusta, autenticación integrada, almacenamiento de archivos y actualizaciones en tiempo real. Sin costo para el nivel de uso actual.
- **TypeScript**: Previene errores de programación comunes mediante tipado estático. Todo el código está tipado.
- **Vercel**: Hosting automático con deploy en cada push a GitHub. SSL, CDN y escalado incluidos.

---

## 4. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIOS                             │
│  Administrativo │ Auditor │ Supervisor │ Admin │ Gerencia│
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (Next.js + React)                 │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Solicitud│ │ Bandeja  │ │ Reportes │ │ Historial│   │
│  │ Nueva    │ │ Auditor  │ │ Gráficos │ │ Consumos │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Calculadora│ │Nomenclador│ │Protocolos│ │Facturac.│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  Motor de Reglas │ Compresor Imágenes │ Generador PDF   │
└────────────────────────┬────────────────────────────────┘
                         │ API REST + Realtime WebSocket
                         ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Supabase)                         │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │  PostgreSQL   │ │  Auth (JWT)   │ │   Storage    │    │
│  │  30+ tablas   │ │  email/pass   │ │  archivos    │    │
│  │  RLS policies │ │  sessions     │ │  imágenes    │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                         │
│  Row Level Security: cada usuario solo ve datos de su   │
│  jurisdicción. Superusuarios ven todo.                  │
└─────────────────────────────────────────────────────────┘
```

---

## 5. SISTEMA DE ROLES Y PERMISOS

El sistema implementa **6 roles** con permisos granulares. Cada usuario es asignado a un rol y a una jurisdicción (Cámara I o Cámara II).

### Matriz de Roles

| Permiso | Superusuario | Admin | Supervisor | Auditor | Administrativo | Gerencia |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calculadora de cobertura | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Ver nomencladores | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestionar nomencladores | ✅ | ✅ | — | — | — | — |
| Ver auditorías | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Crear solicitudes | ✅ | ✅ | ✅ | ✅ | — | — |
| Aprobar/denegar | ✅ | ✅ | ✅ | — | — | — |
| Resolver alertas | ✅ | ✅ | ✅ | — | — | — |
| Chat todos los canales | ✅ | ✅ | ✅ | — | — | — |
| Chat directo | — | — | — | ✅ | ✅ | — |
| Ver agenda | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Crear agenda | ✅ | ✅ | ✅ | — | ✅ | — |
| Ver pacientes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestionar pacientes | ✅ | ✅ | — | — | ✅ | — |
| Configurar valores | ✅ | ✅ | ✅ | — | — | — |
| Gestionar usuarios | ✅ | ✅ | — | — | — | — |
| Exportar backup | ✅ | ✅ | ✅ | — | — | — |
| Homologador | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Ver protocolos | ✅ | ✅ | ✅ | ✅ | — | — |
| Ver estadísticas | ✅ | ✅ | ✅ | — | — | ✅ |
| Ver facturación | ✅ | ✅ | ✅ | — | — | ✅ |

### Descripción de roles:

- **Superusuario**: Acceso total al sistema. Puede cambiar entre jurisdicciones libremente. Ve datos de todas las cámaras.
- **Admin**: Igual que Superusuario pero restringido a su jurisdicción.
- **Supervisor**: Gestiona el flujo de auditoría, reasigna expedientes, resuelve apelaciones, genera reportes.
- **Auditor Médico**: Evalúa solicitudes, aprueba o deniega prácticas, observa expedientes.
- **Administrativo**: Recibe y carga solicitudes, gestiona pacientes y agenda, comunica con auditoría.
- **Gerencia**: Acceso de solo lectura a estadísticas, facturación, nomencladores y pacientes.

---

## 6. MÓDULOS DEL SISTEMA — MANUAL FUNCIONAL

### 6.1 Autenticación y Bienvenida (`/welcome`, `/login`)

**Pantalla de bienvenida** con animación visual y branding del CPCE. Al ingresar se muestra un modal de autenticación donde el usuario ingresa email y contraseña.

**Funcionalidades:**
- Login con email/contraseña (Supabase Auth)
- Opción "Recordarme" para mantener sesión
- Gestión de credenciales de superusuario
- Transición animada splash → formulario de login
- Logout disponible en el header del sistema

**Seguridad:** Autenticación JWT con tokens renovables. Sesiones persistentes opcionales. Los usuarios inactivos son rechazados automáticamente.

---

### 6.2 Dashboard y Módulos (`/`, `/modules`)

**Pantalla principal** que muestra un resumen rápido de la actividad del sistema. La página `/modules` presenta todos los módulos disponibles como tarjetas visuales con su descripción.

**Elementos clave:**
- KPIs del día (expedientes pendientes, solicitudes nuevas, etc.)
- Acceso rápido a los módulos más usados
- Navegación lateral (sidebar) colapsable con 4 secciones:
  - **Principal**: Módulos, Agenda, Pacientes, Historial
  - **Herramientas**: Calculadora, Homologador, Nomencladores, Protocolos
  - **Auditoría**: Pendientes, Realizadas, Facturación, Reportes
  - **Administración**: Nomencladores Ext., Usuarios, Valores, Backup

**Diseño adaptativo:** El sidebar cambia de color según la jurisdicción activa (azul para Cámara I, verde para Cámara II).

---

### 6.3 Agenda (`/agenda`)

Sistema de gestión de turnos y eventos con calendario.

**Funcionalidades:**
- Vista de calendario con turnos del día/semana/mes
- Creación de turnos con afiliado, profesional, tipo de consulta
- Filtros por fecha, profesional y tipo
- Datos persistidos en Supabase con actualización en tiempo real

**Acceso:** Administrativos y superiores.

---

### 6.4 Pacientes / Afiliados (`/patients`)

Módulo de gestión del **padrón de afiliados** con CRUD completo.

**Funcionalidades:**
- Búsqueda rápida por nombre, DNI o número de afiliado
- Ficha completa del afiliado con todos los datos:
  - Datos personales (nombre, DNI, fecha nacimiento, género)
  - Datos de afiliación (número, plan, categoría, estado)
  - Grupo familiar (titular, cónyuge, hijos)
  - Contacto (teléfono, email, dirección)
  - Condiciones especiales (enfermedades crónicas, PMI, etc.)
  - Deuda de coseguro, cuota congelada, seguro de vida
- Alta, edición y baja de afiliados
- Filtros por estado (activo, suspendido, baja)
- Separación por jurisdicción (Cámara I / Cámara II)

**Acceso:** Todos los roles pueden ver. Administrativos y Admin pueden editar.

---

### 6.5 Historial de Consumos (`/history`) — NUEVO

Módulo independiente para consultar el **historial completo de consumos** de cualquier afiliado. Diseñado para facilitar el análisis y la auditoría con inteligencia artificial.

**Funcionalidades:**
- Búsqueda de afiliado por nombre, DNI o número
- Carga automática del historial al seleccionar afiliado
- **4 KPI cards**: Total registros, total cubierto, total coseguro, prácticas distintas
- **2 vistas** intercambiables:
  - **Detalle**: Tabla completa con fecha, práctica, cantidad, estado, % cobertura, monto cubierto, coseguro, número de expediente, tipo, auditor que resolvió, código CIE-10
  - **Resumen por Práctica**: Agrupado por código de práctica con totales y distribución de estados
- **Filtros avanzados**: Fecha desde/hasta, estado, práctica, tipo de expediente
- **Ordenamiento** por fecha, práctica o monto
- **Exportación CSV** con todos los campos para análisis externo o IA
- Indicadores de estado con colores (autorizada = verde, denegada = rojo, etc.)

**Datos incluidos por registro:**
- Fecha del consumo
- Código y nombre de la práctica
- Cantidad
- Estado (autorizada, denegada, pendiente, etc.)
- Porcentaje de cobertura
- Monto cubierto ($)
- Coseguro ($)
- Número de expediente de origen
- Tipo de expediente (ambulatoria, bioquímica, etc.)
- Nombre del auditor que resolvió
- Código CIE-10 de diagnóstico

**Acceso:** Todos los roles con permiso `patients.view`.

---

### 6.6 Calculadora de Cobertura (`/calculator`)

Herramienta para calcular en tiempo real la cobertura de una práctica según el plan del afiliado.

**Funcionalidades:**
- Selección de plan de cobertura
- Búsqueda y selección de práctica del nomenclador
- Cálculo automático: valor de la práctica × porcentaje de cobertura del plan
- Muestra el monto cubierto, el coseguro y el total
- Considera modificadores especiales (PMI, discapacidad, etc.)

**Acceso:** Todos los roles operativos.

---

### 6.7 Homologador de Nomencladores (`/matcher`)

Sistema para vincular prácticas de nomencladores externos (de prestadores) con el nomenclador interno del CPCE.

**Funcionalidades:**
- Dashboard con conteo de homologaciones por estado (activa, pendiente, revisión)
- Proceso de homologación: se selecciona una práctica externa y se busca el equivalente interno
- Sugerencias automáticas basadas en similitud de código y descripción
- Importación de nomencladores externos desde archivos PDF
- Gestión de estados: activa, pendiente de revisión, rechazada

**Acceso:** Homologador, Administrativo y superiores.

---

### 6.8 Nomencladores (`/practices`, `/practices/external`)

Gestión completa del nomenclador de prácticas médicas.

**Nomenclador Interno (`/practices`):**
- Catálogo de prácticas organizado por tipo (Médico, Bioquímico, Odontológico, Farmacia, Especiales)
- Tabs separados por tipo de nomenclador
- Búsqueda por código o descripción
- Detalle: código, descripción, valor financiero, unidades, vigencia
- Soporte de normativa por práctica (texto legal, resoluciones)
- Buscador de prácticas con información regulatoria

**Nomencladores Externos (`/practices/external`):**
- Gestión de nomencladores de prestadores/obras sociales externas
- Upload de archivos PDF con extracción de datos
- Listado y detalle por nomenclador externo
- Vinculación con el proceso de homologación

**Acceso:** Consulta para todos. Gestión para Admin.

---

### 6.9 Protocolos de Auditoría (`/protocols`)

Repositorio de protocolos y guías de auditoría médica.

**Funcionalidades:**
- CRUD completo de protocolos
- Campos: título, descripción, contenido, categoría, estado
- Búsqueda y filtrado
- Referencia rápida para el auditor durante la resolución

**Acceso:** Auditores, Supervisores y superiores.

---

### 6.10 Circuito de Auditoría Médica (CORE)

Este es el **módulo principal** del sistema. Implementa el flujo completo desde la solicitud hasta la resolución y apelación. Se compone de varias pantallas interconectadas.

#### 6.10.1 Solicitud Nueva (`/audits/requests/new`)

Formulario principal para que el administrativo cargue una nueva solicitud de auditoría.

**Flujo:**

```
1. Seleccionar tipo de expediente (7 tipos)
            ↓
2. Buscar y seleccionar afiliado (ficha completa)
            ↓
3. Ver consumos previos (2 tabs: misma práctica / todos)
            ↓
4. Buscar y agregar prácticas del nomenclador
            ↓
5. Motor de reglas evalúa automáticamente (semáforo)
            ↓
6. Completar diagnóstico CIE-10 (buscador autocomplete)
            ↓
7. Adjuntar documentación (orden médica obligatoria)
            ↓
8. Previsualizar o enviar directo
```

**Características detalladas:**

**7 Tipos de Expediente:**
| Tipo | Descripción |
|---|---|
| Ambulatoria | Consultas y prácticas médicas generales |
| Bioquímica | Análisis clínicos y de laboratorio |
| Internación | Internaciones sanatoriales |
| Odontológica | Prácticas dentales |
| Programas Especiales | Coberturas especiales (PMI, discapacidad) |
| Elementos | Prótesis, ortopedia, elementos médicos |
| Reintegros | Devolución de gastos al afiliado |

**Ficha del Afiliado (al seleccionarlo):**
- Nombre, DNI, número de afiliado, CUIT, certificado
- Edad, género, relación familiar (Titular/Cónyuge/Hijo)
- Plan de cobertura
- Estado (Activo/Suspendido/Baja) — si no está activo, se **bloquea** la creación
- Fecha de alta, convenio
- Contacto (teléfono, email, dirección)
- **Condiciones especiales**: enfermedades crónicas, seguro de vida, farmacia especial, cuota congelada
- **Deuda de coseguro**: alerta visible si tiene deuda
- **Observaciones** del archivo
- Botón para expandir **consumos previos**

**Panel de Consumos (dentro de la solicitud):**
- **2 tabs**: "Misma práctica" (filtra por prácticas agregadas al formulario) y "Todos los consumos"
- Cada registro muestra: fecha, código+nombre de la práctica, cantidad, estado (autorizada/denegada/pendiente), monto cubierto, coseguro, número de expediente, auditor
- Filtros por rango de fecha
- Resumen total cubierto y coseguro al pie

**Motor de Reglas (Semáforo):**
Cada práctica es evaluada automáticamente y se le asigna un color:
- 🟢 **Verde** (auto-aprobable): Cumple todos los requisitos del plan, no excede frecuencia ni tope anual, cobertura calculada. **Se autoriza automáticamente al enviar**.
- 🟡 **Amarillo** (requiere auditor): Tiene alguna condición que requiere evaluación médica (ej: cercano al tope anual, práctica con autorización requerida).
- 🔴 **Rojo** (requiere auditor): No cumple algún requisito del plan, excede frecuencia máxima, afiliado en período de carencia.

Cada práctica muestra los mensajes del motor explicando por qué recibió ese color (ej: "Superó tope anual de 12 sesiones", "Práctica requiere autorización previa").

**Diagnóstico CIE-10:**
- Buscador autocomplete que consulta la base de datos de enfermedades (~170 códigos cargados de ejemplo)
- Búsqueda por código (ej: "J45") o por nombre (ej: "asma")
- Muestra código + nombre + capítulo CIE-10
- **Opcional**: el administrativo puede omitirlo

**Adjuntos:**
- Selector de tipo de documento (Orden médica, Receta, Estudio previo, Informe, Consentimiento, Historia clínica, Factura, Otro)
- Upload múltiple de archivos (PDF, JPG, PNG, DOC)
- **Compresión automática de imágenes** antes del upload (reduce tamaño sin perder calidad visible)
- Indicador visual de orden médica adjunta (obligatoria)
- Muestra nombre, tipo, tamaño y porcentaje de ahorro por compresión

**Comunicación:**
- Chat integrado estilo mensajería para notas al auditor
- Los mensajes quedan registrados como comunicación formal
- Se envían como notas del expediente

**Prioridad:** Normal o Urgente (🔴).

**Envío:**
- **Botón "Previsualizar"**: Muestra resumen completo antes de enviar
- **Botón "Enviar directo"**: Crea el expediente sin necesidad de previsualizar
- Al crear: si hay prácticas en verde, se auto-aprueban y se genera código de autorización
- Pantalla de éxito con número de expediente y códigos de autorización

---

#### 6.10.2 Bandeja de Pendientes (`/audits/requests`)

Pantalla principal del **auditor médico** donde ve todos los expedientes que requieren su intervención.

**Funcionalidades:**
- Listado de expedientes con filtros por estado, tipo, prioridad, auditor asignado
- Ordenamiento por urgencia (urgentes primero) y antigüedad
- Indicadores visuales: semáforo de reglas, prioridad, tipo, estado
- Conteo de resultados
- Al hacer clic en un expediente, abre la vista de resolución

**Resolución del expediente:**
- Vista completa del expediente con ficha del afiliado, adjuntos, historial de consumos
- **Resolución por práctica individual**: el auditor decide cada práctica por separado:
  - ✅ Autorizar (con % de cobertura y montos)
  - ✅ Autorizar parcial (modificar cobertura)
  - ❌ Denegar (con motivo obligatorio)
  - ⏸️ Diferir (solicitar información adicional)
  - 📋 Observar (dejar observación para revisión)
- Al resolver todas las prácticas, el expediente cambia de estado automáticamente
- Se generan códigos de autorización para las prácticas aprobadas

---

#### 6.10.3 Auditorías Realizadas (`/audits`)

Historial de auditorías completadas con sus resoluciones.

**Funcionalidades:**
- Listado paginado de todas las auditorías realizadas
- Filtros por fecha, auditor, tipo, estado de resolución
- Detalle de cada auditoría con sus resoluciones por práctica
- Trazabilidad completa (quién resolvió, cuándo, con qué motivo)

---

#### 6.10.4 Post-Resolución

Funcionalidades disponibles después de resolver un expediente:

- **Constancia PDF**: Generación de documento formal con la resolución (para entregar al afiliado/prestador)
- **Observaciones**: El auditor puede agregar observaciones adicionales post-resolución
- **Mesa de Control**: Supervisión de expedientes que requieren segunda revisión
- **Apelación**: El afiliado/prestador puede apelar una denegación, se reabre el expediente para un auditor diferente
- **Anulación**: Posibilidad de anular un expediente con motivo documentado

---

### 6.11 Facturación — Auditoría Posterior (`/audits/post`)

Módulo de **auditoría posterior o facturación** donde se cruzan las facturas presentadas por los prestadores contra las autorizaciones emitidas.

**Funcionalidades:**
- Registro de facturas de prestadores
- Cruce automático factura vs. autorización:
  - Si la factura coincide → ✅ Aprobada
  - Si hay diferencias → se calculan automáticamente
- Generación de **notas de débito** con:
  - Monto facturado vs. monto autorizado
  - Diferencia (débito)
  - Motivo del débito
- Estados: Pendiente, En revisión, Aprobada, Con débitos
- KPI cards: total, pendientes, en revisión, aprobadas, con débitos
- Totales de facturación y débitos

**Acceso:** Auditores, Supervisores y superiores.

---

### 6.12 Reportes y Estadísticas (`/audits/reports`)

Dashboard ejecutivo con gráficos interactivos y exportación de reportes.

**Dashboard (Tab principal):**

**6 KPI Cards:**
| Indicador | Descripción |
|---|---|
| Total Expedientes | Cantidad total en el período |
| Tasa Aprobación | % de prácticas aprobadas |
| Tasa Denegación | % de prácticas denegadas |
| Tiempo Promedio | Tiempo promedio de resolución |
| Pendientes | Expedientes sin resolver |
| Facturación | Total facturado en el período |

**Gráficos:**
- **Tendencias mensuales**: Gráfico de áreas con evolución de aprobadas, denegadas y observadas mes a mes
- **Estado de expedientes**: Gráfico de torta (pie) con distribución por estado
- **Resoluciones por práctica**: Gráfico de barras horizontales (autorizadas, parciales, denegadas, observadas, diferidas)
- **Distribución por tipo**: Gráfico de torta con tipos de expediente
- **Productividad por auditor**: Tabla con resueltos, autorizados, denegados y tiempo promedio por auditor
- **Top 10 prácticas solicitadas**: Ranking con cantidad, autorizadas y denegadas
- **Resumen de auditoría posterior**: KPIs de facturación (total, pendientes, aprobadas, con débitos, montos)

**Filtros:** Año, fecha desde, fecha hasta. Botón "Aplicar" para recargar con los filtros seleccionados.

**Exportar Reportes (Tab secundario):**
3 tipos de reportes exportables:

1. **Expedientes por Período** (PDF + CSV): Listado detallado con afiliado, prestador, prácticas y resoluciones
2. **Autorizaciones Emitidas** (PDF): Con código de autorización, cobertura, coseguro y vencimiento
3. **Notas de Débito** (PDF): Prestador, factura, montos facturado vs. autorizado, diferencias

Los PDFs se generan con diseño profesional (tabla, header institucional, resumen de totales, paginación) y se abren en ventana de impresión.

**Acceso:** Supervisores, Admin, Gerencia.

---

### 6.13 Chat Interno (`/chat`)

Sistema de mensajería interna entre usuarios del CPCE.

**Funcionalidades:**
- Mensajería directa entre usuarios
- Canales por área/tema
- Historial de conversaciones
- Indicador de mensajes no leídos (ícono en header)

**Acceso:** 
- Supervisores y superiores: todos los canales
- Auditores y Administrativos: solo mensajería directa

---

### 6.14 Alertas (`/alerts`)

Sistema de notificaciones y alertas automáticas.

**Funcionalidades:**
- Alertas de sistema (vencimientos, excedentes presupuestarios, etc.)
- Marcado de resueltas
- Filtrado por tipo y estado

**Acceso:** Supervisores y superiores.

---

### 6.15 Gestión de Usuarios (`/users`)

ABM de usuarios del sistema.

**Funcionalidades:**
- Listado de usuarios con rol, estado y jurisdicción
- Alta de nuevos usuarios con asignación de rol y jurisdicción
- Edición de datos y cambio de rol
- Activación/desactivación de usuarios
- Filtro por rol, estado y jurisdicción

**Acceso:** Admin y Superusuario.

---

### 6.16 Valores y Configuración (`/settings/values`)

Configuración de valores monetarios del sistema.

**Funcionalidades:**
- **Valores de unidades**: Valor del Galeno (prácticas médicas), NBU (bioquímicas), UO (odontológicas)
- Vigencia por período y jurisdicción
- Histórico de valores con fecha "desde" y "hasta"
- Configuración de parámetros generales

**Acceso:** Admin, Supervisor.

---

### 6.17 Backup (`/backup`)

Exportación de datos del sistema para respaldo.

**Funcionalidades:**
- Exportación de datos de tablas principales
- Formato de descarga para respaldo externo

**Acceso:** Admin, Supervisor.

---

## 7. BASE DE DATOS — MODELO DE DATOS

### Base de datos PostgreSQL (Supabase)

| # | Migración | Contenido |
|---|---|---|
| 001 | `001_add_roles.sql` | Sistema de roles y permisos |
| 002 | `002_external_nomenclators.sql` | Nomencladores externos con upload PDF |
| 003 | `003_homologations.sql` | Tabla de homologaciones entre nomencladores |
| 004 | `004_remove_hardcoded_nomenclators.sql` | Limpieza de datos hardcodeados |
| 005 | `005_rls_policies.sql` | Row Level Security (seguridad por fila) |
| 006 | `006_roles_permissions.sql` | Roles y permisos en BD |
| 007 | `007_align_legacy_schema.sql` | Alineación con sistema legacy (30+ campos) |
| 008 | `008_protocols_table.sql` | Tabla de protocolos de auditoría |
| 009 | `009_practice_normativa.sql` | Normativa asociada a prácticas |
| 010 | `010_audit_requests.sql` | Sistema de solicitudes de auditoría |
| 011 | `011_expedients.sql` | **Expedientes digitales** — tabla central del circuito |
| 012 | `012_post_audits.sql` | Auditoría posterior y facturación |
| 013 | `013_cie10_diagnosis.sql` | Diagnóstico CIE-10 + ~170 códigos de enfermedades |
| 999 | `999_consolidated_setup.sql` | Setup consolidado de datos iniciales |

### Esquema principal (tablas clave):

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   jurisdictions   │     │      plans        │     │   unit_values    │
│   (2 cámaras)     │◄────│   (cobertura)     │     │  (Galeno/NBU)    │
└────────┬─────────┘     └───────┬──────────┘     └──────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    affiliates     │     │    practices      │     │    providers     │
│  (padrón 30+     │     │  (nomenclador     │     │  (prestadores)   │
│   campos)         │     │   unificado)      │     │                  │
└────────┬─────────┘     └───────┬──────────┘     └──────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        EXPEDIENTS (expedientes)                  │
│                                                                  │
│  id, expedient_number, type, status, priority                   │
│  affiliate_id → affiliates                                       │
│  diagnosis_code, diagnosis_description (CIE-10)                 │
│  rules_result (verde/amarillo/rojo)                              │
│  created_by, resolved_by, resolved_at                           │
│  jurisdiction_id                                                 │
└───────┬──────────────────────────────┬───────────────────────────┘
        │                              │
        ▼                              ▼
┌──────────────────┐     ┌──────────────────────────┐
│expedient_practices│     │  expedient_attachments    │
│                  │     │                          │
│ practice_id      │     │  file_path, document_type│
│ quantity         │     │  uploaded_by             │
│ status           │     └──────────────────────────┘
│ coverage_percent │
│ covered_amount   │              ┌──────────────────┐
│ copay_amount     │              │  expedient_log    │
│ rule_result      │              │                  │
│ authorization_   │              │  action, details │
│   code           │              │  performed_by    │
│ resolved_by      │              └──────────────────┘
│ resolution_notes │
└──────────────────┘
        │
        ▼
┌──────────────────┐     ┌──────────────────┐
│  authorizations   │     │   post_audits    │
│                  │     │                  │
│  code, status    │     │  factura vs      │
│  expires_at      │     │  autorización    │
│  practice detail │     │  débitos         │
└──────────────────┘     └──────────────────┘

Otras tablas: diseases (CIE-10), users, protocols, audit_requests,
audit_request_notes, audit_request_attachments, audit_request_log,
audits, external_nomenclators, external_practices, homologations,
hospitalizations, lab_orders, reimbursements, pharmacy_records,
invoices, invoice_details
```

### Seguridad de datos (Row Level Security):
- Cada tabla tiene políticas de seguridad a nivel de fila (RLS)
- Los usuarios solo pueden ver/editar datos de su jurisdicción
- Los superusuarios tienen acceso completo
- Las operaciones de lectura y escritura se validan contra el rol del usuario autenticado

---

## 8. HISTORIAL DE DESARROLLO

### Cronología de entregas

| Fecha | Commit | Descripción |
|---|---|---|
| 07/02/2026 | `c4f4835` | Inicio del proyecto (Create Next App) |
| 08/02/2026 | `a08ac82` | Sprint 1-3: Historial auditorías, PDF export, alertas |
| 08/02/2026 | `de5e4a5` | Nomencladores internos multi-tipo con tabs |
| 08/02/2026 | `5774360` | Sistema de nomencladores externos con PDF upload |
| 08/02/2026 | `4ab73a7` | Supabase Realtime en toda la app |
| 08/02/2026 | `ce2aaf8` | Diseño estético dinámico por jurisdicción |
| 09/02/2026 | `4b4363f` | Dashboard del Homologador |
| 02/03/2026 | `751bc2c` | **Migración completa a Supabase** (API, CRUD, RLS) |
| 02/03/2026 | `ade7536` | **Fase 1 Sistema de roles**: roles/permisos, welcome, KPIs |
| 02/03/2026 | `1780642` | Alineación con sistema legacy (migración 007, 30+ campos) |
| 02/03/2026 | `2747821` | Welcome page + auth modal + recordarme |
| 02/03/2026 | `65e7977` | Buscador de Prácticas con soporte normativa |
| 02/03/2026 | `92220bf` | Reorganización UI: sidebar, header, /modules |
| 02/03/2026 | `50cbf28` | Sistema de solicitudes de auditoría (wizard inicial) |
| 02/03/2026 | `d21ab2f` | Solicitud completa: multi-práctica, ficha afiliado, 7 tipos |
| 03/03/2026 | `ec5bd64` | Documentación circuito de auditoría médica |
| 03/03/2026 | `73f08cb` | **Fase 1 Expedientes**: Migración 011, tipos, servicios, motor de reglas |
| 03/03/2026 | `e516db1` | **Fase 2**: Formulario con motor de reglas y semáforo |
| 03/03/2026 | `e5a650b` | Compresión automática de imágenes |
| 03/03/2026 | `60f85d1` | Rediseño UX del sidebar + formulario |
| 03/03/2026 | `1ef9aad` | Modernización layout (jurisdicción en sidebar, logout en header) |
| 03/03/2026 | `c13d8d6` | **Fase 3**: Bandeja del auditor, resolución por práctica individual |
| 03/03/2026 | `45b9229` | **Fase 4**: Post-Resolución (PDF, observaciones, apelación, mesa de control) |
| 03/03/2026 | `4d06f12` | **Fase 5**: Auditoría Posterior (cruce facturas, débitos) |
| 03/03/2026 | `fa57830` | **Fase 6**: Dashboard reportes, estadísticas, exportables PDF/CSV |
| 03/03/2026 | `efdb88d` | Fix: CIE-10, consumos 2 tabs, enviar directo, módulo HISTORIAL |
| 03/03/2026 | `94e254b` | Fix: migración 013 compatible |

---

## 9. MÉTRICAS DEL PROYECTO

| Métrica | Valor |
|---|---|
| Líneas de código TypeScript/React | ~26.000 |
| Líneas de SQL (migraciones) | ~2.600 |
| Commits de desarrollo | 56 |
| Pantallas/páginas funcionales | 31 |
| Migraciones de base de datos | 14 |
| Servicios backend (TypeScript) | 12 |
| Componentes reutilizables | 15+ |
| Roles de usuario | 6 |
| Tipos de expediente soportados | 7 |
| Códigos CIE-10 cargados | ~170 |
| Tiempo de desarrollo | ~25 días (07/02 → 03/03/2026) |

---

## 10. ROADMAP Y PRÓXIMOS PASOS

### Pendiente inmediato (para puesta en producción):

| Tarea | Prioridad | Estado |
|---|---|---|
| **Carga de datos reales** del padrón de afiliados | 🔴 Crítico | Pendiente |
| **Carga de nomenclador real** de prácticas | 🔴 Crítico | Pendiente |
| **Carga de base CIE-10 completa** (~14.000 códigos) | 🟡 Media | Se tienen 170 de ejemplo |
| Configuración de valores actualizados (Galeno, NBU) | 🔴 Crítico | Pendiente |
| Creación de usuarios reales del CPCE | 🔴 Crítico | Pendiente |
| Configuración de planes de cobertura reales | 🔴 Crítico | Pendiente |
| Ejecución de todas las migraciones en Supabase producción | 🔴 Crítico | Pendiente |
| Testing con usuarios finales | 🟡 Media | Pendiente |

### Fase 7 — Mejora continua (futuro):

| Funcionalidad | Descripción |
|---|---|
| **Integración con IA** | Análisis automático del historial de consumos para detectar anomalías |
| **Notificaciones push** | Alertas al celular del auditor cuando llega una solicitud urgente |
| **Portal del afiliado** | Interfaz web pública para que el afiliado consulte el estado de sus trámites |
| **Portal del prestador** | Interfaz para que el prestador suba facturas y consulte autorizaciones |
| **Firma digital** | Firma electrónica de constancias de autorización |
| **Integración SIU** | Conexión con el Sistema de Información Universitaria |
| **App mobile** | Versión nativa para celular (React Native) |
| **Reportes programados** | Envío automático de reportes por email (semanal, mensual) |

---

## ANEXO: ACCESO AL SISTEMA

| Dato | Valor |
|---|---|
| URL de producción | *(pendiente de configurar dominio)* |
| Repositorio | `https://github.com/aldowagner78-cmd/CPCE_gestion` |
| Base de datos | Supabase (PostgreSQL hosted) |
| Framework | Next.js 16.1.6 |

---

*Documento generado el 3 de marzo de 2026.*  
*Sistema CPCE Salud — Gestión integral de auditoría médica.*
