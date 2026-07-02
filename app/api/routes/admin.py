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
from app.db.models import DocumentModel, DocumentChunk
from app.db.session import get_db
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate
from app.services.settings_service import SettingsService
from app.schemas.settings import SystemSettingResponse, SystemSettingUpdate

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def serialize_document(document: DocumentModel) -> dict:
    return {
        "id": str(document.id),
        "title": document.title,
        "filename": document.filename,
        "file_path": document.file_path,
        "category": document.category,
        "uploaded_by": document.uploaded_by,
        "upload_date": document.upload_date,
        "status": document.status,
        "chunk_count": len(document.chunks),
        # the frontend edit form expects content
        "content": "\n\n".join(chunk.chunk_text for chunk in sorted(document.chunks, key=lambda c: c.chunk_index)),
    }


def get_document_or_404(document_id: str, db: Session) -> DocumentModel:
    try:
        row_id = UUID(document_id)
        document = db.query(DocumentModel).filter(DocumentModel.id == row_id).first()
    except ValueError:
        # fallback to finding by filename
        document = db.query(DocumentModel).filter(DocumentModel.filename == document_id).first()
        
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


def rebuild_document_chunks(
    document: DocumentModel,
    content: str,
    db: Session,
) -> None:
    settings_svc = SettingsService(db)
    chunk_size = settings_svc.get("chunk_size", settings.DOCUMENT_CHUNK_SIZE)
    chunk_overlap = settings_svc.get("chunk_overlap", settings.DOCUMENT_CHUNK_OVERLAP)

    chunks = split_text(
        content,
        chunk_size=chunk_size,
        overlap=chunk_overlap,
    )

    if not chunks:
        raise HTTPException(status_code=400, detail="Text could not be chunked")

    try:
        embeddings = get_embeddings(chunks, db)
    except EmbeddingServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Embedding failed while rebuilding document chunks")
        raise HTTPException(status_code=502, detail=f"Embedding service error: {str(e)}")

    if len(embeddings) != len(chunks):
        raise HTTPException(
            status_code=502,
            detail="Embedding service returned an unexpected number of vectors",
        )

    # delete old chunks
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()

    new_chunks = [
        DocumentChunk(
            document_id=document.id,
            chunk_index=i,
            chunk_text=chunk,
            embedding=embedding,
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    db.add_all(new_chunks)


# ---------------------------------------
# Document CRUD
# ---------------------------------------
@router.get("/documents/", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    documents = db.query(DocumentModel).order_by(DocumentModel.upload_date.desc()).all()
    return [serialize_document(doc) for doc in documents]


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def read_document(document_id: str, db: Session = Depends(get_db)):
    document = get_document_or_404(document_id, db)
    return serialize_document(document)


@router.post("/documents/manual", response_model=DocumentResponse, status_code=201)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    try:
        title = payload.title or f"manual-{uuid4()}"
        document = DocumentModel(
            title=title,
            filename=payload.filename or title,
            category=payload.category or "manual",
            status=payload.status or "active"
        )
        db.add(document)
        db.flush()
        
        rebuild_document_chunks(document, content, db)
        db.commit()
        db.refresh(document)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Database insert failed for manually created document")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return serialize_document(document)


@router.put("/documents/{document_id}", response_model=DocumentResponse)
def update_document(document_id: str, payload: DocumentUpdate, db: Session = Depends(get_db)):
    document = get_document_or_404(document_id, db)
    changes = payload.dict(exclude_unset=True)

    if "title" in changes: document.title = changes["title"]
    if "filename" in changes: document.filename = changes["filename"]
    if "category" in changes: document.category = changes["category"]
    if "status" in changes: document.status = changes["status"]

    content = changes.get("content")
    if content is not None:
        content = content.strip()
        if not content:
            raise HTTPException(status_code=400, detail="Content cannot be empty")

    try:
        if content is not None:
            rebuild_document_chunks(document, content, db)
            
        db.commit()
        db.refresh(document)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Database update failed for document %s", document_id)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return serialize_document(document)


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    document = get_document_or_404(document_id, db)
    
    chunk_count = len(document.chunks)

    try:
        db.delete(document)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Database delete failed for document %s", document_id)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "message": "Document deleted successfully",
        "id": str(document.id),
        "chunks_deleted": chunk_count,
    }


# ---------------------------------------
# Settings CRUD
# ---------------------------------------
@router.get("/settings/", response_model=list[SystemSettingResponse])
def list_settings(db: Session = Depends(get_db)):
    settings_svc = SettingsService(db)
    return settings_svc.get_all()


@router.put("/settings/{key}", response_model=SystemSettingResponse)
def update_setting(key: str, payload: SystemSettingUpdate, db: Session = Depends(get_db)):
    settings_svc = SettingsService(db)
    try:
        return settings_svc.update(key, payload.value)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


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
    name_without_ext = os.path.splitext(filename)[0]

    if os.path.exists(file_path):
        copy_index = 1

        while os.path.exists(file_path):
            suffix = f"_copy{copy_index}"
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

    settings_svc = SettingsService(db)
    chunk_size = settings_svc.get("chunk_size", settings.DOCUMENT_CHUNK_SIZE)
    chunk_overlap = settings_svc.get("chunk_overlap", settings.DOCUMENT_CHUNK_OVERLAP)

    chunks = split_text(
        text,
        chunk_size=chunk_size,
        overlap=chunk_overlap,
    )

    if not chunks:
        raise HTTPException(status_code=400, detail="Text could not be chunked")

    # ---------------------------------------
    # Embed + Store
    # ---------------------------------------
    chunked_at = time.perf_counter()

    try:
        embeddings = get_embeddings(chunks, db)
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
        document = DocumentModel(
            title=name_without_ext,
            filename=filename,
            file_path=file_path,
            category=file_ext,
            status="active"
        )
        db.add(document)
        db.flush() # flush to get document.id
        
        db.bulk_insert_mappings(
            DocumentChunk,
            [
                {
                    "document_id": document.id,
                    "chunk_text": chunk,
                    "embedding": embedding,
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
