# CPCE Salud - Deploy en Vercel

## ✅ Opción 1: Deploy con 1 clic (RECOMENDADO)

1. **Crear cuenta en Vercel** (gratis):
   - Ir a: https://vercel.com/signup
   - Conectar con GitHub

2. **Importar repositorio**:
   - Clic en "Add New" → "Project"
   - Seleccionar `aldowagner78-cmd/CPCE_gestion`
   - Clic en "Import"

3. **Configurar (automático)**:
   - Framework Preset: **Next.js** (detectado automáticamente)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - ✅ Sin configuración adicional necesaria

4. **Deploy**:
   - Clic en "Deploy"
   - Esperar 2-3 minutos
   - Tu app estará en: `https://cpce-gestion.vercel.app` (o similar)

---

## 🔄 Deploy automático
- Cada `git push` a la rama `master` triggerea un nuevo deploy automático
- Preview URLs para cada PR/branch

---

## 🌐 Tu enlace de distribución

Después del primer deploy, obtendrás:
- **Production URL**: `https://cpce-gestion-[hash].vercel.app`
- Podés configurar un dominio custom (opcional)

---

## ✅ Funcionalidades que SÍ funcionan en Vercel (TODO)

- ✅ API Routes (`/api/practices`)
- ✅ Server-Side Rendering (SSR)
- ✅ Autenticación con Supabase
- ✅ Chat en tiempo real
- ✅ Páginas dinámicas (`[id]`)
- ✅ Motor de cobertura completo
- ✅ Exportación PDF
- ✅ Sistema de alertas
- ✅ Historial de auditorías

---

## ⚠️ Variables de entorno

Si tu app usa Supabase (actualmente `USE_MOCK_DATA = true`), cuando quieras conectar la BD real:

1. En Vercel → Settings → Environment Variables
2. Agregar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (opcional, para operaciones admin)

---

## 📦 Alternativas a Vercel

Si preferís otra plataforma:

| Plataforma | Gratis | Deploy | Dominio |
|------------|--------|--------|---------|
| **Vercel** | ✅ Sí | 1 clic | `*.vercel.app` |
| **Netlify** | ✅ Sí | 1 clic | `*.netlify.app` |
| **Railway** | ⚠️ Limitado | GitHub | `*.railway.app` |
| **Render** | ⚠️ Limitado | GitHub | `*.onrender.com` |

**Recomendación**: Vercel es la mejor opción para Next.js (es de los mismos creadores).

---

## 🚀 Estado actual

- ✅ Repositorio: https://github.com/aldowagner78-cmd/CPCE_gestion
- ✅ Next.js 16.1.6 configurado
- ✅ Build verificado: 17/17 páginas
- ⏳ **Pendiente**: Deploy en Vercel

---

## 📞 Compartir con usuarios

Una vez deployado, compartí el enlace:
```
https://cpce-gestion.vercel.app
```

Los usuarios podrán:
- Acceder desde cualquier dispositivo
- Sin instalación
- Datos en memoria (se resetean al recargar) hasta conectar Supabase
