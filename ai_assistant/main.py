import os
import re
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional

import google.genai.types as genai_types
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from pydantic import BaseModel

import services

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_MODEL_TAG = os.getenv("MISTRAL_MODEL_TAG", "mistral-large-latest")

# ── Startup / shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    from agents import vera_coordinator

    app.state.session_service = InMemorySessionService()
    app.state.runner = Runner(
        agent=vera_coordinator,
        app_name="vera",
        session_service=app.state.session_service,
    )
    yield
    await services.close_client()


app = FastAPI(title="Vera — Agentic AI Assistant (Google ADK + Mistral)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / response models ─────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []
    product_context: Optional[dict] = None
    user_id: Optional[str] = None
    auth_token: Optional[str] = None
    pending_product_id: Optional[int] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "provider": "mistral",
        "model": MISTRAL_MODEL_TAG,
        "api_key_configured": bool(MISTRAL_API_KEY),
        "mode": "adk-coordinator",
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    if not MISTRAL_API_KEY:
        return {
            "response": "The assistant is not configured yet. Please contact support@velour.co.uk.",
            "options": [],
            "products": [],
        }

    runner: Runner = app.state.runner
    session_service: InMemorySessionService = app.state.session_service

    # ── 1. Identify this request's session ────────────────────────────────
    adk_user_id = req.user_id or "anon"
    session_id = str(uuid.uuid4())

    # ── 2. Seed per-request context into fresh session state ──────────────
    initial_state: dict = {
        "user_id": req.user_id,
        "auth_token": req.auth_token,
        "product_context": req.product_context,
        "candidates": {},
        "display_ids": [],
        "options": [],
        "pending_action": None,
    }

    if req.product_context:
        try:
            card = services.shape_card(req.product_context)
            pid = str(card.get("product_id", ""))
            if pid:
                initial_state["candidates"][pid] = card
        except Exception:
            pass

    await session_service.create_session(
        app_name="vera",
        user_id=adk_user_id,
        session_id=session_id,
        state=initial_state,
    )

    # ── 3. Build message with conversation history as context prefix ───────
    history_prefix = ""
    if req.history:
        turns = req.history[-8:]
        lines = []
        for m in turns:
            label = "Customer" if m.role == "user" else "Vera"
            lines.append(f"{label}: {m.content}")
        history_prefix = (
            "[Recent conversation — use this for context]\n"
            + "\n".join(lines)
            + "\n\n[Current message from customer]\n"
        )

    full_message = history_prefix + req.message

    new_message = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=full_message)],
    )

    # ── 4. Run the agent (with retry on rate-limit or empty reply) ─────────
    reply = ""
    import asyncio, traceback

    delays = [5, 15]
    for attempt in range(3):
        if attempt > 0:
            await asyncio.sleep(delays[attempt - 1])
        try:
            async for event in runner.run_async(
                user_id=adk_user_id,
                session_id=session_id,
                new_message=new_message,
            ):
                if event.is_final_response():
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if hasattr(part, "text") and part.text:
                                reply = part.text.strip()
                                break
        except Exception as exc:
            err_str = str(exc).lower()
            is_rate_limit = "429" in err_str or "rate limit" in err_str or "rate_limited" in err_str
            if is_rate_limit and attempt < 2:
                continue
            reply = (
                "I'm a little busy right now — please try again in a moment!"
                if is_rate_limit
                else "Sorry, I'm having a moment! Please try again or reach us at support@velour.co.uk."
            )
            traceback.print_exc()
            break

        if reply:
            break

    if not reply:
        reply = "I didn't quite catch that — could you rephrase?"

    # ── 5. Read structured results from session state ──────────────────────
    options: List[str] = []
    products: List[dict] = []
    pending_product_id: Optional[int] = None

    try:
        session = await session_service.get_session(
            app_name="vera",
            user_id=adk_user_id,
            session_id=session_id,
        )
        if session and session.state:
            state = session.state
            candidates: dict = state.get("candidates") or {}
            display_ids: list = state.get("display_ids") or []
            raw_options: list = state.get("options") or []
            pending_action = state.get("pending_action")

            seen = set()
            for pid in display_ids[:8]:
                key = str(pid)
                if key in candidates and key not in seen:
                    products.append(candidates[key])
                    seen.add(key)

            options = [str(o).strip() for o in raw_options if str(o).strip()][:4]

            if pending_action and pending_action.get("type") == "add_to_cart":
                pending_product_id = pending_action.get("product_id")
    except Exception:
        pass

    return {
        "response": reply,
        "options": options,
        "products": products,
        "pending_product_id": pending_product_id,
    }
