from typing import Dict, Any

class ExplainService:
    async def explain_forecast(self, region: str, horizon: str = "24h") -> Dict[str, Any]:
        """
        Mock implementation of SHAP explainability.
        In prod, this passes the specific feature vector to shap.TreeExplainer 
        against the XGBoost model, sorts absolute SHAP values, and returns top N.
        """
        # Mock SHAP outputs for hackathon
        top_features = [
            {"feature": "temperature", "impact": "+12.4%"},
            {"feature": "industrial_holiday", "impact": "-8.2%"},
            {"feature": "humidity", "impact": "+3.1%"}
        ]
        
        # Narration generation based on top features
        narration = (
            f"The model predicts higher load primarily driven by elevated temperature ({top_features[0]['impact']}), "
            f"offset partially by expected industrial holiday closures ({top_features[1]['impact']})."
        )
        
        return {
            "predicted_load": 48500,  # mock average
            "shap_top_features": top_features,
            "narration": narration
        }

explain_service = ExplainService()
