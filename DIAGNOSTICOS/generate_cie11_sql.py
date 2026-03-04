import json
import os

json_file = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\cie11_processed.json'
sql_file = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\supabase\migrations\015_cie11_import.sql'

def generate_sql():
    if not os.path.exists(json_file):
        print(f"Error: {json_file} does not exist.")
        return

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- =====================================================\n")
        f.write("-- MIGRACIÓN 015: IMPORTACIÓN MASIVA CIE-11\n")
        f.write("-- Inserta 35,000+ diagnósticos del sistema CIE-11\n")
        f.write("-- =====================================================\n\n")
        
        batch_size = 500
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            values = []
            for item in batch:
                # Sanitize name for SQL
                name = item['name'].replace("'", "''")
                code = item['code']
                level = item['level']
                is_chronic = 'true' if item['is_chronic'] else 'false'
                requires_auth = 'true' if item['requires_authorization'] else 'false'
                classification = 'CIE-11'
                
                values.append(f"('{code}', '{name}', '{level}', {is_chronic}, {requires_auth}, '{classification}')")
            
            f.write("INSERT INTO diseases (code, name, level, is_chronic, requires_authorization, classification)\n")
            f.write("VALUES\n")
            f.write(",\n".join(values))
            f.write("\nON CONFLICT (code) DO NOTHING;\n\n")
            
    print(f"SQL migration generated: {sql_file}")

if __name__ == "__main__":
    generate_sql()
