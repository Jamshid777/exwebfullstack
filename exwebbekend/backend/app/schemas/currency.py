from pydantic import BaseModel, ConfigDict

class CurrencyOut(BaseModel):
    id: int
    code: str
    name: str
    symbol: str
    model_config = ConfigDict(from_attributes=True)
