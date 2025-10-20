from sqlalchemy import Column, Integer, DateTime, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.session import Base


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True)
    start_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    starting_balances = Column(JSONB, nullable=True)
    ending_balances = Column(JSONB, nullable=True)
    gross_profit = Column(Numeric(20, 4), nullable=False, server_default="0.0")
    total_expenses = Column(Numeric(20, 4), nullable=False, server_default="0.0")
    net_profit = Column(Numeric(20, 4), nullable=False, server_default="0.0")
