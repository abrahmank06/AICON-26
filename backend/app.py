# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException

from models import (
    ErrorResponse,
    ModelListResponse,
    ModelRequest,
    ModelResponse,
)
import predictor

app = FastAPI(
    name="MAHIR",
    description="Crop price prediction API backed by per-market SARIMAX models.",
)


@app.get("/")
def home():
    return {
        "message": "The app is running",
        "endpoints": {"predict": "POST /predict", "models": "GET /models"},
    }


@app.get("/models", response_model=ModelListResponse, responses={500: {"model": ErrorResponse}})
def list_models():
    try:
        models = predictor.list_models()
    except predictor.PredictorError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {
        "crops": [predictor.CROP_DISPLAY[c] for c in predictor.CROPS],
        "markets": [predictor.MARKET_DISPLAY[m] for m in predictor.MARKETS],
        "confidence_level": predictor.CONFIDENCE_LEVEL,
        "max_horizon_days": predictor.MAX_HORIZON_DAYS,
        "models": models,
    }


@app.post(
    "/predict",
    response_model=ModelResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
def predict(data: ModelRequest):
    try:
        return predictor.predict(
            crop=data.crop,
            market=data.market,
            target_date=data.date,
            price_vs_mean_30d=data.price_vs_mean_30d,
            panic_index_7d=data.panic_index_7d,
        )
    except (predictor.UnknownCropError, predictor.UnknownMarketError, predictor.DateOutOfRangeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except predictor.PredictorError as e:
        raise HTTPException(status_code=500, detail=str(e))