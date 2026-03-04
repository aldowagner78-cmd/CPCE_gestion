import fitz # PyMuPDF
import re
import json

def extract_dsm5_test(path, start_page=19, end_page=30):
    doc = fitz.open(path)
    all_extracted = []
    
    # Pattern: [DSM Code] ([CIE Code]) [Description] ([Page])
    # Examples:
    # 309.21 (F93.0) Trastorno de ansiedad por separación (190)
    # 312.81 (F91.1) Trastorno de la conducta (469)
    # (F91.2) Tipo de inicio en la adolescencia (469) -- some don't have DSM codes?
    
    dsm_pattern = re.compile(r'(\d{3}\.\d{1,2}|)\s*\(([A-Z]\d{2}\.?\d*)\)\s+(.+?)(?:\s+\(\d+\))?$', re.MULTILINE)
    
    for i in range(start_page-1, end_page):
        page = doc[i]
        text = page.get_text()
        matches = dsm_pattern.findall(text)
        for dsm_code, cie_code, desc in matches:
            all_extracted.append({
                "code": dsm_code.strip() if dsm_code.strip() else f"DSM-{cie_code}",
                "cie_reference": cie_code.strip(),
                "name": desc.strip(),
                "classification": "DSM-5"
            })
    
    doc.close()
    return all_extracted

if __name__ == "__main__":
    results = extract_dsm5_test(r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\DSM5.pdf")
    print(json.dumps(results[:50], indent=2))
    print(f"Extracted {len(results)} items from test pages.")
