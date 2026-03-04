import fitz # PyMuPDF
import re
import json
import os

pdf_path = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\DSM5.pdf"
output_json = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\dsm5_extracted.json"

def full_extract_dsm5():
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        return

    doc = fitz.open(pdf_path)
    all_extracted = []
    
    # Range of Classification pages (Clasificación del DSM-5)
    # Determined as page 19 through about page 33
    start_page = 18
    end_page = 33
    
    # Pattern: [DSM Code optional] [ (CIE code) ] [ Description ]
    # Group 1: DSM code, Group 2: CIE-10 code, Group 3: Name
    pattern = re.compile(r'(\d{3}\.\d{1,2}|)\s*\(([A-Z]\d{1,3}\.?\d*|___.__)\)\s+(.+)$', re.MULTILINE)
    
    for i in range(start_page, end_page + 1):
        if i >= doc.page_count: break
        
        page = doc[i]
        text = page.get_text()
        
        matches = pattern.findall(text)
        for dsm, cie, name in matches:
            # Clean up the name
            name_clean = name.strip()
            # Remove trailing page references like (190)
            name_clean = re.sub(r'\s*\(\d+\)$', '', name_clean).strip()
            # Skip if name is just underscores or very short/garbage
            if len(name_clean) < 3 or '___' in name_clean:
                continue
            
            dsm_code = dsm.strip()
            if not dsm_code:
                dsm_code = f"DSM-{cie.strip()}"
            
            all_extracted.append({
                "code": dsm_code,
                "cie_reference": cie.strip(),
                "name": name_clean,
                "classification": "DSM-5"
            })
            
    doc.close()
    
    # Deduplicate
    seen = set()
    unique_list = []
    for item in all_extracted:
        # Identify by code and name combo to be safe
        key = (item['code'], item['name'])
        if key not in seen:
            unique_list.append(item)
            seen.add(key)
            
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(unique_list, f, ensure_ascii=False, indent=2)
        
    print(f"Extraction complete. {len(unique_list)} unique DSM-5 entries saved to {output_json}")

if __name__ == "__main__":
    full_extract_dsm5()
