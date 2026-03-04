# 2. MANUAL DE USUARIO — Suite Integral CPCE Salud

> Versión 1.0 | Última actualización: Febrero 2026

---

## Índice

1. [Introducción](#1-introducción)
2. [Acceso y Navegación General](#2-acceso-y-navegación-general)
3. [Dashboard Principal](#3-dashboard-principal)
4. [Calculadora de Cobertura](#4-calculadora-de-cobertura)
5. [Nomenclador de Prácticas](#5-nomenclador-de-prácticas)
6. [Cambio de Jurisdicción (Cámaras)](#6-cambio-de-jurisdicción-cámaras)
7. [Interpretación de Estados de Auditoría](#7-interpretación-de-estados-de-auditoría)
8. [Glosario de Términos](#8-glosario-de-términos)
9. [Preguntas Frecuentes](#9-preguntas-frecuentes)

---

## 1. Introducción

La **Suite Integral CPCE Salud** es un sistema de auditoría médica diseñado para gestionar las operaciones de dos jurisdicciones del Consejo Profesional de Ciencias Económicas:

- **Cámara I** — Santa Fe (identificada con color **azul**)
- **Cámara II** — Rosario (identificada con color **verde esmeralda**)

### ¿Para quién es esta herramienta?

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Acceso completo al sistema, gestión de usuarios y configuración |
| **Auditor** | Verifica coberturas, aplica reglas de negocio y genera reportes |
| **Afiliado** (futuro) | Consulta su estado de cobertura y prácticas |

---

## 2. Acceso y Navegación General

### 2.1 Estructura de la Pantalla

La interfaz se divide en tres zonas principales:

```
┌─────────────┬──────────────────────────────────────┐
│             │         HEADER (Barra Superior)       │
│  SIDEBAR    ├──────────────────────────────────────┤
│  (Menú      │                                      │
│  lateral)   │        ÁREA DE CONTENIDO             │
│             │        (Cambia según la sección)     │
│             │                                      │
└─────────────┴──────────────────────────────────────┘
```

### 2.2 Barra Lateral (Sidebar)

El menú lateral se organiza en categorías:

| Categoría | Secciones | Estado |
|-----------|-----------|--------|
| **PRINCIPAL** | Dashboard, Pacientes | ✅ / 🔜 |
| **CATÁLOGOS** | Nomencladores, Protocolos, Homologador | ✅ / 🔜 |
| **GESTIÓN** | Auditorías, Calculadora | 🔜 / ✅ |
| **SISTEMA** | Pendientes, Usuarios, Backup, Configuración | 🔜 |

> **Nota:** Las secciones marcadas con 🔜 estarán disponibles en próximas versiones.

### 2.3 Barra Superior (Header)

Desde la barra superior puede:
- **Buscar** pacientes, códigos o protocolos usando la barra central (atajo: `Ctrl+K`)
- **Cambiar de Cámara** usando el toggle de jurisdicción (ver Sección 6)
- Ver **notificaciones** pendientes (campana roja indica alertas)
- Acceder a **configuración** del sistema

---

## 3. Dashboard Principal

El Dashboard es la pantalla de inicio. Muestra un resumen visual del estado operativo.

### 3.1 Panel "Estado de Auditorías"

Cuatro indicadores con semáforo de colores:

| Indicador | Color | Significado |
|-----------|-------|-------------|
| **Aprobadas** | 🟢 Verde | Prácticas que pasaron la auditoría sin observaciones |
| **Rechazadas** | 🔴 Rojo | Prácticas denegadas por incumplimiento de reglas |
| **Parciales** | 🟠 Naranja | Prácticas aprobadas con copago o restricciones |
| **Pendientes** | 🔵 Azul | Prácticas en espera de revisión manual |

### 3.2 Acciones Rápidas

Botones de acceso directo:
- **Nuevo Paciente**: Abre el formulario de alta de afiliado
- **Nueva Auditoría**: Inicia un proceso de revisión
- **Calculadora**: Acceso directo al simulador de cobertura

### 3.3 Gráficos

- **Tendencias de Auditoría**: Gráfico de barras mensual que compara aprobadas vs. rechazadas
- **Distribución por Tipo**: Gráfico de dona que muestra la proporción de consultas, cirugías, prácticas e internaciones

---

## 4. Calculadora de Cobertura

### 4.1 ¿Qué es?

Es un **simulador** que permite verificar, antes de prestar un servicio médico, si el afiliado tiene cobertura para una práctica específica, cuánto cubre el plan y cuánto debe abonar de copago.

### 4.2 Cómo Usarla — Paso a Paso

1. **Verifique la Cámara activa** en la barra superior. Los afiliados y prácticas se filtran según la jurisdicción seleccionada.

2. **Seleccione un Afiliado** del desplegable. Verá el nombre completo y DNI.

3. **Seleccione una Práctica Médica** del desplegable. Verá código, descripción y valor monetario.

4. **Presione "Calcular Cobertura"**.

5. **Lea el resultado** en el panel derecho.

### 4.3 Interpretación del Resultado

El panel de resultado muestra:

#### Estado General
- **APROBADA** (etiqueta verde): La práctica está cubierta por el plan del afiliado.
- **RECHAZADA** (etiqueta roja): La práctica no está cubierta. Revise las observaciones.

#### Detalles Numéricos
| Campo | Descripción |
|-------|-------------|
| **Cobertura %** | Porcentaje del valor que cubre el plan (ej: 80%) |
| **Monto Cubierto** | Valor en pesos que absorbe el plan |
| **Copago a Cargo** | Valor que debe abonar el afiliado |

#### Panel de Observaciones (amarillo)
Muestra alertas como:
- `Requiere autorización previa por ser práctica compleja` — Debe gestionarse aprobación antes de proceder.
- `Período de carencia no cumplido. Requiere X meses, tiene Y.` — El afiliado no cumplió el tiempo mínimo de espera.
- `El afiliado debe abonar un copago de $X.XX` — Monto a cargo del paciente.
- `Jurisdicción del afiliado no coincide con la práctica` — Error de asignación territorial.

### 4.4 Casos Típicos

| Caso | Afiliado Ejemplo | Resultado Esperado |
|------|------------------|-------------------|
| Cobertura total | Juan Pérez (Plan General, 100%) | Aprobada, $0 copago |
| Con copago | María García (Plan Básico, 80%) — si cumplió carencia | Aprobada, 20% copago |
| En carencia | Pedro Nuevo (Plan Básico, ingreso reciente) | Rechazada por carencia |
| Cirugía con autorización | Juan Pérez + Cesárea | Aprobada, requiere autorización |

---

## 5. Nomenclador de Prácticas

### 5.1 ¿Qué es?

Es el **catálogo oficial** de todas las prácticas médicas reconocidas por la jurisdicción activa. Cada práctica tiene un código único, descripción, categoría y valor monetario.

### 5.2 Cómo Usarlo

1. **Navegue a "Nomencladores"** desde el menú lateral (o "/practices" en la URL).
2. **Use la barra de búsqueda** para filtrar por código (ej: `42.01`) o por descripción (ej: `consulta`).
3. **Revise la tabla** con las columnas:

| Columna | Descripción |
|---------|-------------|
| **Código** | Identificador alfanumérico de la práctica (ej: `42.01.01`) |
| **Descripción** | Nombre completo de la práctica |
| **Categoría** | Clasificación (Consultas, Cirugía, Salud Mental, etc.) |
| **Valor** | Monto en pesos argentinos (formato `$XX.XXX,XX`) |

4. El **contador inferior** indica cuántos resultados coinciden con su búsqueda.

> **Tip:** Al cambiar de Cámara, el catálogo se actualiza automáticamente mostrando las prácticas de la nueva jurisdicción.

---

## 6. Cambio de Jurisdicción (Cámaras)

### 6.1 Cómo Cambiar de Cámara

1. Localice el **toggle de jurisdicción** en la esquina superior derecha del Header.
2. Verá dos botones:
   - **Cámara I (Santa Fe)** — Fondo azul cuando está activa
   - **Cámara II (Rosario)** — Fondo verde esmeralda cuando está activa
3. Haga clic en la cámara deseada.
4. La interfaz se actualizará automáticamente (~300ms):
   - Los colores del tema cambian
   - Las listas de afiliados se filtran
   - Las prácticas del nomenclador se reemplazan
   - Los gráficos se ajustan a la jurisdicción

### 6.2 ¿Qué Cambia al Alternar?

| Elemento | Cámara I | Cámara II |
|----------|----------|-----------|
| Color identificador | Azul | Verde esmeralda |
| Afiliados visibles | Solo Santa Fe | Solo Rosario |
| Prácticas visibles | Nomenclador Santa Fe | Nomenclador Rosario |
| Valores monetarios | Según convenio local | Según convenio local |

### 6.3 Importante

- Al cambiar de cámara, **los formularios se reinician**. Si estaba en medio de un cálculo, deberá volver a seleccionar afiliado y práctica.
- La cámara activa se indica visualmente en el botón resaltado.

---

## 7. Interpretación de Estados de Auditoría

### 7.1 Ciclo de Vida de una Auditoría

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│ PENDIENTE│────▶│ EN REVISIÓN│────▶│  APROBADA    │
└──────────┘     └──────────┘     └──────────────┘
                       │
                       ├──────────▶ RECHAZADA
                       │
                       └──────────▶ PARCIAL (con copago)
```

### 7.2 Criterios de Decisión del Motor

| Condición | Resultado |
|-----------|-----------|
| Afiliado activo + Plan 100% + Sin carencia | ✅ APROBADA |
| Afiliado activo + Plan 80% + Sin carencia | ⚠️ PARCIAL (20% copago) |
| Afiliado en período de carencia | ❌ RECHAZADA |
| Jurisdicción no coincide | ❌ RECHAZADA |
| Práctica de Cirugía / Alta Complejidad | ✅ pero → Requiere autorización previa |

### 7.3 ¿Qué hacer ante cada estado?

| Estado | Acción del Auditor |
|--------|-------------------|
| **Aprobada** | Autorizar la prestación. Sin intervención adicional. |
| **Parcial** | Informar al afiliado el monto de copago antes de proceder. |
| **Rechazada** | Verificar el motivo. Si es carencia, informar fecha estimada de habilitación. Si es jurisdicción, redirigir al afiliado. |
| **Requiere autorización** | Elevar a auditoría de nivel superior antes de prestar el servicio. |

---

## 8. Glosario de Términos

| Término | Definición |
|---------|------------|
| **Afiliado** | Persona inscrita en un plan de salud del CPCE |
| **Carencia** | Período de espera obligatorio antes de poder usar ciertos beneficios del plan |
| **Copago** | Monto que el afiliado debe abonar de su bolsillo por una práctica |
| **Cobertura** | Porcentaje del valor de la práctica que absorbe el plan |
| **Jurisdicción** | Ámbito territorial de competencia (Cámara I = Santa Fe, Cámara II = Rosario) |
| **Nomenclador** | Catálogo oficial de prácticas médicas con códigos y valores |
| **Práctica** | Acto médico codificado (consulta, cirugía, estudio, etc.) |
| **Plan** | Contrato de cobertura médica con reglas específicas |
| **Autorización previa** | Aprobación requerida del auditor antes de realizar una práctica compleja |
| **Auditoría** | Proceso de verificación de la procedencia de una prestación médica |

---

## 9. Preguntas Frecuentes

### ¿Por qué al seleccionar un afiliado no aparecen prácticas?
Verifique que la **Cámara activa** coincide con la jurisdicción del afiliado. Si está en Cámara I pero busca un afiliado de Cámara II, no aparecerá en la lista.

### ¿Qué significa "Período de carencia no cumplido"?
El plan del afiliado requiere un tiempo mínimo de antigüedad antes de cubrir ciertas prácticas. Por ejemplo, un plan con 6 meses de carencia rechazará prácticas si el afiliado tiene menos de 6 meses de afiliación.

### ¿Por qué la cirugía dice "Requiere autorización" si el porcentaje es 100%?
La cobertura monetaria y la autorización administrativa son procesos independientes. Una cirugía puede estar cubierta al 100% pero aún requerir aprobación del auditor médico para proceder.

### ¿Puedo ver datos de ambas cámaras simultáneamente?
No en la versión actual. El sistema muestra una cámara a la vez. Use el toggle para alternar entre ellas.

### ¿Cómo se calcula la antigüedad del afiliado?
Se calcula la diferencia en meses completos entre la fecha de inicio de afiliación (`start_date`) y la fecha actual del sistema.
