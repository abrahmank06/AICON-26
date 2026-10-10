# pyrefly: ignore [missing-import]
"""View-shaped endpoints matching the frontend's YieldApi contract (src/types.ts).

Every response is composed from real AMIS history in ``yield_features_final.csv``
plus the per-series SARIMAX models. The rules that shape the views (risk
thresholds, spike alerts, cooldowns, contagion/spillover maths, the performance
window, the rounding) mirror the frontend's mock model so live and demo data
behave identically — the mock stays available as the offline fallback.
"""

from __future__ import annotations

import math
from datetime import date as date_cls
from functools import lru_cache

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

import predictor
from models import (
    AlertResponse,
    AnalyticsResponse,
    ContagionEdge,
    ForecastPoint,
    ForecastResponse,
    PerformanceResponse,
    PricePoint,
    ShapFeature,
    SnapshotResponse,
    SpikeAlert,
    Spillover,
    TimeMachineResponse,
)

router = APIRouter()

# Mirrored from frontend/src/services/mock/model.ts
HORIZON = 7
HISTORY_DAYS = 30
SPIKE_THRESHOLD = 0.1
ALERT_COOLDOWN = 14
TONNES_PER_ALERT = 10
PERF_WINDOW_START = date_cls(2023, 1, 1)
PERF_WINDOW_END = date_cls(2024, 12, 24)

# Mirrored from frontend/src/lib/risk.ts
# Layer 1, the stress regime gates (~80th percentile of the AMIS feature set).
VOLATILITY_30D_STRESS = 0.148
PANIC_STRESS = 1
# Layers 2 and 3: day-7 forecast change that confirms and tiers the alert.
TIER_WATCH = 0.05
TIER_WARNING = 0.1
TIER_CRITICAL = 0.15
ALERT_TIERS = ("warning", "critical")

# Order as declared in frontend/src/types.ts — matrix rows follow this order.
MARKETS = ["Lahore", "Multan", "Gujranwala", "Rawalpindi"]
CROPS = ["Onion", "Tomato", "Potato Fresh", "Green Chilli"]

CROP_PLURALS = {
    "Onion": "onions",
    "Tomato": "tomatoes",
    "Potato Fresh": "fresh potatoes",
    "Green Chilli": "green chillies",
}

# Stand-in weights for the drivers panel, mirrored from mock/model.ts.
SHAP_SPEC = [
    ("volatility_7d", "Swings this week", 0.049, 2.2),
    ("volatility_30d", "Swings this month", 0.127, 3.5),
    ("panic_index_7d", "Rising streak", 0.0, 0.28),
    ("roc_7d", "Change over 7 days", -0.014, 0.6),
    ("price_vs_mean_30d", "Price vs 30-day average", 0.0, -0.45),
]

MINUS_SIGN = chr(0x2212)  # '−', as used by the frontend's formatSignedPct


# ---------------------------------------------------------------- helpers


def _round0(x: float) -> int:
    """JS ``Math.round`` parity (half away from zero)."""
    if pd.isna(x):
        return 0
    return int(math.floor(x + 0.5))


def _display_price(x: float) -> int:
    """Rounded, non-negative — the frontend never renders a negative PKR."""
    return max(_round0(x), 0)


def _opt(value, digits: int) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


def _signed_pct(fraction: float, digits: int = 0) -> str:
    """Mirrors frontend ``formatSignedPct`` (U+2212 minus, sign from rounded value)."""
    v = float(f"{fraction * 100:.{digits}f}")
    sign = "+" if v > 0 else (MINUS_SIGN if v < 0 else "")
    return f"{sign}{abs(v):.{digits}f}%"


def _resolve_filters(date: str, market: str, crop: str) -> tuple[date_cls, str, str]:
    try:
        day = date_cls.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date {date!r}; expected YYYY-MM-DD.")
    try:
        return day, predictor.resolve_market(market), predictor.resolve_crop(crop)
    except predictor.PredictorError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _predictor_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except predictor.DateOutOfRangeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except predictor.PredictorError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------- series


