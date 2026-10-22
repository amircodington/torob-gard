from ninja import NinjaAPI

api = NinjaAPI(title="ترب‌گرد API")


@api.get("/health")
def health(request) -> dict:
    return {"ok": True}
