# 📋 DISEÑO DE SOLICITUDES EN DIFERENTES ESTADOS

## Vista General de Estados

```
BORRADOR (Grey)
└─ Guardada como borrador, sin enviar
└─ Acciones: Editar, Enviar, Eliminar

👇

PENDIENTE (Yellow)
└─ Enviada, esperando que alguien la tome
└─ SLA: ⏱️ Mostrar tiempo hábil transcurrido
└─ Acciones: Tomar para revisión

👇

EN_REVISION (Blue)
└─ Siendo auditada activamente
└─ SLA: ⏱️ Mostrar tiempo hábil transcurrido
└─ Acciones: Resolver prácticas, Observar, Diferir

👇

PARCIALMENTE_RESUELTO (Indigo)
└─ Algunas prácticas resueltas, otras pendientes
└─ Muestra: ✅ X autorizadas | ⏳ Y pendientes | ❌ Z denegadas
└─ Acciones: Continuar resolviendo, Observar

👇

RESUELTO (Green)
└─ Todas las prácticas resueltas
└─ Muestra: ✅ X autorizadas | ❌ Y denegadas
└─ Acciones: Ver detalles, Descargar PDF

👇

OBSERVADA (Orange)
└─ Requiere correcciones del afiliado
└─ Muestra: 🔍 Observaciones, 📝 Motivo
└─ Acciones: Ver observaciones, (Afiliado: Reenviar)

👇

EN_APELACION (Red)
└─ Afiliado presentó apelación
└─ Muestra: 📣 Motivo de apelación
└─ Acciones: Revisar apelación, Confirmar decisión

⚠️ (Fallida)
ANULADA (Grey)
└─ Solicitud cancelada
└─ Muestra: 🚫 Motivo de cancelación
└─ Acciones: Ver detalles (solo consulta)
```

---

## 1️⃣ ESTADO: BORRADOR

### Apariencia
- Badge: **Gris oscuro** con ícono de documento
- Estado de edición: Formulario completamente editable
- Información: Parcial (solo lo ingresado)

### Información Mostrada
```
┌─────────────────────────────────┐
│ 📄 Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: Ambulatoria           │
│ ├─ Práctica: Consulta (pendiente) │
│ ├─ Diagnóstico: (vacío)        │
│ ├─ Fecha: 06/03/2025           │
│ └─ Auditor: Sin asignar        │
└─────────────────────────────────┘
```

### Acciones Disponibles
- ✏️ **Editar**: Continuar completando el formulario
- 📤 **Enviar**: Cambiar a estado PENDIENTE
- ❌ **Eliminar**: Borrar la solicitud

### Indicadores Especiales
- ⚠️ Campos incompletos se resaltan en rojo
- 📌 Resumen de cambios no guardados (si aplica)

---

## 2️⃣ ESTADO: PENDIENTE

### Apariencia
- Badge: **Amarillo** con ícono de reloj
- Fondo: Ligeramente opaco (indica espera)
- SLA: **Dot animado** mostrando estado (verde/amarillo/rojo)

### Información Mostrada
```
┌─────────────────────────────────┐
│ ⏳ Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: 🩺 Ambulatoria        │
│ ├─ Prácticas: 1 (evaluadas)    │
│ │  ├─ Consulta: 🟢 (auto-aprobable) │
│ │  └─ Valor: $150              │
│ ├─ Diagnóstico: Gripe (J11)    │
│ ├─ Doctor: Dr. López (MP123)   │
│ ├─ Auditor: Disponible         │
│ ├─ Fecha: 06/03/2025           │
│ ├─ SLA: 2h 15min hábiles       │
│ └─ Prioridad: Normal           │
└─────────────────────────────────┘
```

### Acciones Disponibles
- 👁️ **Tomar para Revisar**: Cambiar estado a EN_REVISION
  - Requiere: Estar autenticado como auditor
  - Resultado: El usuario se asigna a sí mismo
  - Notificación: Se notifica si hay auditores siguiendo

