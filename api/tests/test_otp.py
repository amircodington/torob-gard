import logging

import pytest

from people import otp
from people.models import AppUser

PHONE = "09121234567"
FA_PHONE = "۰۹۱۲۱۲۳۴۵۶۷"


@pytest.fixture
def sent(monkeypatch):
    """Codes the (mocked) SMS sender would have sent, newest last."""
    codes: list[str] = []

    class Fake:
        def send(self, phone, code):
            codes.append(code)

    monkeypatch.setattr(otp, "sender", lambda: Fake())
    r = otp.redis()
    for k in r.scan_iter("otp:*"):
        r.delete(k)
    yield codes
    for k in r.scan_iter("otp:*"):
        r.delete(k)


def post(client, url, body):
    return client.post(url, body, content_type="application/json")


def ask(client, phone=PHONE):
    return post(client, "/api/auth/otp/request", {"phone": phone})


def verify(client, code, phone=PHONE):
    return post(client, "/api/auth/otp/verify", {"phone": phone, "code": code})


def wrong(code: str) -> str:
    return f"{(int(code) + 1) % 100000:05d}"


def test_sixth_request_in_an_hour_is_limited(client, sent, db):
    for _ in range(5):
        assert ask(client).status_code == 204
    assert ask(client).status_code == 429
    assert len(sent) == 5 and all(len(c) == 5 and c.isdigit() for c in sent)
    assert 0 < otp.redis().ttl(f"otp:c:{otp.phone_hash(PHONE)}") <= 120


def test_five_wrong_codes_lock_fifteen_minutes(client, sent, db):
    ask(client)
    code = sent[-1]
    for _ in range(4):
        assert verify(client, wrong(code)).status_code == 400
    assert verify(client, wrong(code)).status_code == 429
    assert verify(client, code).status_code == 429  # the right code no longer works
    assert 800 < otp.redis().ttl(f"otp:lock:{otp.phone_hash(PHONE)}") <= 900
    assert ask(client).status_code == 429  # no new code while locked
    assert not AppUser.objects.exists()


def test_persian_digits_are_accepted(client, sent, db):
    assert ask(client, FA_PHONE).status_code == 204
    fa_code = sent[-1].translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
    r = verify(client, fa_code, "+98 912 123 4567")
    assert r.status_code == 200 and r.json()["phone_masked"] == "0912***4567"
    assert verify(client, sent[-1]).status_code == 400  # one use only


def test_bad_phone_is_rejected(client, sent, db):
    for bad in ["12345", "0912123456", "abc", "0812123456789"]:
        assert ask(client, bad).status_code == 422
    assert not sent


def test_phone_is_stored_as_hmac_and_aes_gcm(client, sent, db):
    ask(client)
    verify(client, sent[-1])
    u = AppUser.objects.get()
    assert u.phone_hash == otp.phone_hash(PHONE) and PHONE not in u.phone_hash
    enc = bytes(u.phone_enc)
    assert PHONE.encode() not in enc and otp.decrypt(enc) == PHONE
    assert otp.encrypt(PHONE) != otp.encrypt(PHONE)  # random nonce


def test_phone_never_appears_in_logs(client, sent, db, caplog, monkeypatch, settings):
    caplog.set_level(logging.DEBUG)
    ask(client)
    verify(client, wrong(sent[-1]))
    verify(client, sent[-1])
    ask(client, "0912")  # 422
    client.get("/api/me")

    class Down:
        def send(self, phone, code):
            raise otp.SendError("kavenegar 500")

    monkeypatch.setattr(otp, "sender", lambda: Down())
    assert ask(client, "09351234567").status_code == 503
    settings.DEBUG = True
    otp.DevSender().send("09351234567", "12345")
    assert "12345" in caplog.text  # the dev sender logs the code …
    for p in [PHONE, FA_PHONE, "9121234567", "912 123 4567", "09351234567", "9351234567"]:
        assert p not in caplog.text  # … never the phone


def test_no_sms_sender_outside_debug(settings):
    settings.DEBUG, settings.KAVENEGAR_KEY = False, ""
    assert otp.sender() is None
    settings.KAVENEGAR_KEY, settings.KAVENEGAR_TEMPLATE = "k", "t"
    assert isinstance(otp.sender(), otp.KavenegarSender)
