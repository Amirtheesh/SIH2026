import joblib
import os
import json
import numpy as np
from typing import Optional

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Base loads used as fallback if a model hasn't been trained yet
REGION_BASE_FALLBACK = {
    "northern": 55000,
    "southern": 48000,
    "western":  45000,
    "eastern":  22000,
    "national": 170000,
}


class ModelLoader:
    """
    Loads and caches trained XGBoost models for each region.
    
    Models are saved by train.py as:
        app/ml/models/xgboost_{region}_v1.pkl
    
    Usage:
        loader = ModelLoader()
        model  = loader.get_model("northern")
        preds  = model.predict(X_df)
    """

    def __init__(self):
        self._cache: dict = {}      # region -> xgb model
        self._metrics: dict = {}    # region -> training metrics

    def _load_model(self, region: str):
        """Load model from disk into the in-memory cache."""
        path = os.path.join(MODELS_DIR, f"xgboost_{region}_v1.pkl")
        if os.path.exists(path):
            self._cache[region] = joblib.load(path)
            # Also load metrics if available
            metrics_path = os.path.join(MODELS_DIR, f"metrics_{region}_v1.json")
            if os.path.exists(metrics_path):
                with open(metrics_path) as f:
                    self._metrics[region] = json.load(f)
            print(f"[ModelLoader] Loaded model for region: {region}")
        else:
            # Model not yet trained — store None so we know to use fallback
            self._cache[region] = None
            print(f"[ModelLoader] WARNING: No trained model found for '{region}'. "
                  f"Run: docker exec -it sih2026-api-1 python app/ml/train.py")

    def get_model(self, region: str):
        """Returns the XGBoost model for a region (loads from disk if needed)."""
        region = region.lower()
        if region not in self._cache:
            self._load_model(region)
        return self._cache.get(region)

    def is_trained(self, region: str) -> bool:
        """Returns True if a trained model exists for this region."""
        return self.get_model(region) is not None

    def get_metrics(self, region: str) -> Optional[dict]:
        """Returns the training metrics for a region, or None if not trained."""
        region = region.lower()
        if region not in self._metrics:
            metrics_path = os.path.join(MODELS_DIR, f"metrics_{region}_v1.json")
            if os.path.exists(metrics_path):
                with open(metrics_path) as f:
                    self._metrics[region] = json.load(f)
        return self._metrics.get(region)

    def predict(self, region: str, X) -> np.ndarray:
        """
        Run inference with the model for a region.
        
        If the model isn't trained yet, returns a mock value based on
        region base load so the API doesn't crash during development.
        """
        model = self.get_model(region)
        if model is not None:
            return model.predict(X)
        else:
            # Fallback: return region base load as a flat array
            base = REGION_BASE_FALLBACK.get(region.lower(), 50000)
            return np.full(len(X), base, dtype=float)


# Singleton — imported by prediction_service.py
model_loader = ModelLoader()
