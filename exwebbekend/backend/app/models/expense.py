from sqlalchemy import Column, Integer, Numeric, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    amount = Column(Numeric(20, 4), nullable=False)
    currency = Column(String(10), nullable=False)  # 'USD' or 'UZS'
    amount_usd = Column(Numeric(20, 4), nullable=False)
    uzs_rate = Column(Numeric(20, 4), nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("ExpenseCategory")
