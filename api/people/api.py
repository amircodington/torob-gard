from typing import Annotated
from uuid import UUID

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from conversation.models import ItemMemory, Session
from torobgard.persian import to_ascii_digits
from trips.models import Trip

from . import otp
from .models import AppUser, NeedsProfile

router = Router()
Tags = Annotated[list[Annotated[str, Field(max_length=40)]], Field(max_length=20)]


class PhoneIn(Schema):
    phone: str = Field(max_length=32)


class VerifyIn(PhoneIn):
    code: str = Field(max_length=16)
    agent_session_id: UUID | None = None  # the journey's agent session, merged into the account


class ProfileIn(Schema):
    budget_min: int | None = Field(None, ge=0, lt=10**12)
    budget_max: int | None = Field(None, ge=0, lt=10**12)
    preferred_brands: Tags | None = None
    avoided_brands: Tags | None = None
    style_tags: Tags | None = None
    notes: str | None = Field(None, max_length=2000)


def current_user(request) -> AppUser | None:
    uid = request.session.get("uid")
    return AppUser.objects.filter(id=uid).first() if uid else None


def _me(request) -> AppUser:
    u = current_user(request)
    if not u:
        raise HttpError(401, "login required")
    return u


def _client(request) -> str:
    first = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return first or request.META.get("REMOTE_ADDR", "anon")


def _phone(raw: str) -> str:
    p = otp.normalize(raw)
    if not p:
        raise HttpError(422, "شماره‌ی موبایل درست نیست")
    return p


def _memory_keys(u: AppUser) -> list:
    """The agent remembers under its session id (R4): the user's rows plus their sessions'."""
    return [u.id, *Session.objects.filter(user_id=u.id).values_list("id", flat=True)]


def _profile(u: AppUser) -> dict:
    p = NeedsProfile.objects.filter(user=u).first() or NeedsProfile(user=u)
    return {k: getattr(p, k) for k in ("budget_min", "budget_max", "preferred_brands",
                                       "avoided_brands", "style_tags", "notes")}


def _payload(u: AppUser) -> dict:
    from trips.api import _out

    trips = Trip.objects.filter(user_id=u.id).select_related("product", "chosen_shop__venue")
    mem = (ItemMemory.objects.filter(user_id__in=_memory_keys(u))
           .select_related("product", "shop").order_by("-created_at")[:200])
    return {
        "display_name": u.display_name,
        "phone_masked": otp.mask(otp.decrypt(bytes(u.phone_enc))) if u.phone_enc else None,
        "trips": [_out(t) for t in trips.order_by("-created_at")],
        "memory": [{
            "id": str(m.id), "state": m.state, "product_id": m.product_id,
            "product_title": m.product.persian_title if m.product else None,
            "image_url": m.product.image_urls[0] if m.product and m.product.image_urls else None,
            "shop_id": m.shop_id, "shop_name": m.shop.name if m.shop else None,
            "price_seen": m.price_seen, "note": m.note, "created_at": m.created_at,
        } for m in mem],
        "profile": _profile(u),
    }


def _merge(u: AppUser, guest_key: str | None, agent_session: UUID | None) -> None:
    """The guest's trips (session key) and agent session (memory, profile) join the account."""
    if guest_key:
        Trip.objects.filter(owner_key=guest_key, user_id=None).update(user_id=u.id)
    # ponytail: claims any unowned agent session by its (unguessable uuid4) id; sessions started
    # after login stay unlinked until the agent learns the user id (agent auth, later)
    s = Session.objects.filter(id=agent_session, user_id=None).first() if agent_session else None
    if not s:
        return
    Session.objects.filter(id=s.id).update(user_id=u.id)
    ItemMemory.objects.filter(user_id=s.id).update(user_id=u.id)
    learned = s.context.get("profile", {})
    NeedsProfile.objects.get_or_create(user=u, defaults={
        "budget_min": learned.get("budget_min"), "budget_max": learned.get("budget_max")})


@router.post("/auth/otp/request")
def otp_request(request, body: PhoneIn):
    try:
        ok = otp.issue(_phone(body.phone), _client(request))
    except otp.SendError:
        raise HttpError(503, "پیامک فعلاً فرستاده نمی‌شه؛ چند دقیقه‌ی دیگه دوباره امتحان کن") from None
    if not ok:
        raise HttpError(429, "too many codes, wait a while")
    return HttpResponse(status=204)


@router.post("/auth/otp/verify")
def otp_verify(request, body: VerifyIn) -> dict:
    phone = _phone(body.phone)
    code = to_ascii_digits(body.code).strip()
    if not code.isdigit() or len(code) != 5:
        raise HttpError(422, "کد ۵ رقمیه")
    result = otp.check(phone, code)
    if result == "locked":
        raise HttpError(429, "locked for 15 minutes")
    if result == "bad":
        raise HttpError(400, "wrong code")
    with transaction.atomic():
        u = AppUser.objects.filter(phone_hash=otp.phone_hash(phone)).first()
        if u:
            u.last_seen_at = timezone.now()
            u.save(update_fields=["last_seen_at"])
        else:
            u = AppUser.objects.create(phone_hash=otp.phone_hash(phone),
                                       phone_enc=otp.encrypt(phone))
        guest_key = request.session.session_key
        _merge(u, guest_key, body.agent_session_id)
    request.session.cycle_key()  # a new session key at login (session fixation)
    request.session["uid"] = str(u.id)
    return _payload(u)


@router.post("/auth/logout")
def logout(request):
    request.session.flush()
    return HttpResponse(status=204)


@router.get("/me")
def me(request) -> dict:
    return _payload(_me(request))


@router.patch("/me/profile")
def patch_profile(request, body: ProfileIn) -> dict:
    u = _me(request)
    p, _ = NeedsProfile.objects.get_or_create(user=u)
    for k, v in body.dict(exclude_unset=True).items():
        if v is None and not k.startswith("budget"):  # clearing a list or the notes
            v = "" if k == "notes" else []
        setattr(p, k, v)
    p.save()
    return _profile(u)


@router.delete("/me")
def delete_me(request):
    """«حذف داده‌هام»: the account, its trips and memory go; its messages stay, anonymised."""
    from catalog.models import ShopReport

    u = _me(request)
    with transaction.atomic():
        keys = _memory_keys(u)
        Trip.objects.filter(user_id=u.id).delete()
        ItemMemory.objects.filter(user_id__in=keys).delete()
        for s in Session.objects.filter(user_id=u.id):
            s.user_id = None
            s.context.pop("profile", None)
            s.save(update_fields=["user_id", "context"])
        ShopReport.objects.filter(user_id=u.id).update(user_id=None)
        u.delete()  # NeedsProfile cascades
    request.session.flush()
    return HttpResponse(status=204)