### Indicadores Especiales
- ⭐ Si clinical_priority_score >= 30: Mostrar estrella de prioridad clínica
- 🚨 Si priority === 'urgente': Badge rojo "URGENTE"
- 🟢/🟡/🔴 Pequeño dot SLA:
  - Verde: < 4h hábiles
  - Amarillo: 4h - 8h hábiles
  - Rojo: > 8h hábiles (animado)

---

## 3️⃣ ESTADO: EN_REVISION

### Apariencia
- Badge: **Azul** con ícono de ojo
- Fondo: Destacado (indica trabajo activo)
- SLA: **Dot animado** mostrando presión de tiempo

### Información Mostrada
```
┌─────────────────────────────────┐
│ 👁️ Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: 🩺 Ambulatoria        │
│ ├─ Auditor Asignado: Ana López │
│ ├─ Estado: SIENDO REVISADA      │
│ │                               │
│ ├─ PRÁCTICAS (3 total)         │
│ │  ├─ Consulta ............ 🟢  │
│ │    └─ Autorizada por IA    │
│ │  ├─ Laboratorio .......... 🟡  │
│ │    └─ Requiere revisión    │
│ │  └─ Medicamento .......... 🔴  │
│ │    └─ Sin cobertura        │
│ │                               │
│ ├─ Resumen Prácticas:          │
│ │  ✅ 1 auto-aprobada          │
│ │  ⏳ 1 requiere revisión      │
│ │  ❌ 1 denegada               │
│ │                               │
│ ├─ Diagnóstico: Gripe (J11)    │
│ ├─ Doctor: Dr. López (MP123)   │
│ ├─ Fecha Creación: 06/03/2025  │
│ ├─ SLA: 3h 45min hábiles       │
│ └─ Prioridad: Normal           │
└─────────────────────────────────┘
```

### Secciones de Detalle

#### TAB 1: PRÁCTICAS
```
┌─ Práctica: Consulta            ┐
├─ Código: 1100                  │
├─ Valor: $150                   │
├─ Cantidad: 1                   │
├─ Semáforo: 🟢 Auto-aprobable  │
├─ Cobertura: 100%              │
├─ Autorizado por IA: $150       │
└─ ACCIÓN: Confirmar             ─┘

┌─ Práctica: Laboratorio         ┐
├─ Código: 2200                  │
├─ Valor: $300                   │
├─ Cantidad: 1                   │
├─ Semáforo: 🟡 Requiere revisión│
├─ Cobertura: 80%               │
├─ Monto: $240 (copago $60)     │
└─ ACCIONES:                     ─┘
  ├─ ✅ Autorizar                │
  ├─ ❌ Denegar                   │
  ├─ 🔄 Parcial                   │
  └─ ⏰ Diferir                    │
```

#### TAB 2: ADJUNTOS
```
├─ 📄 orden_medica.pdf (125.4 KB) ✅
│  └─ Subido: 06/03/2025 09:15
├─ 📄 laboratorio.jpg (2.3 MB) ✅
└─ 📄 estudio.pdf (890 KB) ✅
```

#### TAB 3: COMUNICACIÓN
```
👨‍⚖️ INTERNA (solo auditores)
├─ Ana López (Auditor): "Pendiente revisión de cobertura"
│  └─ 06/03/2025 10:30
└─ [Área de respuesta]

📬 PARA AFILIADO
├─ Sistema: "Su solicitud está siendo revisada"
│  └─ 06/03/2025 09:45
└─ [Área de respuesta]
```

#### TAB 4: HISTORIAL
```
📥 Solicitud creada
   └─ Aud. Admin | 06/03/2025 09:20

👁️ Tomada para revisión
   └─ Ana López | 06/03/2025 09:30

🤖 Auto-aprobación por IA
   └─ Motor de Reglas | 06/03/2025 09:35
```

### Acciones Disponibles
- ✅ **Autorizar Práctica**: Cambiar a 'autorizada'
- ❌ **Denegar Práctica**: Cambiar a 'denegada'
- 🔄 **Autorizar Parcial**: Cambiar a 'autorizada_parcial'
- ⏰ **Diferir Práctica**: Cambiar a 'diferida'
- 👁️ **Observar Solicitud**: Dejar observaciones para corrección
- 🔄 **Diferir a Mesa Control**: Si requiere_control_desk
- 📎 **Agregar Adjuntos**: Documentación adicional
- 💬 **Dejar Notas**: Internas o para afiliado

