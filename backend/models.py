# pyrefly: ignore [missing-import]
from datetime import date as date_type, datetime
from typing import Optional

from pydantic import BaseModel, Field


class ModelRequest(BaseModel):
    date: datetime = Field(..., description="Date to predict the price for (YYYY-MM-DD).")
    market: str = Field(..., examples=["Lahore"], description="Market/city name.")
    crop: str = Field(..., examples=["Onion"], description="Crop/commodity name.")

    # Optional exogenous feature overrides for dates beyond the training window.
    # When omitted, the last observed value is carried forward.
    price_vs_mean_30d: Optional[float] = Field(
        None, description="Override for the price_vs_mean_30d exogenous feature."
    )
    panic_index_7d: Optional[float] = Field(
        None, description="Override for the panic_index_7d exogenous feature."
    )


class ConfidenceInterval(BaseModel):
    lower: float = Field(..., description="Lower bound of the prediction interval.")
    upper: float = Field(..., description="Upper bound of the prediction interval.")


class ExogUsed(BaseModel):
    price_vs_mean_30d: float
    panic_index_7d: float


class ModelResponse(BaseModel):
    date: date_type = Field(..., description="Predicted date.")
    market: str = Field(..., description="Resolved market name.")
    crop: str = Field(..., description="Resolved crop name.")
    predicted_price: float = Field(..., description="Predicted price (PKR).")
    confidence_interval: ConfidenceInterval
    confidence_level: float = Field(..., description="Confidence level of the interval.")
    method: str = Field(..., description="'in_sample' or 'forecast'.")
    horizon_days: int = Field(..., description="Days from training-window end (negative = in-sample).")
    exog_used: ExogUsed = Field(..., description="Exogenous feature values used for the prediction.")
    model_file: str = Field(..., description="Model file that produced the prediction.")


class ModelInfo(BaseModel):
    crop: str
    market: str
    model_file: str
    training_start: Optional[date_type] = None
    training_end: Optional[date_type] = None


class ModelListResponse(BaseModel):
    crops: list[str]
    markets: list[str]
    confidence_level: float
    max_horizon_days: int
    models: list[ModelInfo]


class ErrorResponse(BaseModel):
    detail: str
