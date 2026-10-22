import json
import os
from pathlib import Path

import pytest

from torobgard.persian import normalize, to_ascii_digits, to_fa_digits

# ponytail: the repo's shared/ dir is bind-mounted at /shared in Docker; SHARED_DIR overrides it.
SHARED = Path(os.environ.get("SHARED_DIR", "/shared"))
CASES = json.loads((SHARED / "persian-cases.json").read_text("utf-8"))


@pytest.mark.parametrize("c", CASES)
def test_normalize(c):
    assert normalize(c["in"]) == c["norm"]


def test_normalize_none():
    assert normalize(None) == ""


def test_digits_roundtrip():
    assert to_ascii_digits("طبقه ۶ واحد ٦٢٢") == "طبقه 6 واحد 622"
    assert to_fa_digits("622") == "۶۲۲"
