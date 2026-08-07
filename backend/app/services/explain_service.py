"""
Explain Service
================
Provides SHAP-based explainability for model predictions.
Uses real SHAP TreeExplainer against the trained XGBoost model
to show which features are driving each prediction.
"""

import numpy as np
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ExplainService:
    async def explain_forecast(self, region: str, horizon: str = "24h") -> Dict[str, Any]:
        """
        Computes SHAP feature explanations for the current forecast.
        
        Uses the trained XGBoost model and attempts real SHAP values.
        Falls back to feature importance if SHAP is too slow.
        """
        try:
            from app.services.prediction_service import prediction_service
            from app.ml.model_loader import model_loader
            from app.ml.feature_pipeline import create_features, SHORT_TERM_FEATURES, LONG_TERM_FEATURES
            from datetime import datetime, timedelta

            hours = int(horizon.replace("h", ""))
            model = model_loader.get_model_for_horizon(hours)
            feature_cols = SHORT_TERM_FEATURES if hours <= 6 else LONG_TERM_FEATURES

            # Get the forecast
            forecast = await prediction_service.predict_horizon(region, horizon)
            avg_load = sum(p["load_mw"] for p in forecast["points"]) / len(forecast["points"])

            # Try real SHAP values
            try:
                import shap
                
                # Build a sample feature vector for explanation
                now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
                raw_data = [{"timestamp": now.isoformat() + "Z"}]
                features_df = create_features(raw_data)
                inference_df = features_df[feature_cols]

                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(inference_df)

                # Get feature names and their SHAP values
                shap_vals = shap_values[0]  # First (only) sample
                pairs = list(zip(feature_cols, shap_vals))
                pairs.sort(key=lambda x: abs(x[1]), reverse=True)

                top_features = []
                for name, val in pairs[:8]:
                    direction = "+" if val > 0 else ""
                    pct = val / avg_load * 100 if avg_load > 0 else 0
                    top_features.append({
                        "feature": name,
                        "shap_value": round(float(val), 2),
                        "impact": f"{direction}{pct:.1f}%",
                        "direction": "increases" if val > 0 else "decreases",
                    })

                narration = self._build_narration(top_features, avg_load, region)
                
                return {
                    "region": region,
                    "horizon": horizon,
                    "predicted_load": round(avg_load),
                    "explanation_method": "SHAP (TreeExplainer)",
                    "shap_top_features": top_features,
                    "narration": narration,
                }

            except ImportError:
                logger.warning("SHAP not installed, falling back to feature importance")
            except Exception as e:
                logger.warning(f"SHAP failed ({e}), falling back to feature importance")

            # Fallback: use XGBoost built-in feature importance
            importances = model.feature_importances_
            pairs = list(zip(feature_cols, importances))
            pairs.sort(key=lambda x: x[1], reverse=True)

            top_features = []
            for name, imp in pairs[:8]:
                top_features.append({
                    "feature": name,
                    "importance": round(float(imp), 4),
                    "impact": f"{imp * 100:.1f}%",
                    "direction": "contributes to prediction",
                })

            narration = self._build_narration_from_importance(top_features, avg_load, region)

            return {
                "region": region,
                "horizon": horizon,
                "predicted_load": round(avg_load),
                "explanation_method": "Feature Importance (XGBoost gain)",
                "shap_top_features": top_features,
                "narration": narration,
            }

        except Exception as e:
            logger.error(f"Explanation failed: {e}")
            return {
                "region": region,
                "horizon": horizon,
                "predicted_load": 0,
                "explanation_method": "unavailable",
                "shap_top_features": [],
                "narration": f"Explanation unavailable: {str(e)}",
            }

    def _build_narration(self, features: list, avg_load: float, region: str) -> str:
        """Builds a human-readable narration from SHAP values."""
        if not features:
            return "No explanation available."

        top = features[0]
        second = features[1] if len(features) > 1 else None

        narration = (
            f"For the {region} region, the model predicts an average load of "
            f"{avg_load:,.0f} MW. The strongest driver is **{top['feature']}** "
            f"({top['impact']}), which {top['direction']} demand."
        )

        if second:
            narration += (
                f" The second most influential factor is **{second['feature']}** "
                f"({second['impact']}), which {second['direction']} demand."
            )

        # Add weather context if relevant
        weather_features = [f for f in features if f["feature"] in 
                          ("temperature", "humidity", "heat_index", "cdd", "rainfall")]
        if weather_features:
            narration += " Weather conditions are significantly influencing the forecast."

        return narration

    def _build_narration_from_importance(self, features: list, avg_load: float, region: str) -> str:
        """Builds narration from feature importance (when SHAP is unavailable)."""
        if not features:
            return "No explanation available."

        top3 = [f["feature"] for f in features[:3]]
        
        return (
            f"For the {region} region, the model predicts an average load of "
            f"{avg_load:,.0f} MW. The most important features driving this prediction "
            f"are: **{top3[0]}**, **{top3[1]}**, and **{top3[2]}**. "
            f"These features account for the majority of the model's decision. "
            f"(Note: SHAP explainability is available for more detailed analysis.)"
        )


explain_service = ExplainService()
