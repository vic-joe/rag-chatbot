from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.db.models import Base

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        
        # ── FTS trigger for document_chunks ──────────────────────────────
        conn.execute(text(
            """
            CREATE OR REPLACE FUNCTION document_chunks_fts_update()
            RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                NEW.tsv := to_tsvector('english', NEW.chunk_text);
                RETURN NEW;
            END;
            $$
            """
        ))

        conn.execute(text(
            """
            DROP TRIGGER IF EXISTS trg_document_chunks_fts ON document_chunks;
            CREATE TRIGGER trg_document_chunks_fts
                BEFORE INSERT OR UPDATE OF chunk_text
                ON document_chunks
                FOR EACH ROW
                EXECUTE FUNCTION document_chunks_fts_update();
            """
        ))
        
        # ensure index exists
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_document_chunks_fts ON document_chunks USING GIN (tsv)"
        ))
