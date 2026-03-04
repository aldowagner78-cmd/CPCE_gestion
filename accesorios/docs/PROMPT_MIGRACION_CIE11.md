# INSTRUCCIONES DE MIGRACIÓN PARA CLAUDE / CURSOR

Actúa como un Desarrollador Senior y experto en Base de Datos. Necesitamos completar de forma urgente la migración de diagnósticos CIE-11 a nuestra base de datos de Supabase.

## CONTEXTO
- El archivo original era demasiado grande y causaba errores en el editor de Supabase.
- Se ha dividido en **71 pequeños archivos SQL** en la carpeta: `accesorios/MICRO_CIE11/`.
- Las partes **001 hasta la 010 ya fueron subidas manualmente**.
- **TU MISIÓN:** Subir las partes **011 hasta la 071 inclusive**.

## DATOS DE CONEXIÓN (URGENTE)
- **Host:** `db.nyoljpcehvkwshlpalcj.supabase.co`
- **Puerto:** `5432`
- **Usuario:** `postgres`
- **Base de Datos:** `postgres`
- **Contraseña:** `Al26716975do`
- **Password (PGPASSWORD):** Debe setearse como variable de entorno antes de la ejecución.

## TAREAS A REALIZAR
1. Sube los archivos desde `accesorios/MICRO_CIE11/CIE11_Parte_011.sql` hasta `CIE11_Parte_071.sql`.
2. **IMPORTANTE:** Si psql falla por resolución de nombres (DNS), intenta usar la IP directa o verifica la conexión.
3. El comando debe lanzarse desde la raíz del proyecto en Windows (PowerShell).
4. **Script Recomendado (PowerShell):**
   ```powershell
   $env:PGPASSWORD='Al26716975do'; 11..71 | ForEach-Object { $num = $_.ToString('000'); $file = "accesorios\MICRO_CIE11\CIE11_Parte_$num.sql"; Write-Host "Importando $file..."; psql -h db.nyoljpcehvkwshlpalcj.supabase.co -U postgres -d postgres -f $file }
   ```
5. Una vez terminados los 71 archivos, sube estos dos adicionales que son vitales:
   - `supabase/migrations/019_cie10_import.sql`
   - `supabase/migrations/020_dsm5_import.sql`

## VERIFICACIÓN FINAL
Al terminar, ejecuta este SQL para confirmar que la tabla tiene todos los datos:
```sql
SELECT classification, count(*) FROM diseases GROUP BY classification;
```

**NO TE RINDAS:** Si `psql` falla por DNS en tu entorno, crea un pequeño script de **Python** usando `psycopg2` para hacer los inserts uno por uno, ya que Python suele manejar mejor los reintentos y la red.
