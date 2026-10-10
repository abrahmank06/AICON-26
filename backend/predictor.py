# pyrefly: ignore [missing-import]
"""Maps API inputs (crop, market, date) to the correct SARIMAX model file.

Each model file is ``models/sarimax_{crop}_{market}.joblib`` and was trained on the
last 1500 daily rows of its (crop, market) series in ``yield_features_final.csv``:
  - endog: price
  - exog:  price_vs_mean_30d, panic_index_7d

Predictions for dates inside the training window come from in-sample prediction;
dates after the training window are produced by multi-step forecasting, carrying
the last observed exog values forward (overridable per request).
"""

from __future__ import annotations

from datetime import date as date_cls, datetime as datetime_cls, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
HISTORY_CSV = BASE_DIR / "yield_features_final.csv"

TRAINING_ROWS = 1500          # every model was trained on its series' last 1500 rows
MAX_HORIZON_DAYS = 730        # refuse forecasts further than 2 years past training end
CONFIDENCE_LEVEL = 0.95
EXOG_COLUMNS = ["price_vs_mean_30d", "panic_index_7d"]
# Every column the frontend views display, straight from yield_features_final.csv.
FEATURE_COLUMNS = [
    "price",
    "is_imputed_date",
    "volatility_7d",
    "volatility_30d",
    "panic_index_7d",
    "roc_7d",
    "price_vs_mean_30d",
]


class PredictorError(Exception):
    """Base class for prediction errors."""


class UnknownCropError(PredictorError):
    pass


class UnknownMarketError(PredictorError):
    pass


class ModelFileMissingError(PredictorError):
    pass


class HistoryMissingError(PredictorError):
    pass


class DateOutOfRangeError(PredictorError):
    pass


def _normalize(text: str) -> str:
    return " ".join(str(text).strip().lower().replace("_", " ").replace("-", " ").split())


CROP_ALIASES = {
    "green chilli": "green_chilli",
    "green chillies": "green_chilli",
    "chilli": "green_chilli",
    "onion": "onion",
    "potato fresh": "potato_fresh",
    "potato": "potato_fresh",
    "fresh potato": "potato_fresh",
    "tomato": "tomato",
}

MARKET_ALIASES = {
    "lahore": "lahore",
    "gujranwala": "gujranwala",
    "multan": "multan",
    "rawalpindi": "rawalpindi",
    "pindi": "rawalpindi",
}

CROP_DISPLAY = {
    "green_chilli": "Green Chilli",
    "onion": "Onion",
    "potato_fresh": "Potato Fresh",
    "tomato": "Tomato",
}

MARKET_DISPLAY = {
    "lahore": "Lahore",
    "gujranwala": "Gujranwala",
    "multan": "Multan",
    "rawalpindi": "Rawalpindi",
}

CROPS = sorted(CROP_DISPLAY)          # canonical slugs
MARKETS = sorted(MARKET_DISPLAY)


def resolve_crop(raw: str) -> str:
    slug = CROP_ALIASES.get(_normalize(raw))
    if slug is None:
        raise UnknownCropError(
            f"Unknown crop {raw!r}. Available crops: "
            + ", ".join(CROP_DISPLAY[c] for c in CROPS)
        )
    return slug


def resolve_market(raw: str) -> str:
    slug = MARKET_ALIASES.get(_normalize(raw))
    if slug is None:
        raise UnknownMarketError(
            f"Unknown market {raw!r}. Available markets: "
            + ", ".join(MARKET_DISPLAY[m] for m in MARKETS)
        )
    return slug


def model_file_path(crop: str, market: str) -> Path:
    return MODELS_DIR / f"sarimax_{crop}_{market}.joblib"


@lru_cache(maxsize=None)
def load_model(crop: str, market: str):
    path = model_file_path(crop, market)
    if not path.exists():
        raise ModelFileMissingError(f"No model file for {crop}/{market}: {path.name}")
    return joblib.load(path)


