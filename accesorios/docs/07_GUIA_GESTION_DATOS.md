# 7. GUÍA DE GESTIÓN DE DATOS Y ACTUALIZACIONES

> Manual operativo para el Administrador del Sistema.
> Explica cómo "alimentar" la app con datos reales y mantenerla al día.

---

## 7.1 Introducción: El Ciclo de Vida del Dato

Esta aplicación no es estática; vive de los datos que le cargas. Hay 3 tipos de datos con ciclos de vida diferentes:

1.  **Nomenclador (Prácticas)**: Se actualiza mensualmente (valores) o anualmente (nuevas prácticas).
2.  **Padrón (Afiliados)**: Se actualiza diariamente/semanalmente (altas, bajas, cambios de plan).
3.  **Auditorías**: Se generan en tiempo real por el uso de la app.

---

## 7.2 Preparación de Archivos (Formatos)

Antes de subir nada, debes tener tus datos limpios ("Sanitizados"). 
Usa el archivo `03_DICCIONARIO_DATOS.md` como referencia técnica, pero aquí tienes la **Guía Práctica**:

### A. Para el Nomenclador (`practices.csv`)

Ahora soportamos múltiples nomencladores y valores dinámicos (Galenos).

| code | description | nomenclator_type | calculation_method | fixed_value | unit_value | category | jurisdiction_id |
|------|-------------|------------------|--------------------|-------------|------------|----------|-----------------|
| 42.01.01 | CONSULTA MEDICA | medico | galenos | | 10.0 | Consultas | 1 |
| 11.01.01 | CESAREA | medico | galenos | | 150.0 | Cirugía | 1 |
| 66.00.01 | ANALISIS COMPLETO | bioquimico | nbu | | 30.0 | Estudios | 1 |
| 99.01.01 | DESCARTABLE KIT | insumos | fijo | 5000.00 | | Insumos | 1 |

**Columnas Clave:**
1.  **nomenclator_type**: `medico`, `bioquimico`, `odontologico`, `medicamentos`, `programas`.
2.  **calculation_method**:
    - `galenos`: El precio será `unit_value` * Valor del Galeno.
    - `nbu`: El precio será `unit_value` * Valor NBU.
    - `fijo`: Se usa el precio explícito en `fixed_value`.
3.  **fixed_value**: Usar solo si el método es `fijo`. De lo contrario dejar vacío.
4.  **unit_value**: Cantidad de Galenos/Unidades. (Ej: Una consulta son 10 Galenos).

> **Ventaja:** Cuando aumente el Galeno, solo actualizaremos UNA vez el valor de referencia y todas las prácticas tipo `galenos` se actualizarán solas.

### B. Para el Padrón (`affiliates.csv`)

Debe contener la estructura completa del grupo familiar.

| affiliate_number | full_name | document_number | birth_date | gender | relationship | titular_id | plan_id | special_conditions | jurisdiction_id |
|------------------|-----------|-----------------|------------|--------|--------------|------------|---------|--------------------|-----------------|
| 1234 | Perez, Juan | 20123456 | 1980-05-20 | M | Titular | | 101 | [] | 1 |
| 1234 | Perez, Maria | 30987654 | 2015-08-10 | F | Hijo | 1 | 101 | ["discapacidad"] | 1 |

**Columnas Clave:**
1.  **affiliate_number**: El número de credencial. Usualmente el mismo para todo el grupo familiar.
2.  **relationship**: Valores aceptados: `Titular`, `Cónyuge`, `Hijo`, `Padre`, `Otro`.
3.  **titular_id**: 
    - Si es **Titular**: Dejar VACÍO.
    - Si es **Adherente**: Poner el `document_number` (DNI) del Titular para que el sistema los vincule automáticamente al importar.
4.  **gender**: `M`, `F` o `X` (Importante para validar Plan Materno, etc.).
5.  **special_conditions**: Lista separada por comas de condiciones activas. 
    - Ejemplos: `discapacidad`, `oncologico`, `diabetes`, `pmo`, `materno`.
    - Si no tiene, dejar vacío `[]`.

---

## 7.3 Proceso de Carga Inicial (Migración)

*Este proceso se realiza una sola vez al poner en marcha el sistema.*

1.  **Crear Proyecto en Supabase**: (Ver documento de Estrategia).
2.  **Crear Tablas**: Ejecutando el script SQL que te proveeremos.
3.  **Importar CSVs**:
    - Entrar a Supabase Dashboard > Table Editor.
    - Seleccionar tabla `practices`.
    - Botón **"Insert" > "Import Data from CSV"**.
    - Arrastrar tu `practices.csv`.
    - Repetir para `affiliates`.

---

## 7.4 Proceso de Actualización (El día a día)

### Escenario A: Aumento General de Aranceles (Ej. +10%)

No necesitas editar uno por uno.
1.  Entras al Panel SQL de Supabase.
2.  Ejecutas:
    ```sql
    -- Aumentar 10% a todas las prácticas de Santa Fe (ID 1)
    UPDATE practices 
    SET financial_value = financial_value * 1.10 
    WHERE jurisdiction_id = 1;
    ```
3.  ¡Listo! La app se actualiza instantáneamente.

### Escenario B: Nuevo Excel de Nomenclador Completo

Si el cambio es muy grande y prefieres reemplazar todo:
1.  Panel Supabase > SQL Editor: `TRUNCATE practices;` (Borra todo).
2.  Importar el nuevo CSV limpio.

### Escenario C: Agregar un Afiliado Individual

Desde la propia App (cuando construyamos la pantalla `/patients`) o desde Supabase Dashboard > Table `affiliates` > "Insert Row".

---

## 7.5 Respaldo de Seguridad (Backups)

Aunque la nube es segura, *siempre* ten tus datos.
1.  **Backup Automático**: Supabase (Plan Pro) lo hace diario. En Plan Free no, PERO...
2.  **Export Manual**:
    - Table Editor > `audits` > "Export to CSV".
    - Haz esto semanalmente para guardar el historial de tus auditorías.

---

## 7.6 Checklist de Calidad antes de Subir

- [ ] ¿Los montos tienen signo `$`? (Eliminarlo).
- [ ] ¿Las fechas dicen `15/01/2024`? (Cambiar a `2024-01-15`).
- [ ] ¿Hay celdas vacías en DNI o Código? (Eliminar fila o corregir).
- [ ] ¿El archivo es `.csv` (UTF-8)?

