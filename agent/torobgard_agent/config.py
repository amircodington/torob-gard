import os

BOXAPI_KEY = os.environ.get("BOXAPI_KEY", "")
BOXAPI_KEY_SECOND = os.environ.get("BOXAPI_KEY_SECOND", "")  # used once the first key is out of credit
BOXAPI_BASE_URL = os.environ.get("BOXAPI_BASE_URL", "https://api.gapgpt.app/v1")
AGENT_MODEL = os.environ.get("AGENT_MODEL", "gpt-6-luna")
FAST_MODEL = os.environ.get("FAST_MODEL", "gpt-6-luna")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "text-embedding-3-small")
EMBED_DIMS = int(os.environ.get("EMBED_DIMS", "1024"))
BOXAPI_TOOLS = os.environ.get("BOXAPI_TOOLS", "1") == "1"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
# evals only: the agent model's temperature during `make eval` ("" = model default); FAST_MODEL rejects it
_eval_t = os.environ.get("EVAL_TEMPERATURE", "0")
EVAL_TEMPERATURE = float(_eval_t) if _eval_t else None
