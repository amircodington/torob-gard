from datetime import timedelta
from uuid import uuid4

import pytest
from django.core.management import call_command
from django.utils import timezone

from catalog.models import ShopReport
from conversation.models import ItemMemory, Message, Session
from people import otp
from people.api import uid_token
from people.models import AppUser, NeedsProfile
from tests.test_trips import pair  # noqa: F401
from trips.models import Trip

PHONE = "09121234567"


@pytest.fixture
def sent(monkeypatch):
    codes: list[str] = []

    class Fake:
        def send(self, phone, code):
            codes.append(code)

    monkeypatch.setattr(otp, "sender", lambda: Fake())
    r = otp.redis()
    for k in r.scan_iter("otp:*"):
        r.delete(k)
    return codes


def post(client, url, body):
    return client.post(url, body, content_type="application/json")


def login(client, sent, **extra):
    assert post(client, "/api/auth/otp/request", {"phone": PHONE}).status_code == 204
    r = post(client, "/api/auth/otp/verify", {"phone": PHONE, "code": sent[-1], **extra})
    assert r.status_code == 200, r.content
    return r


def test_guest_gets_401(client, db):
    assert client.get("/api/me").status_code == 401
    assert client.delete("/api/me").status_code == 401


def test_verify_merges_the_guests_trip_and_agent_memory(client, sent, pair):  # noqa: F811
    tid = post(client, "/api/trips", {"product_id": "p1", "chosen_shop_id": "s1"}).json()["id"]
    sid = uuid4()
    Session.objects.create(id=sid, model="m", context={"profile": {"budget_max": 9000000}})
    ItemMemory.objects.create(user_id=sid, product_id="p1", state="liked")
    r = login(client, sent, agent_session_id=str(sid))
    c = r.cookies["sessionid"]
    assert c["httponly"] and c["samesite"] == "Lax"
    me = client.get("/api/me").json()
    assert [t["id"] for t in me["trips"]] == [tid]
    assert [(m["product_id"], m["state"], m["product_title"]) for m in me["memory"]] == [
        ("p1", "liked", "گوشی")]
    assert me["profile"]["budget_max"] == 9000000
    assert me["phone_masked"] == "0912***4567"
    u = AppUser.objects.get()
    assert Trip.objects.get(id=tid).user_id == u.id
    assert Session.objects.get(id=sid).user_id == u.id


def test_logged_in_trips_and_reports_carry_the_user(client, sent, pair):  # noqa: F811
    login(client, sent)
    tid = post(client, "/api/trips", {"product_id": "p1"}).json()["id"]
    post(client, "/api/reports", {"shop_id": "s1", "kind": "closed"})
    u = AppUser.objects.get()
    assert Trip.objects.get(id=tid).user_id == u.id
    assert ShopReport.objects.get().user_id == u.id


def test_profile_is_editable(client, sent, db):
    login(client, sent)
    r = client.patch("/api/me/profile", {"notes": "دوربین خوب می‌خوام", "budget_max": 20000000,
                     "preferred_brands": ["سامسونگ"]}, content_type="application/json")
    assert r.status_code == 200
    p = NeedsProfile.objects.get()
    assert (p.notes, p.budget_max) == ("دوربین خوب می‌خوام", 20000000)
    assert p.preferred_brands == ["سامسونگ"]
    big = client.patch("/api/me/profile", {"notes": "x" * 2001}, content_type="application/json")
    assert big.status_code == 422


def test_delete_me_removes_trips_and_memory_and_anonymises(client, sent, pair):  # noqa: F811
    post(client, "/api/trips", {"product_id": "p1"})
    sid = uuid4()
    s = Session.objects.create(id=sid, model="m", context={"profile": {"budget_max": 1}})
    Message.objects.create(session=s, seq=1, role="user", content={"text": "سلام"})
    ItemMemory.objects.create(user_id=sid, product_id="p1", state="bought")
    login(client, sent, agent_session_id=str(sid))
    post(client, "/api/trips", {"product_id": "p1"})
    ItemMemory.objects.create(user_id=sid, product_id="p1", state="seen")  # agent wrote after login
    post(client, "/api/reports", {"shop_id": "s1", "kind": "closed"})
    uid = AppUser.objects.get().id

    assert client.delete("/api/me").status_code == 204
    assert not Trip.objects.filter(user_id=uid).exists() and not Trip.objects.exists()
    assert not ItemMemory.objects.exists()
    assert not AppUser.objects.exists() and not NeedsProfile.objects.exists()
    s.refresh_from_db()
    assert s.user_id is None and "profile" not in s.context
    assert Message.objects.filter(session=s).count() == 1  # kept, anonymised
    assert ShopReport.objects.get().user_id is None
    assert client.get("/api/me").status_code == 401


def test_logout(client, sent, db):
    login(client, sent)
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/me").status_code == 401


def test_anonymise_sessions_after_90_days(db):
    uid = uuid4()
    old = Session.objects.create(model="m", user_id=uid)
    Session.objects.filter(id=old.id).update(started_at=timezone.now() - timedelta(days=91))
    new = Session.objects.create(model="m", user_id=uid)
    call_command("anonymise_sessions")
    old.refresh_from_db()
    new.refresh_from_db()
    assert old.user_id is None and new.user_id == uid


def test_login_sets_a_signed_user_cookie_for_the_agent(client, sent, db):
    r = login(client, sent)
    u = AppUser.objects.get()
    c = r.cookies["tg_uid"]
    assert c["httponly"] and c["samesite"] == "Lax" and c.value.startswith(f"{u.id}.")
    uid, exp, sig = c.value.split(".")
    assert c.value == uid_token(u.id, int(exp))
    assert client.post("/api/auth/logout").cookies["tg_uid"]["max-age"] == 0


def test_delete_covers_agent_sessions_started_after_login(client, sent, pair):  # noqa: F811
    login(client, sent)
    u = AppUser.objects.get()
    later = Session.objects.create(model="m", user_id=u.id)  # the agent linked it via tg_uid
    ItemMemory.objects.create(user_id=later.id, product_id="p1", state="liked")
    assert [m["state"] for m in client.get("/api/me").json()["memory"]] == ["liked"]
    r = client.delete("/api/me")
    assert r.status_code == 204 and r.cookies["tg_uid"]["max-age"] == 0
    assert not ItemMemory.objects.exists()
    assert not Session.objects.filter(user_id=u.id).exists()
