import fitz  # PyMuPDF

def parse_pdf(file_path: str) -> list[str]:
    """
    Extracts plain text page-by-page from a PDF file using PyMuPDF.
    """
    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return pages

