# CONFIGURACIÓN URGENTE DE SUPABASE EN VERCEL

## 🚨 HAZLO AHORA - 2 MINUTOS

### Paso 1: Ir a Vercel
1. Abre: https://vercel.com/dashboard
2. Busca tu proyecto: **cpce-gestion** o **CPCE_gestion**
3. Haz clic en el proyecto

### Paso 2: Configurar Variables de Entorno
1. Ve a la pestaña **Settings** (⚙️)
2. En el menú izquierdo, haz clic en **Environment Variables**
3. Agrega estas 2 variables (copia y pega exactamente):

#### Variable 1:
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://nyoljpcehvkwshlpalcj.supabase.co`
- **Environment:** Selecciona **Production**, **Preview**, y **Development** (las 3)
- Clic en **Save**

#### Variable 2:
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `sb_publishable_qx0-rwPU8137nPKasuwT4g_Q_zvxYJr`
- **Environment:** Selecciona **Production**, **Preview**, y **Development** (las 3)
- Clic en **Save**

### Paso 3: Redeployar
1. Ve a la pestaña **Deployments**
2. Busca el deployment más reciente (el primero de la lista)
3. Haz clic en los **3 puntos (...)** a la derecha
4. Selecciona **Redeploy**
5. Confirma con **Redeploy**

### ✅ Listo en 2-3 minutos
Tu app estará funcionando CON SUPABASE en:
**https://cpce-gestion.vercel.app** (o el URL que te muestre Vercel)

---

## 📝 Notas
- Las variables están en tu archivo `.env.local` local
- Vercel necesita estas variables para conectarse a tu base de datos Supabase
- Una vez configuradas, la app funcionará EXACTAMENTE como en local
- No cambié NADA del código original, solo revertí los cambios
