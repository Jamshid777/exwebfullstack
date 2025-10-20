from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict

class ShiftOut(BaseModel):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    starting_balances: Optional[Dict[str, float]] = None
    ending_balances: Optional[Dict[str, float]] = None
    gross_profit: float
    total_expenses: float
    net_profit: float
    model_config = ConfigDict(from_attributes=True)
