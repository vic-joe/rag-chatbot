import os
import sys
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.db.session import engine, Base
from app.db.models import DocumentModel, DocumentChunk, User, ChatSession, ChatMessage

def reset_db():
    print("Dropping documents and document_chunks tables...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS document_chunks CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS documents CASCADE;"))
        conn.commit()
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Creating TSVECTOR trigger on document_chunks...")
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION document_chunks_tsv_trigger() RETURNS trigger AS $$
            begin
                new.tsv := to_tsvector('english', new.chunk_text);
                return new;
            end
            $$ LANGUAGE plpgsql;
        """))
        conn.execute(text("""
            DROP TRIGGER IF EXISTS tsvectorupdate ON document_chunks;
        """))
        conn.execute(text("""
            CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
            ON document_chunks FOR EACH ROW EXECUTE FUNCTION document_chunks_tsv_trigger();
        """))
        # Create an index on the tsvector column
        conn.execute(text("CREATE INDEX IF NOT EXISTS document_chunks_tsv_idx ON document_chunks USING GIN(tsv);"))
        conn.commit()
    print("Database schema successfully reset.")

if __name__ == "__main__":
    reset_db()