class SeriesView:
    """One (crop, market) history series with the mock's rounding applied.

    ``build-mock-data.mjs`` rounds prices to integers and features to 4/3/4
    decimals in the demo JSON; every view calculation here uses the same
    rounded values so live numbers match the demo's methodology exactly.
    """

    def __init__(self, crop: str, market: str, df: pd.DataFrame):
        self.crop_slug = crop
        self.market_slug = market
        self.crop = predictor.CROP_DISPLAY[crop]
        self.market = predictor.MARKET_DISPLAY[market]
        self.dates = [d.date() for d in df["date"]]
        self.start = self.dates[0]
        self.end = self.dates[-1]
        self.n = len(df)
        self.prices = [_round0(p) for p in df["price"]]
        self.imputed = [bool(v) for v in df["is_imputed_date"]]
        self.v7 = [_opt(v, 4) for v in df["volatility_7d"]]
        self.v30 = [_opt(v, 4) for v in df["volatility_30d"]]
        self.panic = [_opt(v, 3) for v in df["panic_index_7d"]]
        self.roc = [_opt(v, 4) for v in df["roc_7d"]]

    def index_of(self, day: date_cls) -> int:
        """Clamped day-offset — series are gap-free daily (mock ``indexOf``)."""
        return max(0, min((day - self.start).days, self.n - 1))

    def point_at(self, i: int) -> PricePoint:
        return PricePoint(date=self.dates[i], price=self.prices[i], isImputed=self.imputed[i])

    def points(self, lo: int, hi: int) -> list[PricePoint]:
        return [self.point_at(i) for i in range(max(0, lo), min(hi, self.n - 1) + 1)]

    def price_vs_mean30(self, i: int) -> float:
        window = self.prices[max(0, i - 29) : i + 1]
        return self.prices[i] / (sum(window) / len(window)) - 1

    def outcome_after(self, i: int) -> dict:
        """Largest rise over the next HORIZON days and when the 10% line was crossed."""
        p0 = self.prices[i]
        max_change, peak_offset, first_cross = -math.inf, 0, None
        for k in range(1, HORIZON + 1):
            if i + k >= self.n:
                break
            change = self.prices[i + k] / p0 - 1
            if change > max_change:
                max_change, peak_offset = change, k
            if first_cross is None and change >= SPIKE_THRESHOLD:
                first_cross = k
        if max_change == -math.inf:  # horizon runs past the series end
            max_change = 0.0
        return {
            "maxChange": max_change,
            "peakOffset": peak_offset,
            "firstCross": first_cross,
            "peakPrice": p0 * (1 + max_change),
        }


@lru_cache(maxsize=None)
def load_view(crop: str, market: str) -> SeriesView:
    crop = predictor.resolve_crop(crop)
    market = predictor.resolve_market(market)
    try:
        df = predictor.load_history()[(crop, market)]
    except KeyError:
        raise HTTPException(status_code=500, detail=f"No history rows for {crop}/{market}.")
    return SeriesView(crop, market, df)


def is_stressed(volatility30d: float | None, panic_index: float | None) -> bool:
    vol = volatility30d if volatility30d is not None else 0
    panic = panic_index if panic_index is not None else 0
    return vol >= VOLATILITY_30D_STRESS and panic >= PANIC_STRESS


def risk_level(volatility30d: float | None, panic_index: float | None, predicted_change: float | None) -> str:
    """Three-layer verdict: stress regime gate, then the day-7 forecast change sets the tier."""
    if predicted_change is None or not is_stressed(volatility30d, panic_index):
        return "stable"
    if predicted_change >= TIER_CRITICAL:
        return "critical"
    if predicted_change >= TIER_WARNING:
        return "warning"
    if predicted_change >= TIER_WATCH:
        return "watch"
    return "stable"


def forecast_points(view: SeriesView, origin: date_cls) -> list[ForecastPoint]:
    raw = _predictor_call(
        predictor.forecast_window, view.crop_slug, view.market_slug, origin, HORIZON
    )
    return [
        ForecastPoint(
            date=r["date"],
            predicted=_display_price(r["predicted"]),
            lower=_display_price(r["lower"]),
            upper=_display_price(r["upper"]),
        )
        for r in raw
    ]


