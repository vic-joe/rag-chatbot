import os
import shutil
import logging
import time
from uuid import UUID, uuid4
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.utils.loaders import load_document
from app.utils.chunking import split_text
from app.core.config import settings
from app.services.embedding_service import EmbeddingServiceError, get_embeddings
from app.db.models import Document
from app.db.session import get_db
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def serialize_document_group(documents: list[Document]) -> dict:
    first_document = documents[0]
    ordered_documents = sorted(
        documents,
        key=lambda document: document.chunk_index if document.chunk_index is not None else 0,
    )

    return {
        "id": first_document.source or str(first_document.id),
        "content": "\n\n".join(document.content for document in ordered_documents),
        "source": first_document.source,
        "chunk_count": len(documents),
    }


def group_documents(documents: list[Document]) -> list[list[Document]]:
    grouped: dict[str, list[Document]] = {}

    for document in documents:
        group_key = document.source or str(document.id)
        grouped.setdefault(group_key, []).append(document)

    return list(grouped.values())


def get_document_group_or_404(document_id: str, db: Session) -> list[Document]:
    try:
        row_id = UUID(document_id)
    except ValueError:
        documents = (
            db.query(Document)
            .filter(Document.source == document_id)
            .order_by(Document.chunk_index.asc().nullslast())
            .all()
        )
    else:
        document = db.query(Document).filter(Document.id == row_id).first()
        if document:
            if not document.source:
                return [document]

            documents = (
                db.query(Document)
                .filter(Document.source == document.source)
                .order_by(Document.chunk_index.asc().nullslast())
                .all()
            )
        else:
            documents = (
                db.query(Document)
                .filter(Document.source == document_id)
                .order_by(Document.chunk_index.asc().nullslast())
                .all()
            )

    if not documents:
        raise HTTPException(status_code=404, detail="Document not found")

    return documents


