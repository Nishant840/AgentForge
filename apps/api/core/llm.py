import litellm
from apps.api.core.config import settings

litellm.set_verbose = False  # Disable verbose internal logging from LiteLLM

async def call_llm(messages: list[dict], tools: list[dict] | None = None) -> dict:
    """Asynchronously invoke any supported LLM provider via LiteLLM with optional tool calling."""
    kwargs = {
        "model": settings.LLM_MODEL,
        "messages": messages,
        "temperature": 0.1,  # Low temperature ensures more deterministic and reliable code generation
        "max_tokens": 4096,
    }

    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"  # Let the model automatically decide when to trigger tools

    response = await litellm.acompletion(**kwargs)
    return response.choices[0].message  # Returns the message object containing text content and/or tool calls