### Indicadores Especiales
- **Semáforo de Prácticas**:
  - 🟢 Auto-aprobable: Franja verde claro
  - 🟡 Requiere revisión: Franja amarilla
  - 🔴 Sin cobertura: Franja roja
  - 🟠 Límite excedido
  - 🟣 Mesa de control
  - ⚫ Duplicada
  - 🔵 Carencia

- **Contador de Prácticas**:
  ```
  ✅ 1 | 🟡 1 | ❌ 1
  ```

---

## 4️⃣ ESTADO: PARCIALMENTE_RESUELTO

### Apariencia
- Badge: **Índigo/Púrpura** con ícono de advertencia
- Fondo: Modo semi-cerrado (algunas cosas resueltas)
- SLA: Ya no aplica

### Información Mostrada
```
┌─────────────────────────────────┐
│ ⚠️ Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: 🩺 Ambulatoria        │
│ ├─ Auditor: Ana López          │
│ ├─ Estado: PARCIALMENTE RESUELTA│
│ │                               │
│ ├─ PRÁCTICAS (3 total)         │
│ │ Resueltas: 2/3               │
│ │  ├─ Consulta ............. ✅ │
│ │    └─ Autorizada ($150)    │
│ │  ├─ Laboratorio ........... ❌ │
│ │    └─ Denegada         │
│ │  └─ Medicamento ........... ⏳ │
│ │    └─ PENDIENTE DE RESOLVER │
│ │                               │
│ ├─ Resumen:                    │
│ │  ✅ 1 autorizada ($150)      │
│ │  ❌ 1 denegada               │
│ │  ⏳ 1 pendiente              │
│ │  📊 Total: $250             │
│ │                               │
│ ├─ Fecha Creación: 06/03/2025  │
│ └─ Última Actividad: 06/03/2025│
└─────────────────────────────────┘
```

### Secciones de Detalle (mismas que EN_REVISION)

### Acciones Disponibles
- ✅ **Continuar Resolviendo**: Completar prácticas pendientes
- 👁️ **Observar Solicitud**: Si hay inconsistencias
- 📄 **Generar Resolución Parcial**: PDF con lo resuelto
- 💬 **Dejar Notas**

---

## 5️⃣ ESTADO: RESUELTO

### Apariencia
- Badge: **Verde** con ícono checkmark
- Fondo: Modo de lectura (sin edición)
- SLA: ✅ Completado

### Información Mostrada
```
┌─────────────────────────────────┐
│ ✅ Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: 🩺 Ambulatoria        │
│ ├─ ESTADO FINAL: RESUELTO      │
│ │                               │
│ ├─ RESOLUCIÓN                  │
│ │  ✅ 2 prácticas autorizadas  │
│ │     └─ $300 cubiertos        │
│ │  ❌ 1 práctica denegada      │
│ │                               │
│ ├─ DETALLES FINALES            │
│ │  Monto Total Cubierto: $300  │
│ │  Copago: $60                 │
│ │  A cargo afiliado: $60       │
│ │                               │
│ ├─ Auditor: Ana López          │
│ ├─ Resuelto: 06/03/2025 11:45  │
│ ├─ Tiempo Total: 2h 25min      │
│ └─ SLA: ✅ Dentro de plazo     │
└─────────────────────────────────┘
```

### Secciones de Detalle (SOLO LECTURA)

#### TAB 1: PRÁCTICAS (Finales)
```
PRÁCTICA 1: Consulta
├─ Estado: ✅ AUTORIZADA
├─ Valor: $150
├─ Cobertura: 100%
├─ Monto Cubierto: $150
├─ Código Autorización: AUTH-2025-0001
├─ Auditor: Ana López
└─ Fecha: 06/03/2025 10:30

PRÁCTICA 2: Laboratorio
├─ Estado: ✅ AUTORIZADA PARCIALMENTE
├─ Valor: $300
├─ Cobertura: 80%
├─ Monto Cubierto: $240
├─ Copago: $60
├─ Código Autorización: AUTH-2025-0002
└─ Fecha: 06/03/2025 11:00
```