def assess(view: SeriesView, i: int, forecast: list[ForecastPoint]) -> tuple[str, SpikeAlert | None]:
    """Risk tier for day ``i`` and the spike alert it fires (WARNING/CRITICAL only)."""
    day7 = forecast[-1]
    change = day7.predicted / view.prices[i] - 1
    risk = risk_level(view.v30[i], view.panic[i], change)
    if risk not in ALERT_TIERS:
        return risk, None
    return risk, SpikeAlert(expectedChangePct=change, peakDate=day7.date, severity=risk)


def spike_alert(view: SeriesView, i: int, forecast: list[ForecastPoint]) -> SpikeAlert | None:
    return assess(view, i, forecast)[1]


# ---------------------------------------------------------------- endpoints


@router.get("/snapshot", response_model=SnapshotResponse)
def get_snapshot(date: str = Query(...), market: str = Query(...), crop: str = Query(...)):
    """Today's reading: price, volatility, panic, stamped risk verdict."""
    day, market_slug, crop_slug = _resolve_filters(date, market, crop)
    view = load_view(crop_slug, market_slug)
    i = view.index_of(day)
    row_date = view.dates[i]

    train_start, _, _, _ = predictor.training_window(view.crop_slug, view.market_slug)
    risk, alert = "stable", None
    if row_date >= train_start:  # dates before the window still get the CSV row
        risk, alert = assess(view, i, forecast_points(view, row_date))

    v7, v30, panic = view.v7[i], view.v30[i], view.panic[i]
    return SnapshotResponse(
        date=row_date,
        market=view.market,
        crop=view.crop,
        price=view.prices[i],
        isImputed=view.imputed[i],
        change7dPct=(view.prices[i] / view.prices[i - 7] - 1) if i >= 7 else None,
        volatility7d=v7,
        volatility30d=v30,
        panicIndex7d=panic,
        risk=risk,
        spikeAlert=alert,
    )


@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(date: str = Query(...), market: str = Query(...), crop: str = Query(...)):
    """30-day history plus a 7-day SARIMAX forecast with 95% intervals."""
    day, market_slug, crop_slug = _resolve_filters(date, market, crop)
    view = load_view(crop_slug, market_slug)
    i = view.index_of(day)

    forecast = forecast_points(view, view.dates[i])  # 400 if before training window
    as_of = view.end if view.end.isoformat() < day.isoformat() else day
    return ForecastResponse(
        asOf=as_of,
        history=view.points(i - HISTORY_DAYS + 1, i),
        forecast=forecast,
        spikeAlert=spike_alert(view, i, forecast),
    )


@router.get("/time-machine", response_model=TimeMachineResponse)
def travel(date: str = Query(...), market: str = Query(...), crop: str = Query(...)):
    """Replay a past date: model forecast vs what actually happened."""
    day, market_slug, crop_slug = _resolve_filters(date, market, crop)
    view = load_view(crop_slug, market_slug)
    i = view.index_of(day)
    origin = view.dates[i]

    forecast = forecast_points(view, origin)  # 400 if before training window
    alert = spike_alert(view, i, forecast)
    outcome = view.outcome_after(i)
    spiked = outcome["maxChange"] >= SPIKE_THRESHOLD
    if alert:
        verdict = "correct_alert" if spiked else "false_alarm"
    else:
        verdict = "missed" if spiked else "correct_calm"

    actual = view.points(i + 1, i + HORIZON)
    errors = [abs(forecast[k].predicted - a.price) / a.price for k, a in enumerate(actual)]
    mape = (sum(errors) / len(errors) * 100) if errors else 0.0

    return TimeMachineResponse(
        asOf=origin,
        history=view.points(i - HISTORY_DAYS + 1, i),
        forecast=forecast,
        spikeAlert=alert,
        actual=actual,
        actualChangePct=outcome["maxChange"],
        mapePct=mape,
        verdict=verdict,
        analogue=analogue(view, i),
    )


