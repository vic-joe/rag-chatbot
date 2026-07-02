from typing import Any, Dict
from sqlalchemy.orm import Session
from app.db.models import SystemSetting

class SettingsService:
    def __init__(self, db: Session):
        self.db = db
        # Internal cache for a single request lifecycle
        self._cache: Dict[str, Any] = {}

    def get(self, key: str, default: Any = None) -> Any:
        if key in self._cache:
            return self._cache[key]
            
        setting = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not setting:
            return default
            
        # Try to infer type based on value
        value = setting.value
        if value.lower() in ("true", "false"):
            parsed = value.lower() == "true"
        elif value.isdigit():
            parsed = int(value)
        else:
            try:
                parsed = float(value)
            except ValueError:
                parsed = value
                
        self._cache[key] = parsed
        return parsed

    def update(self, key: str, value: str, user_id: int = None) -> SystemSetting:
        setting = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not setting:
            raise ValueError(f"Setting {key} not found")
        
        setting.value = str(value)
        if user_id is not None:
            setting.updated_by = user_id
            
        self.db.commit()
        self.db.refresh(setting)
        
        # Invalidate cache
        if key in self._cache:
            del self._cache[key]
            
        return setting
        
    def get_all(self):
        return self.db.query(SystemSetting).order_by(SystemSetting.category, SystemSetting.key).all()
