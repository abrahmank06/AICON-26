# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from datetime import datetime

class ModelRequest(BaseModel):
    date: datetime
    market: str
    crop: str