### Acciones Disponibles
- 📥 **Descargar Resolución**: PDF con detalles finales
- 🖨️ **Imprimir**: Imprimir directamente
- ❓ **Ver Detalles**: Expandir información completa
- 📎 **Ver Adjuntos**: Documentación asociada

---

## 6️⃣ ESTADO: OBSERVADA

### Apariencia
- Badge: **Naranja** con ícono de advertencia
- Fondo: Modo "pendiente de corrección"
- Estado: Pausado esperando acción del afiliado

### Información Mostrada
```
┌─────────────────────────────────┐
│ ⚠️ Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: 🩺 Ambulatoria        │
│ └─ ESTADO: OBSERVADA (pendiente │
│    correcciones)                │
│                                 │
│ 🔍 OBSERVACIONES DEL AUDITOR   │
│ ├─ Auditor: Ana López          │
│ ├─ Fecha: 06/03/2025 11:30     │
│ ├─ Motivo:                      │
│ │  "Falta documentación del     │
│ │   laboratorio. Requiere       │
│ │   comprobante firmado por el  │
│ │   profesional responsable."   │
│ │                               │
│ ├─ Documentos Requeridos:      │
│ │  ☐ Comprobante de laboratorio│
│ │  ☐ Receta firmada            │
│ │                               │
│ ├─ Plazo: Hasta 10/03/2025     │
│ └─ Estado Correcciones:        │
│    ⏳ Pendiente envío del afiliado
└─────────────────────────────────┘
```

### Vista del Afiliado
- Recibe notificación con detalles de observaciones
- Puede cargar nuevos documentos
- Opción: **"Reenviar Solicitud"** una vez subsanada

### Acciones Disponibles (Auditor)
- 📋 **Ver Observaciones**: Expandir detalles
- ✅ **Suspender Observación**: Si afiliado envió correcciones
- ❌ **Anular Solicitud**: Si no se cumplen plazo

### Acciones Disponibles (Afiliado)
- 📤 **Reenviar**: Cambiar a PENDIENTE con nuevos documentos
- ❌ **Desistir**: Cancelar solicitud

---

## 7️⃣ ESTADO: EN_APELACION

### Apariencia
- Badge: **Rojo** con ícono de campana
- Fondo: Modo "en disputa"
- Indicador: 🚨 Requiere atención

### Información Mostrada
```
┌─────────────────────────────────┐
│ 📣 Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: 🩺 Ambulatoria        │
│ └─ ESTADO: EN APELACIÓN        │
│                                 │
│ 📣 RECURSO DE APELACIÓN        │
│ ├─ Fecha Apelación: 09/03/2025 │
│ ├─ Motivo:                      │
│ │  "Disconformidad con denegación│
│ │   de práctica. Laboratorio es │
│ │   esencial según el médico."  │
│ │                               │
│ ├─ Documentos Adjuntos:        │
│ │  ├─ 📄 Certificado médico    │
│ │  └─ 📄 Justificación denegación│
│ │                               │
│ ├─ Decisión Previa:            │
│ │  Estado: ❌ DENEGADA         │
│ │  Motivo: Sin cobertura plan  │
│ │  Auditor: Ana López          │
│ │                               │
│ ├─ Supervisión:                │
│ │  ⏳ Asignado a: (pendiente)  │
│ │  Plazo Resolución: 20 días   │
│ └─ Estado Apelación:           │
│    ⏳ En revisión de supervisor
└─────────────────────────────────┘
```

### Acciones Disponibles (Supervisor)
- ✅ **Confirmar Decisión**: Mantener resolución anterior
- 🔄 **Revocar Decisión**: Cambiar resolución
- 📝 **Agregar Comentarios**: Notas de supervisión
- ❌ **Denegar Apelación**: Rechazar recurso

---

## 8️⃣ ESTADO: ANULADA

