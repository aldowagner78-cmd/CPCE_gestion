import json
import os

cie10_file = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\cie10_extracted.json'
dsm5_file = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\dsm5_extracted_v3.json'
sql_file_16 = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\supabase\migrations\016_cie10_import.sql'
sql_file_17 = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\supabase\migrations\017_dsm5_import.sql'

def escape_sql(text):
    if not text: return "''"
    return "'" + text.replace("'", "''") + "'"

def generate_cie10_sql():
    if not os.path.exists(cie10_file): return
    with open(cie10_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    with open(sql_file_16, 'w', encoding='utf-8') as f:
        f.write("-- CIE-10 IMPORT MIGRATION\n")
        f.write("BEGIN;\n")
        # I'll use batch inserts
        batch_size = 500
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            f.write("INSERT INTO diseases (code, name, classification) VALUES\n")
            lines = []
            for item in batch:
                code = escape_sql(item['code'])
                name = escape_sql(item['name'])
                lines.append(f"({code}, {name}, 'CIE-10')")
            f.write(",\n".join(lines))
            f.write("\nON CONFLICT (code) DO NOTHING;\n") # Assumes code is unique or has a unique constraint
        f.write("COMMIT;\n")
    print(f"Generated {sql_file_16} with {len(data)} entries.")

def generate_dsm5_sql():
    if not os.path.exists(dsm5_file): return
    with open(dsm5_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    with open(sql_file_17, 'w', encoding='utf-8') as f:
        f.write("-- DSM-5 IMPORT MIGRATION\n")
        f.write("BEGIN;\n")
        batch_size = 100
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            f.write("INSERT INTO diseases (code, name, classification) VALUES\n")
            lines = []
            for item in batch:
                code = escape_sql(item['code'])
                # Some DSM entries have the CIE code in name, let's keep it as extracted
                name = escape_sql(item['name'])
                lines.append(f"({code}, {name}, 'DSM-5')")
            f.write(",\n".join(lines))
            f.write("\nON CONFLICT (code) DO NOTHING;\n")
        f.write("COMMIT;\n")
    print(f"Generated {sql_file_17} with {len(data)} entries.")

if __name__ == "__main__":
    generate_cie10_sql()
    generate_dsm5_sql()
