from pydantic import BaseModel
from fastapi import Form

from typing import Optional

class VisualSignatureParams(BaseModel):
    page: int
    x: float
    y: float
    w: float
    h: float
    text: Optional[str] = None

    @classmethod
    def as_form(
        cls,
        page: int = Form(...),
        x: float = Form(...),
        y: float = Form(...),
        w: float = Form(...),
        h: float = Form(...),
        text: Optional[str] = Form(None),
    ):
        return cls(page=page, x=x, y=y, w=w, h=h, text=text)
