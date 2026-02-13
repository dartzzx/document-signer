from pydantic import BaseModel, Field


class VisualSignatureParams(BaseModel):
    page: int = Field(..., ge=0)
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0)
    w: float = Field(..., gt=0)
    h: float = Field(..., gt=0)
    text: str = Field(..., min_length=1)