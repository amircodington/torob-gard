import base64
import os
import subprocess
import sys

KEY = base64.b64encode(b"k" * 32).decode()


def _load(**env):
    """Import settings in a fresh interpreter with DEBUG=0 and the given env."""
    clean = {k: v for k, v in os.environ.items()
             if k not in ("DJANGO_SECRET_KEY", "PHONE_PEPPER", "PHONE_KEY", "ALLOWED_HOSTS")}
    return subprocess.run([sys.executable, "-c", "import torobgard.settings"],
                          env={**clean, "DEBUG": "0", **env}, capture_output=True, text=True)


def test_prod_refuses_the_dev_secret_key():
    r = _load(PHONE_PEPPER="p", PHONE_KEY=KEY)
    assert r.returncode != 0 and "DJANGO_SECRET_KEY" in r.stderr


def test_prod_refuses_any_host():
    r = _load(DJANGO_SECRET_KEY="s", PHONE_PEPPER="p", PHONE_KEY=KEY)
    assert r.returncode != 0 and "ALLOWED_HOSTS" in r.stderr


def test_prod_starts_with_every_secret_set():
    env = {"DJANGO_SECRET_KEY": "s", "PHONE_PEPPER": "p", "PHONE_KEY": KEY, "ALLOWED_HOSTS": "x"}
    assert _load(**env).returncode == 0
