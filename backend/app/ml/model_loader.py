import joblib
import os
import xgboost as xgb

class ModelLoader:
    def __init__(self, model_path: str = "app/ml/models/xgboost_v1.pkl"):
        self.model_path = model_path
        self.model = None

    def load(self):
        """Loads model artifact from disk or cloud storage."""
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
        else:
            # For hackathon/development fallback, initialize a dummy model
            # In a real environment, you'd fail loudly or pull from S3.
            self.model = xgb.XGBRegressor()
            # We don't train it here, just instantiate to avoid crashes
            # Mocking predict for now if not loaded
            
    def get_model(self):
        if self.model is None:
            self.load()
        return self.model

# Singleton loader instance
model_loader = ModelLoader()