### Apariencia
- Badge: **Gris** con ícono de prohibición
- Fondo: Modo "inactivo"
- Indicador: 🚫 Histórico

### Información Mostrada
```
┌─────────────────────────────────┐
│ 🚫 Solicitud #EXP-2025-0001    │
│ ├─ Afiliado: Juan Pérez (123)  │
│ ├─ Tipo: 🩺 Ambulatoria        │
│ └─ ESTADO: ANULADA             │
│                                 │
│ 🚫 CANCELACIÓN                 │
│ ├─ Cancelado por: Ana López    │
│ ├─ Fecha Cancelación: 12/03/2025│
│ ├─ Motivo:                      │
│ │  "Solicitud duplicada.        │
│ │   Ver expediente EXP-2025-0015│
│ │                               │
│ ├─ Historial Original:         │
│ │  ✅ 1 autorizada            │
│ │  ❌ 1 denegada              │
│ │  ⏳ 1 pendiente             │
│ │                               │
│ ├─ Prácticas Anuladas:        │
│ │  ❌ Laboratorio              │
│ │  ❌ Consulta                 │
│ │                               │
│ └─ Nota: Solicitud histórica,  │
│    disponible para consulta    │
└─────────────────────────────────┘
```

### Acciones Disponibles
- 👁️ **Ver Detalles**: Solo lectura
- 📥 **Descargar Información**: Histórico del expediente
- 🔗 **Ver Solicitud Original**: Vinculada en motivo de anulación

---

## 🎨 ESQUEMA DE COLORES

| Estado | Color | Hex | Significado |
|--------|-------|-----|------------|
| borrador | Gris | `#64748b` | Incompleto |
| pendiente | Amarillo | `#facc15` | Esperando |
| en_revision | Azul | `#3b82f6` | Activo |
| parcialmente_resuelto | Índigo | `#6366f1` | Progreso |
| resuelto | Verde | `#22c55e` | Completado ✅ |
| observada | Naranja | `#f97316` | Atención |
| en_apelacion | Rojo | `#ef4444` | Crítico |
| anulada | Gris Oscuro | `#6b7280` | Cancelado |

---

## 📊 SEMÁFORO DE PRÁCTICAS (7 Colores)

| Clasificación | Emoji | Color | Significado |
|--|--|--|--|
| Auto-aprobable | 🟢 | Verde | Cumple todos criterios |
| Requiere revisión | 🟡 | Amarillo | Necesita auditor |
| Sin cobertura | 🔴 | Rojo | No cubre el plan |
| Límite excedido | 🟠 | Naranja | Supera frecuencia |
| Mesa de control | 🟣 | Púrpura | Alta complejidad |
| Duplicada | ⚫ | Negro | Práctica reciente |
| Carencia | 🔵 | Azul | Período no cubierto |

---

## ⏱️ INDICADOR SLA

### Verde ✅
- Tiempo: 0-4h hábiles
- Dot: `bg-green-500`
- Pulso: Sin animación
- Mensaje: "En plazo"

### Amarillo ⚠️
- Tiempo: 4-8h hábiles
- Dot: `bg-yellow-400`
- Pulso: Sin animación
- Mensaje: "Próximo a vencer"

### Rojo 🔴
- Tiempo: > 8h hábiles
- Dot: `bg-red-500`
- Pulso: `animate-pulse`
- Mensaje: "VENCIDO"

---

## 🌙 DARK MODE

Todos los estados tienen variantes dark:
- Textos más claros
- Fondos más oscuros
- Colores más saturados para contraste
- Ejemplo: `dark:bg-blue-900/30 dark:text-blue-300`

---

## 📱 RESPONSIVE DESIGN

- **Desktop**: Mostrar todos los detalles
- **Tablet**: Contraer algunos paneles
- **Mobile**: Stack vertical, badges inline

---

## 🔄 TRANSICIONES

- Cambio de estado: Fade + slide (200ms)
- Expansión de detalles: Slide down (150ms)
- Carga de datos: Skeleton loading
- Guardado exitoso: Toast verde "Guardado"
- Error: Toast rojo con mensaje