@router.get("/alerts", response_model=list[AlertResponse])
def get_alerts():
    """Every spike alert the models fired across all 16 series, newest first."""
    return list(_all_alerts())


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(date: str = Query(...), market: str = Query(...), crop: str = Query(...)):
    """Cross-market contagion, cross-crop spillover, ranked price drivers."""
    day, market_slug, crop_slug = _resolve_filters(date, market, crop)
    selected = load_view(crop_slug, market_slug)
    by_market = [load_view(crop_slug, predictor.resolve_market(m)) for m in MARKETS]
    by_crop = [load_view(predictor.resolve_crop(c), market_slug) for c in CROPS]
    return AnalyticsResponse(
        contagion=contagion_for(by_market, day),
        spillover=spillover_for(by_crop, day),
        shap=shap_features(selected, selected.index_of(day)),
    )


@router.get("/performance", response_model=PerformanceResponse)
def get_performance():
    """Backtest over the evaluation window: forecast accuracy + alert quality."""
    return _performance()


# ---------------------------------------------------------------- alert scan


def _scan_alerts(view: SeriesView, from_i: int, to_i: int) -> list[AlertResponse]:
    """Model-backed port of mock ``scanAlerts``: one cached batch of one-step
    in-sample predictions per series, sliced per date (never per-date calls)."""
    _, _, start_idx, end_idx = predictor.training_window(view.crop_slug, view.market_slug)
    # Only scan dates whose whole 7-day horizon sits inside the training window.
    scan_lo = max(from_i, start_idx - 1)
    scan_hi = min(to_i, end_idx - 1 - HORIZON)
    if scan_hi < scan_lo:
        return []

    points, _, _ = _predictor_call(
        predictor.batch_in_sample, view.crop_slug, view.market_slug
    )
    alerts: list[AlertResponse] = []
    last_fired: int | None = None
    for i in range(scan_lo, scan_hi + 1):
        if last_fired is not None and i - last_fired < ALERT_COOLDOWN:
            continue
        day7 = _display_price(points[i + HORIZON - start_idx])
        change = day7 / view.prices[i] - 1
        if risk_level(view.v30[i], view.panic[i], change) not in ALERT_TIERS:
            continue
        last_fired = i
        outcome = view.outcome_after(i)
        correct = outcome["maxChange"] >= SPIKE_THRESHOLD
        alerts.append(
            AlertResponse(
                id=f"{view.market}-{view.crop}-{i}",
                dateFired=view.dates[i],
                market=view.market,
                crop=view.crop,
                predictedSpikePct=change,
                actualSpikePct=outcome["maxChange"],
                leadTimeDays=(
                    (outcome["firstCross"] if outcome["firstCross"] is not None else outcome["peakOffset"])
                    if correct
                    else None
                ),
                verdict="correct" if correct else "false_alarm",
            )
        )
    return alerts


@lru_cache(maxsize=1)
def _all_alerts() -> tuple[AlertResponse, ...]:
    out: list[AlertResponse] = []
    for market_name in MARKETS:
        for crop_name in CROPS:
            view = load_view(crop_name, market_name)
            out.extend(_scan_alerts(view, HISTORY_DAYS, view.n - 1 - HORIZON))
    # Newest first; stable among same-day ties (mirrors the mock's flatMap order).
    out.sort(key=lambda a: -a.dateFired.toordinal())
    return tuple(out)


# ---------------------------------------------------------------- analogue copy


