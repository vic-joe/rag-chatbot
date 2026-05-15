def split_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    if not text or not text.strip():
        return []

    clean_text = " ".join(text.split())
    chunks = []
    start = 0

    while start < len(clean_text):
        end = min(start + chunk_size, len(clean_text))
        chunk = clean_text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end == len(clean_text):
            break

        start = max(end - overlap, start + 1)

    return chunks
