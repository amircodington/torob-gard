from collections import defaultdict
from datetime import timedelta
from statistics import quantiles

from django.contrib import admin
from django.db.models import Count, Q
from django.shortcuts import render
from django.utils import timezone

from conversation.models import Message

from .models import EvalResult, EvalRun

DAYS = 30
# ponytail: copy of the agent's FALLBACK prefix (agent orchestrator.py);
# move to /shared if it changes
FALLBACK = "نتونستم تأیید کنم"


def bars(points, fmt="{:g}"):
    """Inline SVG bar chart from [(label, value)]; one hue, values in <title> tooltips."""
    if not points:
        return ""
    top, w, h = max(v for _, v in points) or 1, 12, 120
    step = w + 4
    rects = "".join(
        f'<rect x="{i * step}" y="{h - v / top * h:.1f}" width="{w}" '
        f'height="{v / top * h:.1f}" rx="3" '
        f'fill="currentColor"><title>{lbl}: {fmt.format(v)}</title></rect>'
        for i, (lbl, v) in enumerate(points))
    return (f'<svg viewBox="0 0 {len(points) * step} {h}" role="img" '
            f'class="w-full h-32 text-orange-600" preserveAspectRatio="none">{rects}</svg>')


def p95(xs):
    return quantiles(xs, n=20, method="inclusive")[-1] if len(xs) > 1 else xs[0]


def metrics():
    since = timezone.now() - timedelta(days=DAYS)
    msgs = Message.objects.filter(role="assistant", created_at__gte=since).exclude(
        session__context__has_key="eval")  # eval conversations are charted on their own
    lat, total, bad = defaultdict(list), defaultdict(int), defaultdict(int)
    live, per_session = defaultdict(float), defaultdict(lambda: defaultdict(float))
    for m in msgs.only("created_at", "latency_ms", "content", "cost", "session_id"):
        d = timezone.localtime(m.created_at).date().isoformat()
        total[d] += 1
        # a failure is a turn that ended in the fallback; one the retry fixed is not
        bad[d] += m.content.get("say", "").startswith(FALLBACK)
        if m.latency_ms is not None:
            lat[d].append(m.latency_ms)
        live[d] += float(m.cost or 0)
        per_session[d][m.session_id] += float(m.cost or 0)
    # ponytail: judge spend is only in the run's printed summary, so this eval series omits it
    cost = defaultdict(float)
    for r in EvalResult.objects.filter(run__started_at__gte=since).select_related("run"):
        day = timezone.localtime(r.run.started_at).date().isoformat()
        cost[day] += r.transcript.get("cost", 0)
    done = EvalRun.objects.annotate(
        n=Count("results"), passed=Count("results", filter=Q(results__passed=True)))
    runs = [(timezone.localtime(r.started_at).strftime("%m-%d %H:%M"), r.passed * 100 / r.n)
            for r in done.filter(n__gt=0).order_by("-started_at")[:20][::-1]]
    daily = lambda d, f: sorted((k, f(v)) for k, v in d.items())  # noqa: E731
    cards = [
        ("هزینهٔ روزانه (دلار)", daily(live, float), "{:.4f}"),
        ("میانگین هزینه هر گفتگو (دلار)",
         [(d, sum(s.values()) / len(s)) for d, s in sorted(per_session.items())], "{:.4f}"),
        ("هزینهٔ روزانهٔ ارزیابی‌ها (دلار، بدون داور)", daily(cost, float), "{:.4f}"),
        ("تأخیر p95 (میلی‌ثانیه)", daily(lat, p95), "{:.0f}"),
        ("نرخ شکست گراندینگ (٪)", sorted((k, bad[k] * 100 / total[k]) for k in total), "{:.1f}"),
        ("نرخ قبولی ارزیابی در هر اجرا (٪)", runs, "{:.0f}"),
    ]
    return [{"title": t, "svg": bars(p, f), "rows": p} for t, p, f in cards]


def quality_page(request):
    return render(request, "quality/page.html", {**admin.site.each_context(request),
                                                 "title": "کیفیت", "charts": metrics()})
