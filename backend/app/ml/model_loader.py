import joblib
import os
import xgboost as xgb
import logging

logger = logging.getLogger(__name__)

class ModelLoader:
    def __init__(self, models_dir: str = "app/ml/models"):
        self.models_dir = models_dir
        self.model_point = None
        self.model_peak = None

    def load(self):
        """Loads model artifacts from disk."""
        point_path = os.path.join(self.models_dir, "xgboost_v1.pkl")
        peak_path = os.path.join(self.models_dir, "xgboost_v1_peak.pkl")
        
        if os.path.exists(point_path):
            self.model_point = joblib.load(point_path)
            logger.info(f"Loaded point model from {point_path}")
        else:
            logger.error(f"Point model file missing at {point_path}")
            
        if os.path.exists(peak_path):
            self.model_peak = joblib.load(peak_path)
            logger.info(f"Loaded peak model from {peak_path}")
        else:
            logger.warning(f"Peak model file missing at {peak_path}")

    def get_model(self):
        if self.model_point is None:
            self.load()
        if self.model_point is None:
            raise RuntimeError("Point forecast model is not loaded and could not be found.")
        return self.model_point

    def get_peak_model(self):
        if self.model_peak is None:
            self.load()
        if self.model_peak is None:
            return None # Fallback logic handled by caller
        return self.model_peak

model_loader = ModelLoader()
