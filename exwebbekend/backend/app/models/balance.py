from sqlalchemy import Column, Integer, Numeric, ForeignKey, UniqueConstraint, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Balance(Base):
    __tablename__ = "balances"
    __table_args__ = (UniqueConstraint("currency_id", name="uq_balance_currency"),)

    id = Column(Integer, primary_key=True)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False, unique=True)
    amount = Column(Numeric(20, 8), nullable=False, default=0.0)
    available_amount = Column(Numeric(20, 8), nullable=False, default=0.0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())

    currency = relationship("Currency")
