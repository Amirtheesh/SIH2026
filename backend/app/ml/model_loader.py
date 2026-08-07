"""
Model Loader
=============
Loads all trained model artifacts from disk and provides them to services.

Models:
  - Short-term forecast (1-6h)
  - Long-term forecast (24h-168h)
  - Peak demand predictor
  - Peak hour predictor
  - Anomaly detector (Isolation Forest)
  - Legacy v1 models (backward compatibility)
"""

import joblib
import os
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class ModelLoader:
    def __init__(self, models_dir: str = "app/ml/models"):
        self.models_dir = models_dir
        
        # Forecast models
        self.model_short_term = None
        self.model_long_term = None
        
        # Peak models
        self.model_peak = None
        self.model_peak_hour = None
        
        # Anomaly detection
        self.model_anomaly = None
        
        # Legacy (backward compat)
        self.model_point = None
        
        # Config
        self.config: Dict[str, Any] = {}
        self._loaded = False

    def load(self):
        """Loads all model artifacts from disk."""
        if self._loaded:
            return
            
        paths = {
            "short_term": ("xgboost_short_term.pkl", "model_short_term"),
            "long_term": ("xgboost_long_term.pkl", "model_long_term"),
            "peak": ("xgboost_peak.pkl", "model_peak"),
            "peak_hour": ("xgboost_peak_hour.pkl", "model_peak_hour"),
            "anomaly": ("isolation_forest.pkl", "model_anomaly"),
            "legacy_point": ("xgboost_v1.pkl", "model_point"),
        }

        for name, (filename, attr) in paths.items():
            filepath = os.path.join(self.models_dir, filename)
            if os.path.exists(filepath):
                setattr(self, attr, joblib.load(filepath))
                logger.info(f"Loaded {name} model from {filepath}")
            else:
                logger.warning(f"{name} model not found at {filepath}")

        # Load config
        config_path = os.path.join(self.models_dir, "features.json")
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                self.config = json.load(f)
            logger.info(f"Loaded model config (version: {self.config.get('version', 'unknown')})")
        
        self._loaded = True

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    # --- Forecast Models ---
    
    def get_short_term_model(self):
        """Returns the short-term (1-6h) forecast model."""
        self._ensure_loaded()
        if self.model_short_term is None:
            raise RuntimeError("Short-term model not loaded. Run train_dummy_model.py first.")
        return self.model_short_term

    def get_long_term_model(self):
        """Returns the long-term (24-168h) forecast model."""
        self._ensure_loaded()
        if self.model_long_term is None:
            raise RuntimeError("Long-term model not loaded. Run train_dummy_model.py first.")
        return self.model_long_term

    def get_model_for_horizon(self, hours: int):
        """Returns the appropriate model based on forecast horizon."""
        if hours <= 6:
            return self.get_short_term_model()
        else:
            return self.get_long_term_model()

    def get_features_for_horizon(self, hours: int):
        """Returns the feature column list for the given horizon."""
        self._ensure_loaded()
        if hours <= 6:
            return self.config.get("short_term_features", [])
        else:
            return self.config.get("long_term_features", [])

    # --- Peak Models ---
    
    def get_peak_model(self):
        """Returns the daily peak demand prediction model."""
        self._ensure_loaded()
        return self.model_peak

    def get_peak_hour_model(self):
        """Returns the peak hour prediction model."""
        self._ensure_loaded()
        return self.model_peak_hour

    def get_peak_features(self):
        """Returns the feature columns for peak prediction."""
        self._ensure_loaded()
        return self.config.get("peak_features", [])

    # --- Anomaly Model ---
    
    def get_anomaly_model(self):
        """Returns the Isolation Forest anomaly detection model."""
        self._ensure_loaded()
        return self.model_anomaly

    # --- Legacy ---
    
    def get_model(self):
        """Legacy method: returns point forecast model (backward compat)."""
        self._ensure_loaded()
        if self.model_point is None:
            # Fall back to short-term model
            return self.get_short_term_model()
        return self.model_point

    # --- Config ---
    
    def get_config(self) -> Dict[str, Any]:
        """Returns the full model configuration including metrics."""
        self._ensure_loaded()
        return self.config

    def get_metrics(self) -> Dict[str, Any]:
        """Returns training metrics for all models."""
        self._ensure_loaded()
        return self.config.get("metrics", {})


model_loader = ModelLoader()
