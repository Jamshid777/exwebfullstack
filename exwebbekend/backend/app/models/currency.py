from sqlalchemy import Column, Integer, String
from app.db.session import Base

class Currency(Base):
    __tablename__ = "currencies"

    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    symbol = Column(String(10), nullable=False)
