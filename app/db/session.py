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
        embedding_dimension = conn.execute(
            text(
                """
                SELECT atttypmod
                FROM pg_attribute
                WHERE attrelid = 'documents'::regclass
                  AND attname = 'embedding'
                  AND NOT attisdropped
                """
            )
        ).scalar()

        if embedding_dimension and embedding_dimension != settings.EMBEDDING_DIMENSION:
            raise RuntimeError(
                f"documents.embedding is vector({embedding_dimension}), "
                f"but EMBEDDING_DIMENSION is {settings.EMBEDDING_DIMENSION}. "
                "Recreate the documents table or migrate/re-embed existing rows."
            )

        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS source TEXT"))
        conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_index INTEGER"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL"))
        conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL"))
        conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL"))
        conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL"))
        conn.execute(
            text(
                """
                DO $$
                DECLARE
                    id_type text;
                BEGIN
                    SELECT data_type
                    INTO id_type
                    FROM information_schema.columns
                    WHERE table_name = 'documents'
                      AND column_name = 'id';

                    IF id_type = 'uuid' THEN
                        ALTER TABLE documents
                        ALTER COLUMN id SET DEFAULT gen_random_uuid();
                    ELSE
                        CREATE SEQUENCE IF NOT EXISTS documents_id_seq OWNED BY documents.id;
                        ALTER TABLE documents
                        ALTER COLUMN id SET DEFAULT nextval('documents_id_seq');
                        PERFORM setval(
                            'documents_id_seq',
                            COALESCE((SELECT MAX(id) FROM documents), 0) + 1,
                            false
                        );
                    END IF;
                END $$;
                """
            )
        )