@lru_cache(maxsize=None)
def load_history() -> dict:
    """Return {(crop_slug, market_slug): DataFrame[date, *FEATURE_COLUMNS]}.

    ``is_imputed_date`` is normalized to 0/1 ints so views can cast it to bool.
    """
    if not HISTORY_CSV.exists():
        raise HistoryMissingError(f"History CSV not found: {HISTORY_CSV}")
    df = pd.read_csv(HISTORY_CSV)
    df["date"] = pd.to_datetime(df["date"])
    df["is_imputed_date"] = pd.to_numeric(df["is_imputed_date"], errors="coerce").fillna(0).astype(int)
    df = df.sort_values("date").reset_index(drop=True)

    out = {}
    for (crop_name, market_name), group in df.groupby(["crop", "market"]):
        try:
            key = (CROP_ALIASES[_normalize(crop_name)], MARKET_ALIASES[_normalize(market_name)])
        except KeyError:
            continue
        out[key] = group[["date", *FEATURE_COLUMNS]].reset_index(drop=True)
    return out


@lru_cache(maxsize=None)
def training_window(crop: str, market: str) -> tuple[date_cls, date_cls, int, int]:
    """Locate the (start_date, end_date, start_idx, end_idx) slice of the history
    series the model was actually trained on, by matching the model's endog."""
    series = load_history()[(crop, market)]
    endog = np.asarray(load_model(crop, market).model.endog, dtype=float).ravel()
    prices = series["price"].to_numpy(dtype=float)
    k = len(endog)
    n = len(prices)

    if n >= k:
        candidates = np.flatnonzero(np.isclose(prices[: n - k + 1], endog[0]))
        for start in candidates:
            if np.allclose(prices[start : start + k], endog):
                end = start + k
                return (
                    series["date"].iloc[start].date(),
                    series["date"].iloc[end - 1].date(),
                    int(start),
                    int(end),
                )

    # Fallback: assume the standard "last 1500 rows" training scheme.
    start = max(0, n - TRAINING_ROWS)
    return (
        series["date"].iloc[start].date(),
        series["date"].iloc[n - 1].date(),
        int(start),
        n,
    )


@lru_cache(maxsize=None)
def batch_in_sample(crop: str, market: str):
    """One-step-ahead in-sample predictions and 95% CIs for every row of the
    model's training window, from a single ``get_prediction`` call (cached).

    Window-relative arrays: position ``k`` is absolute series index
    ``training_window()[2] + k``. Slicing these is how the view endpoints get
    historical forecasts without re-running the filter per date.
    """
    crop = resolve_crop(crop)
    market = resolve_market(market)
    model = load_model(crop, market)
    _, _, start_idx, end_idx = training_window(crop, market)
    pred = model.get_prediction(start=0, end=end_idx - start_idx - 1)
    point = np.asarray(pred.predicted_mean, dtype=float)
    ci = np.asarray(pred.conf_int(alpha=1 - CONFIDENCE_LEVEL), dtype=float)
    return point, ci[:, 0], ci[:, 1]


def forecast_window(
    crop: str,
    market: str,
    origin: date_cls,
    horizon: int = 7,
) -> list[dict]:
    """Point estimate + 95% CI for ``origin+1 .. origin+horizon``.

    Targets inside the training window come from one-step-ahead in-sample
    prediction (real exog, consistent with :func:`predict`); targets past the
    window are forecast with the last observed exog carried forward.
    ``origin`` is clamped to the series end, mirroring the frontend mock.
    """
    crop = resolve_crop(crop)
    market = resolve_market(market)
    origin = _to_date(origin)
    model = load_model(crop, market)
    series = load_history()[(crop, market)]
    train_start, train_end, start_idx, end_idx = training_window(crop, market)

    if origin < train_start:
        raise DateOutOfRangeError(
            f"Date {origin} is before the model's training window ({train_start} to {train_end})."
        )

    series_end = series["date"].iloc[-1].date()
    origin = min(origin, series_end)
    targets = [origin + timedelta(days=k) for k in range(1, horizon + 1)]
    out: dict[date_cls, tuple[float, float, float]] = {}

    in_sample = [d for d in targets if d <= train_end]
    if in_sample:
        series_start = series["date"].iloc[0].date()
        first_abs = (in_sample[0] - series_start).days
        points, lower, upper = batch_in_sample(crop, market)
        for k, d in enumerate(in_sample):
            rel = (first_abs + k) - start_idx
            out[d] = (float(points[rel]), float(lower[rel]), float(upper[rel]))

    beyond = [d for d in targets if d > train_end]
    if beyond:
        steps = (beyond[-1] - train_end).days
        last_row = series.iloc[end_idx - 1]
        exog_values = []
        for col in EXOG_COLUMNS:
            value = last_row[col]
            exog_values.append(0.0 if pd.isna(value) else float(value))
        fc = model.get_forecast(steps=steps, exog=np.tile(exog_values, (steps, 1)))
        mean = np.asarray(fc.predicted_mean, dtype=float)
        ci = np.asarray(fc.conf_int(alpha=1 - CONFIDENCE_LEVEL), dtype=float)
        m = len(beyond)
        for k, d in enumerate(beyond):
            out[d] = (float(mean[-m + k]), float(ci[-m + k, 0]), float(ci[-m + k, 1]))

    return [
        {"date": d, "predicted": out[d][0], "lower": out[d][1], "upper": out[d][2]}
        for d in targets
    ]


