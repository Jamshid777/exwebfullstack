from pydantic import BaseModel

class BalanceOut(BaseModel):
    currency_code: str
    amount: float
    available_amount: float
