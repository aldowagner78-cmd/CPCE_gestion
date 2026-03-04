import os

def split_sql(input_file, output_prefix, lines_per_chunk=7000):
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    header = "INSERT INTO diseases (code, name, level, is_chronic, requires_authorization, classification) VALUES\n"
    footer = "ON CONFLICT (code) DO NOTHING;\n"
    
    # Extract the header comments if any
    start_line = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("INSERT INTO"):
            start_line = i + 2 # Skip INSERT INTO and VALUES lines
            break
    
    # Collect all rows
    rows = []
    for i in range(start_line, len(lines)):
        line = lines[i].strip()
        if not line or line.startswith("INSERT INTO") or line.startswith("VALUES") or line.startswith("ON CONFLICT"):
            continue
        rows.append(line)

    # Split into chunks
    for i in range(0, len(rows), lines_per_chunk):
        chunk = rows[i:i + lines_per_chunk]
        chunk_num = (i // lines_per_chunk) + 1
        output_file = f"{output_prefix}_{chunk_num}.sql"
        
        with open(output_file, 'w', encoding='utf-8') as out:
            out.write(header)
            # Each row except the last in chunk needs a comma at end. 
            # But the rows already have a comma from the input file!
            # Wait, let's check the last row in a chunk.
            for j, row in enumerate(chunk):
                # Clean up existing trailing punctuation
                clean_row = row.rstrip(',;')
                if j < len(chunk) - 1:
                    out.write(f"{clean_row},\n")
                else:
                    out.write(f"{clean_row}\n") # Last row no comma
            out.write(footer)
        print(f"Created {output_file} with {len(chunk)} rows.")

input_path = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\supabase\migrations\018_cie11_import.sql'
output_dir = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\accesorios\split_cie11'

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

split_sql(input_path, os.path.join(output_dir, 'cie11_part'))
