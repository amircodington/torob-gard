import json
import os
from pathlib import Path

import pytest

from torobgard_agent.persian import normalize

CASES = json.loads((Path(os.environ.get("SHARED_DIR", "/shared")) / "persian-cases.json").read_text("utf-8"))


@pytest.mark.parametrize("c", CASES)
def test_normalize(c):
    assert normalize(c["in"]) == c["norm"]
