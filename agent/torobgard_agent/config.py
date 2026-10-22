import os

BOXAPI_KEY = os.environ.get("BOXAPI_KEY", "")
BOXAPI_BASE_URL = os.environ.get("BOXAPI_BASE_URL", "https://ai.boxapi.ir/ai/v1")
AGENT_MODEL = os.environ.get("AGENT_MODEL", "openai/gpt-5.4-mini")
FAST_MODEL = os.environ.get("FAST_MODEL", "openai/gpt-5-mini")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "openai/text-embedding-3-small")
EMBED_DIMS = int(os.environ.get("EMBED_DIMS", "1024"))
BOXAPI_TOOLS = os.environ.get("BOXAPI_TOOLS", "1") == "1"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
