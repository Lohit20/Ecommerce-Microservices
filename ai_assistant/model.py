import os
from google.adk.models.lite_llm import LiteLlm


def build_model() -> LiteLlm:
    api_key = os.environ.get("MISTRAL_API_KEY", "")
    model_tag = os.environ.get("MISTRAL_MODEL_TAG", "mistral-large-latest")
    return LiteLlm(
        model=f"mistral/{model_tag}",
        api_key=api_key,
    )