def _to_date(value) -> date_cls:
    if isinstance(value, datetime_cls):
        return value.date()
    return value


def predict(
    crop: str,
    market: str,
    target_date: date_cls,
    price_vs_mean_30d: Optional[float] = None,
    panic_index_7d: Optional[float] = None,
) -> dict:
    """Predict the price for (crop, market) on ``target_date``."""
    crop = resolve_crop(crop)
    market = resolve_market(market)
    target_date = _to_date(target_date)

    model = load_model(crop, market)
    series = load_history()[(crop, market)]
    train_start, train_end, start_idx, end_idx = training_window(crop, market)

    if target_date < train_start:
        raise DateOutOfRangeError(
            f"Date {target_date} is before the model's training window ({train_start} to {train_end})."
        )

    exog_override = {
        "price_vs_mean_30d": price_vs_mean_30d,
        "panic_index_7d": panic_index_7d,
    }

    if target_date <= train_end:
        # In-sample date: use the model's own stored exog at that date.
        window = series.iloc[start_idx:end_idx].reset_index(drop=True)
        pos = int(window.index[window["date"].dt.date == target_date][0])
        pred = model.get_prediction(start=pos, end=pos)
        point = float(np.asarray(pred.predicted_mean)[0])
        ci = np.asarray(pred.conf_int(alpha=1 - CONFIDENCE_LEVEL))[0]
        exog_row = window.iloc[pos]
        exog_used = {c: float(exog_row[c]) for c in EXOG_COLUMNS}
        horizon_days = (target_date - train_end).days
        method = "in_sample"
    else:
        horizon_days = (target_date - train_end).days
        if horizon_days > MAX_HORIZON_DAYS:
            raise DateOutOfRangeError(
                f"Date {target_date} is {horizon_days} days past the training window end "
                f"({train_end}); max supported horizon is {MAX_HORIZON_DAYS} days."
            )
        # Carry the last observed exog forward unless overridden per request.
        last_row = series.iloc[end_idx - 1]
        exog_used = {}
        for col in EXOG_COLUMNS:
            value = exog_override.get(col)
            if value is None:
                value = last_row[col]
                if pd.isna(value):
                    value = 0.0
            exog_used[col] = float(value)
        future_exog = np.tile([exog_used[c] for c in EXOG_COLUMNS], (horizon_days, 1))
        fc = model.get_forecast(steps=horizon_days, exog=future_exog)
        point = float(np.asarray(fc.predicted_mean)[-1])
        ci = np.asarray(fc.conf_int(alpha=1 - CONFIDENCE_LEVEL))[-1]
        method = "forecast"

    return {
        "date": target_date,
        "market": MARKET_DISPLAY[market],
        "crop": CROP_DISPLAY[crop],
        "predicted_price": round(max(point, 0.0), 2),
        "confidence_interval": {
            "lower": round(max(float(ci[0]), 0.0), 2),
            "upper": round(max(float(ci[1]), 0.0), 2),
        },
        "confidence_level": CONFIDENCE_LEVEL,
        "method": method,
        "horizon_days": horizon_days,
        "exog_used": exog_used,
        "model_file": model_file_path(crop, market).name,
    }


@lru_cache(maxsize=None)
def list_models() -> list[dict]:
    """Metadata for every available (crop, market) model."""
    out = []
    for crop in CROPS:
        for market in MARKETS:
            path = model_file_path(crop, market)
            item = {
                "crop": CROP_DISPLAY[crop],
                "market": MARKET_DISPLAY[market],
                "model_file": path.name,
                "training_start": None,
                "training_end": None,
            }
            if path.exists() and (crop, market) in load_history():
                start, end, _, _ = training_window(crop, market)
                item["training_start"] = start
                item["training_end"] = end
            out.append(item)
    return out
