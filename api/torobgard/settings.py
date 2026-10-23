import base64
import os
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

# ponytail: dev-only default key; set DJANGO_SECRET_KEY before any real deploy
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key")
DEBUG = os.environ.get("DEBUG", "1") == "1"
# prod: the domain plus "api" (web SSR calls http://api:8000); nginx drops unknown hosts first
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")
# nginx terminates TLS and sets X-Forwarded-Proto, so admin CSRF origin checks see https
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "catalog",
    "ingest",
    "trips",
    "conversation",
    "people",
    "quality",
]

MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "torobgard.urls"
WSGI_APPLICATION = "torobgard.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

_db = urlparse(os.environ.get("DATABASE_URL", "postgresql://torobgard:torobgard@db:5432/torobgard"))
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": _db.path.lstrip("/"),
        "USER": _db.username,
        "PASSWORD": _db.password,
        "HOST": _db.hostname,
        "PORT": _db.port or 5432,
    }
}

LANGUAGE_CODE = "fa"
TIME_ZONE = "Asia/Tehran"
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # collectstatic in prod; nginx serves /static/
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
# Login cookie: httpOnly, SameSite=Lax (no cross-site POST/DELETE carries it), Secure in prod
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
PHONE_PEPPER = os.environ.get("PHONE_PEPPER", "")
PHONE_KEY = os.environ.get("PHONE_KEY", "")  # base64 of 32 bytes
KAVENEGAR_KEY = os.environ.get("KAVENEGAR_KEY", "")
KAVENEGAR_TEMPLATE = os.environ.get("KAVENEGAR_TEMPLATE", "")
if not DEBUG and SECRET_KEY == "dev-only-insecure-key":
    raise RuntimeError("set DJANGO_SECRET_KEY")
if not DEBUG and "*" in ALLOWED_HOSTS:
    raise RuntimeError("set ALLOWED_HOSTS to the domain plus api")
if not DEBUG and not (PHONE_PEPPER and PHONE_KEY):
    raise RuntimeError("set PHONE_PEPPER and PHONE_KEY")
if PHONE_KEY and len(base64.b64decode(PHONE_KEY)) != 32:
    raise RuntimeError("PHONE_KEY must be base64 of 32 bytes")

# people.otp's dev sender prints the code (never the phone) to the console in DEBUG
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"people": {"handlers": ["console"], "level": "INFO", "propagate": False}},
}

UNFOLD = {"SITE_TITLE": "ترب‌گرد", "SITE_HEADER": "ترب‌گرد"}
