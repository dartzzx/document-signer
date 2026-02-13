from pydantic import BaseModel
from fastapi import Form


class VisualSignatureParams(BaseModel):
    page: int
    x: float
    y: float
    w: float
    h: float
    text: str

    @classmethod
    def as_form(
        cls,
        page: int = Form(...),
        x: float = Form(...),
        y: float = Form(...),
        w: float = Form(...),
        h: float = Form(...),
        text: str = Form(...),
    ):
        return cls(page=page, x=x, y=y, w=w, h=h, text=text)
