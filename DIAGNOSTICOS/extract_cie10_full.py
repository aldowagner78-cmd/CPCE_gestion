import fitz # PyMuPDF
import re
import json
import os

pdf_path = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\CIE 10 volume1.pdf"
output_json = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\cie10_extracted.json"

def full_extract_cie10():
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        return

    doc = fitz.open(pdf_path)
    all_extracted = []
    
    # Simple regex for A00, A00.0, etc.
    # We also want to capture the "Chapter" and "Group" potentially, but for now let's focus on the codes.
    code_pattern = re.compile(r'^([A-Z]\d{2}(\.\d)?)\s+(.+)$', re.MULTILINE)
    
    # We skip the TOC and intro - search for the first occurrence of A00
    start_found = False
    
    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text()
        
        # Determine if this page has actual code listings
        matches = code_pattern.findall(text)
        if matches:
            if not start_found:
                # Check if this is truly the start or just some random text matching the pattern
                if any(m[0] == 'A00' for m in matches):
                    start_found = True
                    print(f"Starting extraction at page {i+1}")
            
            if start_found:
                for code, sub, desc in matches:
                    # Clean the name (sometimes there's a lot of dot-filling leading to a page number)
                    name = desc.strip()
                    # Remove trailing dots and page numbers like '... 123'
                    name = re.sub(r'\.{3,}\s*\d*', '', name).strip()
                    all_extracted.append({
                        "code": code,
                        "name": name,
                        "classification": "CIE-10"
                    })
        
        if (i + 1) % 100 == 0:
            print(f"Processed page {i+1}/{doc.page_count}...")

    doc.close()
    
    # Remove duplicates (sometimes headers repeat the code)
    seen = set()
    unique_list = []
    for item in all_extracted:
        if item['code'] not in seen:
            unique_list.append(item)
            seen.add(item['code'])
            
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(unique_list, f, ensure_ascii=False, indent=2)
        
    print(f"Extraction complete. {len(unique_list)} unique codes saved to {output_json}")

if __name__ == "__main__":
    full_extract_cie10()