def analogue(view: SeriesView, i: int) -> str:
    """Historical look-alike day, phrased exactly like the mock's copy."""
    v7 = view.v7[i] or 0
    panic = view.panic[i] or 0
    roc = view.roc[i] or 0
    pvm = view.price_vs_mean30(i)
    place = f"{view.market} {CROP_PLURALS.get(view.crop, view.crop.lower())}"

    candidates: list[tuple[float, int]] = []
    for j in range(30, i - HORIZON - 30):
        vj, pj, rj = view.v7[j], view.panic[j], view.roc[j]
        if vj is None or pj is None or rj is None:
            continue
        d = (
            ((vj - v7) / 0.08) ** 2
            + ((pj - panic) / 0.8) ** 2
            + ((rj - roc) / 0.2) ** 2
            + ((view.price_vs_mean30(j) - pvm) / 0.2) ** 2
        )
        candidates.append((d, j))

    if not candidates:
        return f"There is not enough earlier history for {place} to find a similar moment."

    candidates.sort(key=lambda c: c[0])
    picked: list[int] = []
    for _, j in candidates:
        if all(abs(j - p) > 30 for p in picked):
            picked.append(j)
        if len(picked) == 5:
            break
    j = max(picked)
    when = view.dates[j].strftime("%B %Y")
    outcome = view.outcome_after(j)
    week = view.prices[min(j + HORIZON, view.n - 1)] / view.prices[j] - 1

    if outcome["maxChange"] >= SPIKE_THRESHOLD:
        peak_offset = outcome["peakOffset"]
        days = "" if peak_offset == 1 else "s"
        return (
            f"The last time {place} looked like this was {when}. "
            f"Prices jumped {_signed_pct(outcome['maxChange'])} within {peak_offset} day{days}."
        )
    if week <= -0.05:
        fell = _signed_pct(week).replace(MINUS_SIGN, "")
        return f"The last time {place} looked like this was {when}. Prices fell {fell} over the next week."
    if week >= 0.05:
        rose = _signed_pct(week).replace("+", "")
        return (
            f"The last time {place} looked like this was {when}. "
            f"Prices rose {rose} over the next week, short of a spike."
        )
    return (
        f"The last time {place} looked like this was {when}. "
        f"Prices held steady over the next week ({_signed_pct(week)})."
    )


# ---------------------------------------------------------------- analytics maths


def _log_returns(view: SeriesView, from_i: int, to_i: int, step: int = 1) -> list[float]:
    return [
        math.log(view.prices[i] / view.prices[i - step])
        for i in range(from_i + step, to_i + 1, step)
    ]


