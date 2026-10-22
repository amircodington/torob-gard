import re
from functools import cache

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from . import config


def make_engine(url: str | None = None) -> AsyncEngine:
    url = re.sub(r"^postgres(ql)?://", "postgresql+asyncpg://", url or config.DATABASE_URL)
    return create_async_engine(url)


@cache
def engine() -> AsyncEngine:
    return make_engine()