def rebuild_document_group(
    documents: list[Document],
    content: str,
    source: str | None,
    db: Session,
) -> list[Document]:
    chunks = split_text(
        content,
        chunk_size=settings.DOCUMENT_CHUNK_SIZE,
        overlap=settings.DOCUMENT_CHUNK_OVERLAP,
    )

    if not chunks:
        raise HTTPException(status_code=400, detail="Text could not be chunked")

    try:
        embeddings = get_embeddings(chunks)
    except EmbeddingServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Embedding failed while rebuilding document")
        raise HTTPException(status_code=502, detail=f"Embedding service error: {str(e)}")

    if len(embeddings) != len(chunks):
        raise HTTPException(
            status_code=502,
            detail="Embedding service returned an unexpected number of vectors",
        )

    for document in documents:
        db.delete(document)

    rebuilt_documents = [
        Document(
            content=chunk,
            embedding=embedding,
            source=source,
            chunk_index=i,
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    db.add_all(rebuilt_documents)
    return rebuilt_documents


# ---------------------------------------
# Document CRUD
# ---------------------------------------
@router.get("/documents/", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    documents = (
        db.query(Document)
        .order_by(Document.source.asc().nullslast(), Document.chunk_index.asc().nullslast())
        .all()
    )
    return [serialize_document_group(group) for group in group_documents(documents)]


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def read_document(document_id: str, db: Session = Depends(get_db)):
    documents = get_document_group_or_404(document_id, db)
    return serialize_document_group(documents)


@router.post("/documents/manual", response_model=DocumentResponse, status_code=201)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    try:
        source = payload.source or f"manual-{uuid4()}"
        documents = rebuild_document_group([], content, source, db)
        db.commit()
        for document in documents:
            db.refresh(document)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Database insert failed for manually created document")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return serialize_document_group(documents)


@router.put("/documents/{document_id}", response_model=DocumentResponse)
def update_document(document_id: str, payload: DocumentUpdate, db: Session = Depends(get_db)):
    documents = get_document_group_or_404(document_id, db)
    changes = payload.dict(exclude_unset=True)

    content = changes.get("content")
    if content is None:
        content = serialize_document_group(documents)["content"]

    content = content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    source = changes.get("source", documents[0].source) or documents[0].source

    try:
        rebuilt_documents = rebuild_document_group(documents, content, source, db)
        db.commit()
        for document in rebuilt_documents:
            db.refresh(document)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Database update failed for document %s", document_id)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return serialize_document_group(rebuilt_documents)


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    documents = get_document_group_or_404(document_id, db)

    try:
        for document in documents:
            db.delete(document)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Database delete failed for document %s", document_id)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "message": "Document deleted successfully",
        "id": str(document_id),
        "chunks_deleted": len(documents),
    }


# ---------------------------------------
# 1. Upload & Ingest Document (FIXED)
# ---------------------------------------
@router.post("/documents/")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Full ingestion pipeline:
    - Save file
    - Extract text
    - Chunk text
    - Generate embeddings
    - Store in PostgreSQL (pgvector)
    """

    started_at = time.perf_counter()

    # ---------------------------------------
    # Validate file
    # ---------------------------------------
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a name")

    filename = os.path.basename(file.filename).lower()

    if not filename.endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT allowed")

    file_ext = filename.split(".")[-1]

    # ---------------------------------------
    # Prevent overwrite (IMPORTANT)
    # ---------------------------------------
    file_path = os.path.join(UPLOAD_DIR, filename)

    if os.path.exists(file_path):
        name_without_ext = os.path.splitext(filename)[0]
        copy_index = 1

        while os.path.exists(file_path):
            suffix = "_copy" if copy_index == 1 else f"_copy{copy_index}"
            filename = f"{name_without_ext}{suffix}.{file_ext}"
            file_path = os.path.join(UPLOAD_DIR, filename)
            copy_index += 1

    # ---------------------------------------
    # Save file
    # ---------------------------------------
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    # ---------------------------------------
    # Extract text
    # ---------------------------------------
    try:
        text = load_document(file_path, file_ext)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="No text extracted from document")

    # ---------------------------------------
    # Split into chunks
    # ---------------------------------------
    extracted_at = time.perf_counter()

    chunks = split_text(
        text,
        chunk_size=settings.DOCUMENT_CHUNK_SIZE,
        overlap=settings.DOCUMENT_CHUNK_OVERLAP,
    )

    if not chunks:
        raise HTTPException(status_code=400, detail="Text could not be chunked")

    # ---------------------------------------
    # Embed + Store
    # ---------------------------------------
    chunked_at = time.perf_counter()

    try:
        embeddings = get_embeddings(chunks)
    except EmbeddingServiceError as e:
        logger.warning("Embedding failed for uploaded document %s: %s", filename, str(e))
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Embedding failed for uploaded document %s", filename)
        raise HTTPException(status_code=502, detail=f"Embedding service error: {str(e)}")

    if len(embeddings) != len(chunks):
        raise HTTPException(
            status_code=502,
            detail="Embedding service returned an unexpected number of vectors",
        )

    embedded_at = time.perf_counter()

    try:
        db.bulk_insert_mappings(
            Document,
            [
                {
                    "content": chunk,
                    "embedding": embedding,
                    "source": filename,
                    "chunk_index": i,
                }
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
            ],
        )
        db.commit()

    except Exception as e:
        db.rollback()
        logger.exception("Database insert failed for uploaded document %s", filename)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    finished_at = time.perf_counter()
    logger.info(
        "Uploaded %s: %d chunks, extract=%.2fs chunk=%.2fs embed=%.2fs db=%.2fs total=%.2fs",
        filename,
        len(chunks),
        extracted_at - started_at,
        chunked_at - extracted_at,
        embedded_at - chunked_at,
        finished_at - embedded_at,
        finished_at - started_at,
    )

    return {
        "message": "Document processed successfully",
        "filename": filename,
        "documents_stored": 1,
        "chunks_stored": len(chunks)
    }
