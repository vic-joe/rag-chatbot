
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    JINA_API_KEY: str = ""
    JINA_API_BASE_URL: str = "https://api.jina.ai/v1"
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/rag_db"
    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = "local-hashing-v1"
    EMBEDDING_DIMENSION: int = 1024
    EMBEDDING_BATCH_SIZE: int = 64
    DOCUMENT_CHUNK_SIZE: int = 1800
    DOCUMENT_CHUNK_OVERLAP: int = 120
    CHAT_MODEL: str = "gpt-4o-mini"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
