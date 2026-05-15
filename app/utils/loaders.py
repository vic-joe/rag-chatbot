from pypdf import PdfReader
import docx


def load_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = []

    for page in reader.pages:
        text.append(page.extract_text() or "")

    return "\n".join(text)


def load_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    text = [para.text for para in doc.paragraphs]
    return "\n".join(text)


def load_document(file_path: str, file_type: str) -> str:
    if file_type == "pdf":
        return load_pdf(file_path)
    elif file_type == "docx":
        return load_docx(file_path)
    else:
        raise ValueError("Unsupported file type")