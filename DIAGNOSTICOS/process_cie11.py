import csv
import json
import os

input_file = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\CIE11_ES\SimpleTabulation-ICD-11-MMS-es.txt'
output_file = r'C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\cie11_processed.json'

def clean_title(title):
    # Remove leading dashes and spaces
    return title.lstrip('- ').strip()

def process_cie11():
    results = []
    if not os.path.exists(input_file):
        print(f"Error: File {input_file} not found.")
        return

    with open(input_file, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            code = row.get('Code', '').strip()
            title = row.get('Title', '').strip()
            class_kind = row.get('ClassKind', '').strip()
            
            # We only want entities that have a code
            if code:
                # Determine level based on ClassKind
                # Chapter -> 0, Block -> 1, Category -> 2+
                level = row.get('ClassKind', '')
                
                results.append({
                    "code": code,
                    "name": clean_title(title),
                    "classification": "CIE-11",
                    "level": level,
                    "is_chronic": False, # Default
                    "requires_authorization": False # Default
                })

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"Processed {len(results)} codes. Saved to {output_file}")

if __name__ == "__main__":
    process_cie11()
