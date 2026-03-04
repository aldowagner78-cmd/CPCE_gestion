import fitz # PyMuPDF

def search_for_start(path, search_term):
    doc = fitz.open(path)
    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text()
        if search_term in text:
            print(f"Found {search_term} on page {i+1}")
            print(text[:1000])
            if i > 0:
                break # Just find first
    doc.close()

if __name__ == "__main__":
    search_for_start(r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\CIE 10 volume1.pdf", "A00")
    search_for_start(r"C:\Users\kengy\Desktop\CPCE\CPCE_gestion\cpce_app\DIAGNOSTICOS\DSM5.pdf", "Trastornos del neurodesarrollo")
