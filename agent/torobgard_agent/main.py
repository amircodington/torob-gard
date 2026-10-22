import logging

from fastapi import FastAPI

from .api import router

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="torob-gard agent")
app.include_router(router)


@app.get("/agent/health")
async def health():
    return {"ok": True}
