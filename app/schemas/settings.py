from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class SystemSettingResponse(BaseModel):
    id: str
    key: str
    value: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_editable: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SystemSettingUpdate(BaseModel):
    value: str
