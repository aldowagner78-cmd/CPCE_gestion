import fitz # PyMuPDF
import re

def search_pattern_real(path, search_term):
    doc = fitz.open(path)
    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text()
        if search_term in text:
            print(f"Found {search_term} on page {i+1}")
            print(text[:2000])
            break
    doc.close()

if __name__ == "__main__":
    search_pattern_real(r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\DSM5.pdf", "309.21 (F93.0)")
