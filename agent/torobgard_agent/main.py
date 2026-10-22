from fastapi import FastAPI

app = FastAPI(title="torob-gard agent")


@app.get("/agent/health")
async def health():
    return {"ok": True}
