
from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.rag_pipeline import RAGPipeline
from app.services.retrieval_service import RetrievalService


def get_retrieval_service(db: Session = Depends(get_db)):
    return RetrievalService(db=db, top_k=5)

def get_rag_pipeline(
    retrieval_service: RetrievalService = Depends(get_retrieval_service)
):
    return RAGPipeline(retrieval_service)



# from fastapi import Depends
# from sqlalchemy.orm import Session

# from app.db.session import get_db
# from app.services.rag_pipeline import RAGPipeline
# from app.services.retrieval_service import RetrievalService


# def get_retrieval_service(db: Session = Depends(get_db)):
#     return RetrievalService(db=db, top_k=5)

# def get_rag_pipeline(
#     retrieval_service: RetrievalService = Depends(get_retrieval_service)
# ):
#     return RAGPipeline(retrieval_service)
