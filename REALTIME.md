# 🔄 Sistema de Actualizaciones en Tiempo Real

## ✅ Implementado - Supabase Realtime

Toda la aplicación ahora actualiza automáticamente **sin recargar el navegador** cuando hay cambios en la base de datos.

### 📊 Módulos con Realtime Activo

| Módulo | Tabla Supabase | Hook | Eventos en Tiempo Real |
|--------|----------------|------|------------------------|
| **Alertas** | `alerts` | `useSupabaseAlerts` | Nuevas alertas, cambios de estado |
| **Auditorías** | `audits` | `useSupabaseAudits` | Nuevas auditorías, aprobaciones |
| **Chat - Conversaciones** | `conversations` | `useSupabaseChat` | Nuevas conversaciones |
| **Chat - Mensajes** | `messages` | `useSupabaseMessages` | Mensajes nuevos en tiempo real |
| **Chat - Usuarios** | `users` | `useSupabaseChat` | Usuarios online/offline |
| **Prácticas** | `practices` | `useSupabasePractices` | Cambios en nomenclador |
| **Afiliados** | `affiliates` | `useSupabaseAffiliates` | Nuevo padrón, actualizaciones |
| **Agenda** | `agenda_events` | `useSupabaseAgenda` | Eventos nuevos, cambios |

### 🎯 Cómo Funciona

1. **Usuario A** crea una auditoría → se guarda en Supabase
2. **Supabase Realtime** detecta el cambio (INSERT en tabla `audits`)
3. **Todos los usuarios conectados** reciben el evento automáticamente
4. **UI se actualiza** sin recargar la página

### 💡 Ejemplo de Uso

```typescript
import { useSupabaseAudits } from '@/hooks/useSupabaseAudits'

function AuditsPage() {
    const { audits, loading } = useSupabaseAudits()
    
    // audits se actualiza automáticamente cuando hay cambios
    return <div>{audits.map(a => ...)}</div>
}
```

### 🔧 Hook Genérico

También se creó un hook reutilizable para cualquier tabla:

```typescript
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

const { data, loading } = useRealtimeTable(
    'mi_tabla',
    async () => supabase.from('mi_tabla').select('*'),
    { column: 'jurisdiction_id', value: 1 }
)
```

### 📝 Configuración en Supabase

**No se requiere configuración adicional.** Supabase Realtime está habilitado por defecto en el plan gratuito.

Si necesitas verificar:
1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/nyoljpcehvkwshlpalcj
2. Ve a **Settings → API**
3. Verifica que **Realtime** esté habilitado (por defecto: ✅)

### 🚀 Beneficios

- ✅ **Sin recargar**: Los usuarios ven cambios al instante
- ✅ **Sin costo extra**: Incluido en plan gratuito de Supabase
- ✅ **Multiusuario**: Todos los usuarios sincronizados automáticamente
- ✅ **Escalable**: Soporta miles de conexiones simultáneas
- ✅ **Confiable**: WebSockets con reconexión automática

### 📊 Logs de Realtime

En la consola del navegador verás logs como:
```
[Realtime] Alert cambió: { eventType: 'INSERT', new: {...} }
[Realtime] Audit cambió: { eventType: 'UPDATE', new: {...}, old: {...} }
```

### 🔄 Flujo de Datos

```
Usuario A                  Supabase                  Usuario B
   |                          |                          |
   | INSERT auditoría         |                          |
   |------------------------->|                          |
   |                          | Detecta cambio          |
   |                          |------------------------->|
   |                          |                          | ✅ UI actualizada
   |                          |                          |
```

### 📁 Archivos Creados

- `/src/hooks/useRealtimeTable.ts` - Hook genérico
- `/src/hooks/useSupabaseAudits.ts` - Auditorías con Realtime
- `/src/hooks/useSupabasePractices.ts` - Prácticas con Realtime
- `/src/hooks/useSupabaseAffiliates.ts` - Afiliados con Realtime
- `/src/hooks/useSupabaseAgenda.ts` - Agenda con Realtime

### 📁 Archivos Modificados

- `/src/lib/useSupabaseAlerts.ts` - Agregado Realtime
- `/src/lib/useSupabaseChat.ts` - Agregado Realtime para conversaciones y mensajes

### ✅ Deploy

Una vez subido al repositorio, Vercel desplegará automáticamente y **todos los usuarios** con el link https://cpce-gestion.vercel.app verán las actualizaciones en tiempo real.

**No requiere ninguna configuración adicional por parte de los usuarios.**