def _corr(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n < 3:
        return 0.0
    a, b = a[:n], b[:n]
    ma, mb = sum(a) / n, sum(b) / n
    num = da = db = 0.0
    for k in range(n):
        x, y = a[k] - ma, b[k] - mb
        num += x * y
        da += x * x
        db += y * y
    return num / math.sqrt(da * db) if da and db else 0.0


def contagion_for(views: list[SeriesView], as_of: date_cls, lookback_days: int = 540) -> list[ContagionEdge]:
    """Lead-lag between markets for one crop: corr(A's returns today, B's `lag` days later)."""
    returns = []
    for v in views:
        to = v.index_of(as_of)
        returns.append(_log_returns(v, max(0, to - lookback_days), to))

    def best(a: int, b: int) -> tuple[int, float]:
        top = (1, -math.inf)
        for lag in range(1, 6):
            c = _corr(returns[a][:-lag], returns[b][lag:])
            if c > top[1]:
                top = (lag, c)
        return top

    edges: list[ContagionEdge] = []
    for a in range(len(views)):
        for b in range(a + 1, len(views)):
            ab, ba = best(a, b), best(b, a)
            src, dst, link = (a, b, ab) if ab[1] >= ba[1] else (b, a, ba)
            if link[1] > 0.02:
                edges.append(
                    ContagionEdge(origin=views[src].market, to=views[dst].market, lagDays=link[0], strength=link[1])
                )
    edges.sort(key=lambda e: -e.strength)
    return edges


def spillover_for(views: list[SeriesView], as_of: date_cls, lookback_days: int = 730) -> Spillover:
    """Weekly-return correlation between crops in one market."""
    returns = []
    for v in views:
        to = v.index_of(as_of)
        returns.append(_log_returns(v, max(0, to - lookback_days), to, 7))
    return Spillover(
        crops=[v.crop for v in views],
        matrix=[[float(f"{_corr(a, b):.2f}") for b in returns] for a in returns],
    )


def shap_features(view: SeriesView, i: int) -> list[ShapFeature]:
    """Signed contribution of each CSV feature to the spike score (stand-in for SHAP)."""
    v7, v30, panic, roc = view.v7[i], view.v30[i], view.panic[i], view.roc[i]
    values = {
        "volatility_7d": v7 if v7 is not None else 0.049,
        "volatility_30d": v30 if v30 is not None else 0.127,
        "panic_index_7d": panic if panic is not None else 0.0,
        "roc_7d": roc if roc is not None else 0.0,
        "price_vs_mean_30d": view.price_vs_mean30(i),
    }
    out = [
        ShapFeature(
            feature=feature,
            label=label,
            contribution=float(f"{(values[feature] - median) * weight:.3f}"),
        )
        for feature, label, median, weight in SHAP_SPEC
    ]
    out.sort(key=lambda s: -abs(s.contribution))
    return out


# ---------------------------------------------------------------- performance


@lru_cache(maxsize=1)
def _performance() -> PerformanceResponse:
    """Port of mock ``performanceOf`` over the evaluation window, with SARIMAX
    one-step predictions replacing the placeholder forecast heuristic."""
    abs_pct = abs_err = sq = n = 0.0
    alerts_total = correct = 0
    lead_sum = savings = 0.0
    events = caught = caught_early = 0

    for market_name in MARKETS:
        for crop_name in CROPS:
            view = load_view(crop_name, market_name)
            _, _, start_idx, end_idx = predictor.training_window(view.crop_slug, view.market_slug)
            from_i = view.index_of(PERF_WINDOW_START)
            to_i = min(view.index_of(PERF_WINDOW_END), view.n - 1 - HORIZON)

            points, _, _ = _predictor_call(
                predictor.batch_in_sample, view.crop_slug, view.market_slug
            )

            # Accuracy: a 7-day forecast every week across the window.
            for i in range(from_i, to_i + 1, 7):
                if i + 1 < start_idx or i + HORIZON > end_idx - 1:
                    continue
                for k in range(1, HORIZON + 1):
                    actual = view.prices[i + k]
                    p = _display_price(points[i + k - start_idx])
                    abs_pct += abs(p - actual) / actual
                    abs_err += abs(p - actual)
                    sq += (p - actual) ** 2
                    n += 1

            # Alert quality.
            alerts = _scan_alerts(view, from_i, to_i)
            fired_at = {view.index_of(a.dateFired) for a in alerts}
            alerts_total += len(alerts)
            for a in alerts:
                if a.verdict != "correct":
                    continue
                correct += 1
                lead_sum += a.leadTimeDays or 0
                i = view.index_of(a.dateFired)
                savings += (view.outcome_after(i)["peakPrice"] - view.prices[i]) * 10 * TONNES_PER_ALERT

            # Recall/coverage: spike events and whether an alert warned of them.
            last_event: int | None = None
            for i in range(from_i, to_i + 1):
                outcome = view.outcome_after(i)
                if outcome["maxChange"] < SPIKE_THRESHOLD:
                    continue
                if last_event is not None and i - last_event < ALERT_COOLDOWN:
                    continue
                last_event = i
                events += 1
                warned_at = next((back for back in (0, 1, 2, 3) if i - back in fired_at), None)
                if warned_at is not None:
                    caught += 1
                    if warned_at + (outcome["firstCross"] or 0) >= 2:
                        caught_early += 1

    precision = correct / alerts_total if alerts_total else 0.0
    return PerformanceResponse(
        mapePct=(abs_pct / n) * 100 if n else 0.0,
        rmse=math.sqrt(sq / n) if n else 0.0,
        mae=abs_err / n if n else 0.0,
        precisionPct=precision * 100,
        recallPct=(caught / events) * 100 if events else 0.0,
        falseAlarmRatePct=(1 - precision) * 100 if alerts_total else 0.0,
        avgLeadTimeDays=(lead_sum / correct) if correct else 0.0,
        costSavingsPkr=savings,
        alertCoveragePct=(caught_early / events) * 100 if events else 0.0,
        alertsEvaluated=alerts_total,
        windowStart=PERF_WINDOW_START.isoformat(),
        windowEnd=PERF_WINDOW_END.isoformat(),
    )
