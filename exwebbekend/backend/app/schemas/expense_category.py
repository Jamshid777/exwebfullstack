from pydantic import BaseModel

class ExpenseCategoryCreate(BaseModel):
    name: str

class ExpenseCategoryOut(BaseModel):
    id: int
    name: str
