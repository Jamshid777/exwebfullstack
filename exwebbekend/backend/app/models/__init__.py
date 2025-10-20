# Import models to register them with SQLAlchemy metadata
from app.models.user import User  # noqa: F401
from app.models.currency import Currency  # noqa: F401
from app.models.balance import Balance  # noqa: F401
from app.models.shift import Shift  # noqa: F401
from app.models.transaction import Transaction  # noqa: F401
from app.models.expense_category import ExpenseCategory  # noqa: F401
from app.models.expense import Expense  # noqa: F401

# Helper to trigger imports from init_models()
all_models = True
