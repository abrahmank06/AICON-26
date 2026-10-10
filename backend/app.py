# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    ErrorResponse,
    ModelListResponse,
    ModelRequest,
    ModelResponse,
)
import predictor
from views import router as views_router

app = FastAPI(
    name="MAHIR",
    description="Crop price prediction API backed by per-market SARIMAX models.",
)


# The React dev server (Vite on :5173) must be able to call the view endpoints.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# View-shaped endpoints matching frontend/src/types.ts (see views.py).
app.include_router(views_router)


@app.get("/")
def home():
    return {
        "message": "The app is running",
        "endpoints": {
            "predict": "POST /predict",
            "models": "GET /models",
            "views": [
                "GET /snapshot",
                "GET /forecast",
                "GET /time-machine",
                "GET /alerts",
                "GET /analytics",
                "GET /performance",
            ],
        },
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