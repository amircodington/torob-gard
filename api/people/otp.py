"""Phone OTP: normalise, hash/encrypt, issue and check 5-digit codes in Redis, send by SMS.

The phone number never reaches a log line: senders and errors log codes and statuses only.
"""
import base64
import hashlib
import hmac
import logging
import os
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request
from functools import cache

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from redis import Redis

from torobgard.persian import to_ascii_digits

log = logging.getLogger(__name__)
CODE_TTL, SENDS_PER_HOUR, CLIENT_SENDS_PER_HOUR = 120, 5, 20
MAX_WRONG, LOCK_S = 5, 900
_PHONE = re.compile(r"09\d{9}")


class SendError(Exception):
    pass


@cache
def redis() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


def normalize(raw: str) -> str | None:
    """«۰۹۱۲ ۱۲۳ ۴۵۶۷», +98 912…, 0098…, 912… → 09121234567; None if it is not an Iranian mobile."""
    d = re.sub(r"[\s\-()]", "", to_ascii_digits(raw)).removeprefix("+")
    for prefix in ("0098", "98"):
        if d.startswith(prefix) and len(d) == len(prefix) + 10:
            d = "0" + d[len(prefix):]
    if len(d) == 10 and d.startswith("9"):
        d = "0" + d
    return d if _PHONE.fullmatch(d) else None


def phone_hash(phone: str) -> str:
    return hmac.new(settings.PHONE_PEPPER.encode(), phone.encode(), hashlib.sha256).hexdigest()


def _aes() -> AESGCM:
    return AESGCM(base64.b64decode(settings.PHONE_KEY))


def encrypt(phone: str) -> bytes:
    nonce = os.urandom(12)
    return nonce + _aes().encrypt(nonce, phone.encode(), None)


def decrypt(blob: bytes) -> str:
    return _aes().decrypt(blob[:12], blob[12:], None).decode()


def mask(phone: str) -> str:
    return f"{phone[:4]}***{phone[-4:]}"


def _count(r: Redis, key: str, window: int) -> int:
    n = r.incr(key)
    if n == 1:
        r.expire(key, window)
    return n


def issue(phone: str, client: str) -> bool:
    """Store a fresh code for the phone and send it; False when this phone or client is limited."""
    h, r = phone_hash(phone), redis()
    if r.exists(f"otp:lock:{h}"):
        return False
    if _count(r, f"otp:n:{h}", 3600) > SENDS_PER_HOUR:
        return False
    if _count(r, f"otp:ip:{client}", 3600) > CLIENT_SENDS_PER_HOUR:  # one client, many phones
        return False
    code = f"{secrets.randbelow(10**5):05d}"
    r.set(f"otp:c:{h}", code, ex=CODE_TTL)
    s = sender()
    if s is None:
        raise SendError("no SMS sender configured")
    s.send(phone, code)
    return True


def check(phone: str, code: str) -> str:
    """"ok" (code used up), "bad", or "locked" (5 wrong codes → 15 min, the right one included)."""
    h, r = phone_hash(phone), redis()
    if r.exists(f"otp:lock:{h}"):
        return "locked"
    stored = r.get(f"otp:c:{h}")
    if stored and hmac.compare_digest(stored, code):
        r.delete(f"otp:c:{h}", f"otp:f:{h}")
        return "ok"
    # ponytail: incr-then-check, not atomic with the read; parallel guesses can exceed 5 by a few
    if _count(r, f"otp:f:{h}", LOCK_S) >= MAX_WRONG:
        r.set(f"otp:lock:{h}", 1, ex=LOCK_S)
        r.delete(f"otp:c:{h}", f"otp:f:{h}")
        return "locked"
    return "bad"


class KavenegarSender:
    def send(self, phone: str, code: str) -> None:
        url = f"https://api.kavenegar.com/v1/{settings.KAVENEGAR_KEY}/verify/lookup.json"
        data = urllib.parse.urlencode(
            {"receptor": phone, "token": code, "template": settings.KAVENEGAR_TEMPLATE}).encode()
        try:  # POST body, so the phone is never part of a URL in an error message
            with urllib.request.urlopen(url, data=data, timeout=5) as res:
                status = res.status
        except urllib.error.HTTPError as e:
            status = e.code
        except OSError:
            status = None
        if status != 200:
            log.error("kavenegar send failed: status %s", status)  # URL holds the key: not logged
            raise SendError(f"kavenegar {status}")


class DevSender:
    def send(self, phone: str, code: str) -> None:
        if settings.DEBUG:
            log.info("dev OTP code: %s", code)


def sender() -> KavenegarSender | DevSender | None:
    if settings.KAVENEGAR_KEY:
        return KavenegarSender()
    return DevSender() if settings.DEBUG else None
