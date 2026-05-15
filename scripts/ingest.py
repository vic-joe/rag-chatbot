import os
from app.db.session import SessionLocal
from app.services.embedding_service import get_embedding
from app.db.models import Document

db = SessionLocal()

folder = "documents"

for file in os.listdir(folder):
    with open(os.path.join(folder, file), "r", encoding="utf-8") as f:
        text = f.read()

        embedding = get_embedding(text)

        doc = Document(content=text, embedding=embedding)
        db.add(doc)

db.commit()
db.close()

print("Documents ingested successfully")