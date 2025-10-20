from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.currency import Currency
from app.models.balance import Balance


async def init_db():
    async with AsyncSessionLocal() as session:
        await _seed_admin(session)
        await _seed_currencies_and_balances(session)


async def _seed_admin(session: AsyncSession):
    res = await session.execute(select(User).where(User.username == settings.admin_username))
    user = res.scalar_one_or_none()
    if user is None:
        user = User(
            username=settings.admin_username,
            hashed_password=get_password_hash(settings.admin_password),
        )
        session.add(user)
        await session.commit()


async def _seed_currencies_and_balances(session: AsyncSession):
    # Seed currencies USD, UZS, USDT if not exist
    existing = (await session.execute(select(Currency))).scalars().all()
    codes = {c.code for c in existing}

    data = [
        {"code": "USD", "name": "US Dollar", "symbol": "$"},
        {"code": "UZS", "name": "Uzbek So'm", "symbol": "so'm"},
        {"code": "USDT", "name": "Tether", "symbol": "₮"},
    ]

    new_currencies = []
    for d in data:
        if d["code"] not in codes:
            c = Currency(code=d["code"], name=d["name"], symbol=d["symbol"])
            session.add(c)
            new_currencies.append(c)
    if new_currencies:
        await session.commit()

    # Ensure balances exist for all currencies
    currencies = (await session.execute(select(Currency))).scalars().all()
    cur_id_by_code = {c.code: c.id for c in currencies}

    # Create balances if missing
    for code, cid in cur_id_by_code.items():
        exists = (await session.execute(select(Balance).where(Balance.currency_id == cid))).scalar_one_or_none()
        if exists is None:
            session.add(Balance(currency_id=cid, amount=0, available_amount=0))
    await session.commit()
