import pdfplumber
import re
import json
import os

pdf_path = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\DSM5.pdf"
output_json = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\dsm5_extracted_v2.json"

def full_extract_dsm5_plumber():
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        return

    all_extracted = []
    
    # Range of Classification pages (Clasificación del DSM-5)
    # Page 19 to 33
    with pdfplumber.open(pdf_path) as pdf:
        # pdfplumber is 0-indexed for pages unlike PyMuPDF in some contexts, 
        # but here we use index i consistent with before.
        for i in range(18, 34):
            page = pdf.pages[i]
            # Use extract_text with layout preserved if possible
            text = page.extract_text()
            if not text: continue
            
            # Pattern: [DSM Code optional] [ (CIE code) ] [ Description ]
            # We look for lines that contain a CIE-10 code in parentheses
            lines = text.split('\n')
            for line in lines:
                # Regex to catch: 296.21 (F32.0) Major Depressive Disorder...
                # Or just (F32.0) Major Depressive Disorder...
                match = re.search(r'(\d{3}\.\d{1,2}|)\s*\(([A-Z]\d{1,3}\.?\d*|___.__)\)\s+(.+)$', line)
                if match:
                    dsm, cie, name = match.groups()
                    name_clean = re.sub(r'\s*\(\d+\)$', '', name).strip()
                    # Remove trailing stuff like '...'
                    name_clean = re.sub(r'\.{2,}.*$', '', name_clean).strip()
                    
                    if len(name_clean) < 3: continue
                    
                    dsm_code = dsm.strip()
                    if not dsm_code:
                        dsm_code = f"DSM-{cie.strip()}"
                    
                    all_extracted.append({
                        "code": dsm_code,
                        "cie_reference": cie.strip(),
                        "name": name_clean,
                        "classification": "DSM-5"
                    })

    # Deduplicate
    seen = set()
    unique_list = []
    for item in all_extracted:
        key = (item['code'], item['name'])
        if key not in seen:
            unique_list.append(item)
            seen.add(key)
            
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(unique_list, f, ensure_ascii=False, indent=2)
        
    print(f"Extraction complete. {len(unique_list)} unique DSM-5 entries saved to {output_json}")

if __name__ == "__main__":
    full_extract_dsm5_plumber()
