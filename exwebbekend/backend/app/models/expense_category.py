from sqlalchemy import Column, Integer, String, UniqueConstraint
from app.db.session import Base

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"
    __table_args__ = (UniqueConstraint("name", name="uq_expense_category_name"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
