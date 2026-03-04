import fitz # PyMuPDF
import re
import json

def extract_cie10_test(path, start_page=35, end_page=45):
    doc = fitz.open(path)
    all_extracted = []
    
    # Simple regex for A00, A00.0, etc.
    # Pattern: Usually at the start of a line, or clearly delimited
    # Codes: [A-Z][0-9]{2}(\.[0-9])?
    code_pattern = re.compile(r'^([A-Z]\d{2}(\.\d)?)\s+(.+)$', re.MULTILINE)
    
    for i in range(start_page-1, end_page):
        page = doc[i]
        text = page.get_text()
        matches = code_pattern.findall(text)
        for code, sub, desc in matches:
            all_extracted.append({"code": code, "name": desc.strip(), "classification": "CIE-10"})
    
    doc.close()
    return all_extracted

if __name__ == "__main__":
    results = extract_cie10_test(r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\CIE 10 volume1.pdf")
    print(json.dumps(results[:50], indent=2))
    print(f"Extracted {len(results)} items from test pages.")
