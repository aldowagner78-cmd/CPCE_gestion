import fitz # PyMuPDF
import re
import json
import os

pdf_path = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\DSM5.pdf"
output_json = r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\dsm5_extracted_v3.json"

def full_extract_dsm5_blocks():
    if not os.path.exists(pdf_path): return
    doc = fitz.open(pdf_path)
    all_extracted = []
    
    # Range of Index pages: xviii (index 18) to ???
    # Let's read pages 18 to 40 just in case
    for p in range(18, 41):
        page = doc[p]
        blocks = page.get_text("blocks")
        # Blocks: (x0, y0, x1, y1, "text", block_no, block_type)
        # Sort blocks by Y primarily, but we need to split by columns.
        # Typical page width is ~600. Midpoint ~300.
        left_col = []
        right_col = []
        for b in blocks:
            text = b[4].strip()
            if not text: continue
            if b[0] < 300: # Left side
                left_col.append(b)
            else:
                right_col.append(b)
        
        # Combine columns separately to avoid interleaving
        full_text_v3 = ""
        for b in sorted(left_col, key=lambda x: x[1]):
            full_text_v3 += b[4] + "\n"
        for b in sorted(right_col, key=lambda x: x[1]):
            full_text_v3 += b[4] + "\n"
            
        # Pattern: [DSM Code optional] [ (CIE code) ] [ Description ]
        pattern = re.compile(r'(\d{3}\.\d{1,2}|)\s*\(([A-Z]\d{2,3}\.?\d*|___.__)\)\s+(.+)$', re.MULTILINE)
        
        matches = pattern.findall(full_text_v3)
        for dsm, cie, name in matches:
            name_clean = name.strip()
            name_clean = re.sub(r'\s*\(\d+\)$', '', name_clean).strip()
            # Remove trailing dots
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
            
    doc.close()
    
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
    full_extract_dsm5_blocks()
