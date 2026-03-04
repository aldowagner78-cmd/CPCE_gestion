import fitz # PyMuPDF
import sys

def inspect_pdf(path, pages=10):
    try:
        doc = fitz.open(path)
        print(f"\n--- Inspecting: {path} ---")
        for i in range(min(pages, doc.page_count)):
            page = doc.load_page(i)
            text = page.get_text()
            print(f"--- Page {i+1} ---")
            print(text[:1000]) # First 1000 chars
        doc.close()
    except Exception as e:
        print(f"Error reading {path}: {e}")

if __name__ == "__main__":
    inspect_pdf(r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\CIE 10 volume1.pdf", pages=50)
    inspect_pdf(r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\DSM5.pdf", pages=50)
