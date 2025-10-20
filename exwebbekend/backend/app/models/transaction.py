from sqlalchemy import Column, Integer, Numeric, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    operation_type = Column(String(20), nullable=False)  # 'buy', 'sell', 'deposit', 'withdrawal'
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    amount = Column(Numeric(20, 8), nullable=False)
    rate = Column(Numeric(20, 8), nullable=True)
    total_amount = Column(Numeric(20, 4), nullable=True)
    payment_currency = Column(String(10), nullable=True)  # 'USD', 'UZS', 'MIX'
    uzs_rate = Column(Numeric(20, 4), nullable=True)
    total_amount_uzs = Column(Numeric(20, 4), nullable=True)
    paid_amount_usd = Column(Numeric(20, 4), nullable=True)
    paid_amount_uzs = Column(Numeric(20, 4), nullable=True)
    profit = Column(Numeric(20, 4), nullable=True)
    remaining_amount = Column(Numeric(20, 8), nullable=True)
    status = Column(String(20), nullable=False, server_default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(String, nullable=True)
    wallet_address = Column(String(255), nullable=True)

    currency = relationship("Currency")
