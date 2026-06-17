import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

import google.genai.types as genai_types
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from jose import JWTError, jwt
from pydantic import BaseModel

import database
import services

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_MODEL_TAG = os.getenv("MISTRAL_MODEL_TAG", "mistral-large-latest")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey_changeme_in_production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# ── Auth dependency ───────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=True)


async def require_user_id(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Startup / shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    from agents import vera_coordinator

    await database.connect()

    app.state.session_service = InMemorySessionService()
    app.state.runner = Runner(
        agent=vera_coordinator,
        app_name="vera",
        session_service=app.state.session_service,
    )
    yield
    await services.close_client()
    await database.close()


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
    session_id: Optional[str] = None       # conversation persistence ID
    recent_products: Optional[List[dict]] = []  # product cards shown in previous turns


# ── Helpers ───────────────────────────────────────────────────────────────────

_CONFIRM_RE = re.compile(
    r"^(yes|yeah|yep|yup|sure|ok|okay|do it|add it|add to cart|confirm|go ahead|please|yes please|absolutely|sounds good|perfect)[\s!.,]*$",
    re.IGNORECASE,
)


def _serial(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


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

    # ── Fast-path: confirmation of a pending cart add ─────────────────────────
    # Skips the full agent stack to avoid extra LLM calls and rate-limit errors.
    if (
        req.pending_product_id
        and req.user_id
        and req.auth_token
        and _CONFIRM_RE.match(req.message.strip())
    ):
        result = await services.cart_add(
            req.user_id,
            [{"product_id": req.pending_product_id, "quantity": 1}],
            req.auth_token,
        )
        if result.get("ok"):
            response_data = {
                "response": "Done! I've added that to your cart. What would you like to do next?",
                "options": ["Go to checkout", "Keep shopping"],
                "products": [],
                "pending_product_id": None,
            }
        elif result.get("error") == "insufficient_stock":
            response_data = {
                "response": "Oh no — that item just sold out before I could add it. Would you like to find something similar?",
                "options": ["Find similar items"],
                "products": [],
                "pending_product_id": None,
            }
        else:
            response_data = {
                "response": "I couldn't add that to your cart right now. Please try again or visit the product page directly.",
                "options": [],
                "products": [],
                "pending_product_id": None,
            }

        # Save the confirmation turn to MongoDB history
        if req.user_id and req.session_id:
            try:
                now = datetime.utcnow()
                col = database.conversations()
                await col.update_one(
                    {"user_id": req.user_id, "session_id": req.session_id},
                    {
                        "$push": {
                            "messages": {
                                "$each": [
                                    {"role": "user", "content": req.message, "products": [], "options": [], "ts": now},
                                    {"role": "assistant", "content": response_data["response"], "products": [], "options": response_data["options"], "ts": now},
                                ]
                            }
                        },
                        "$set": {"updated_at": now},
                    },
                )
            except Exception:
                pass

        return response_data

    runner: Runner = app.state.runner
    session_service: InMemorySessionService = app.state.session_service

    # ── 1. ADK session (always fresh per request) ─────────────────────────
    adk_user_id = req.user_id or "anon"
    adk_session_id = str(uuid.uuid4())

    # ── 2. Seed per-request context ───────────────────────────────────────
    initial_candidates: dict = {}

    # Carry forward products from previous turns so cart agent knows product_ids
    for p in (req.recent_products or [])[:16]:
        pid = str(p.get("product_id", ""))
        if pid:
            initial_candidates[pid] = p

    if req.product_context:
        try:
            card = services.shape_card(req.product_context)
            pid = str(card.get("product_id", ""))
            if pid:
                initial_candidates[pid] = card
        except Exception:
            pass

    initial_state: dict = {
        "user_id": req.user_id,
        "auth_token": req.auth_token,
        "product_context": req.product_context,
        "candidates": initial_candidates,
        "display_ids": [],
        "options": [],
        "pending_action": None,
    }

    if req.pending_product_id:
        initial_state["pending_action"] = {
            "type": "add_to_cart",
            "product_id": req.pending_product_id,
        }

    await session_service.create_session(
        app_name="vera",
        user_id=adk_user_id,
        session_id=adk_session_id,
        state=initial_state,
    )

    # ── 3. Build message with history prefix ──────────────────────────────
    history_prefix = ""

    # Product reference block — lets the cart agent look up correct product_ids
    if initial_candidates:
        prod_lines = []
        for card in list(initial_candidates.values())[:16]:
            pid = card.get("product_id")
            name = (card.get("name") or "")[:60]
            price = card.get("price", 0)
            stock = card.get("stock", 0)
            if pid:
                prod_lines.append(f"id:{pid} | {name} | £{price:.2f} | stock:{stock}")
        if prod_lines:
            history_prefix += (
                "[Products recently shown to shopper — use these EXACT ids for propose_add_to_cart]\n"
                + "\n".join(prod_lines)
                + "\n\n"
            )

    if req.history:
        turns = req.history[-8:]
        lines = []
        for m in turns:
            label = "Customer" if m.role == "user" else "Vera"
            lines.append(f"{label}: {m.content}")
        history_prefix += (
            "[Recent conversation — use this for context]\n"
            + "\n".join(lines)
            + "\n\n[Current message from customer]\n"
        )

    full_message = history_prefix + req.message

    new_message = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=full_message)],
    )

    # ── 4. Run the agent (with retry on rate-limit) ───────────────────────
    reply = ""
    import asyncio, traceback

    delays = [5, 15]
    for attempt in range(3):
        if attempt > 0:
            await asyncio.sleep(delays[attempt - 1])
        try:
            async for event in runner.run_async(
                user_id=adk_user_id,
                session_id=adk_session_id,
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

    # ── 5. Read structured results from session state ─────────────────────
    options: List[str] = []
    products: List[dict] = []
    pending_product_id: Optional[int] = None

    try:
        session = await session_service.get_session(
            app_name="vera",
            user_id=adk_user_id,
            session_id=adk_session_id,
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

    # ── 6. Persist conversation turn to MongoDB ───────────────────────────
    if req.user_id and req.session_id:
        try:
            now = datetime.utcnow()
            user_msg = {
                "role": "user",
                "content": req.message,
                "products": [],
                "options": [],
                "ts": now,
            }
            asst_msg = {
                "role": "assistant",
                "content": reply,
                "products": products,
                "options": options,
                "ts": now,
            }
            col = database.conversations()
            existing = await col.find_one(
                {"user_id": req.user_id, "session_id": req.session_id}
            )
            if existing:
                await col.update_one(
                    {"session_id": req.session_id},
                    {
                        "$push": {"messages": {"$each": [user_msg, asst_msg]}},
                        "$set": {"updated_at": now},
                    },
                )
            else:
                title = req.message[:60] + ("…" if len(req.message) > 60 else "")
                await col.insert_one(
                    {
                        "user_id": req.user_id,
                        "session_id": req.session_id,
                        "title": title,
                        "messages": [user_msg, asst_msg],
                        "created_at": now,
                        "updated_at": now,
                    }
                )
        except Exception:
            pass  # never fail the chat response over a DB write

    return {
        "response": reply,
        "options": options,
        "products": products,
        "pending_product_id": pending_product_id,
    }


# ── Conversation history endpoints ────────────────────────────────────────────


@app.get("/conversations/{user_id}")
async def list_conversations(
    user_id: str,
    current_user_id: str = Depends(require_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    col = database.conversations()
    cursor = col.find(
        {"user_id": user_id},
        {"messages": 0},  # exclude messages from list — only summary fields
    ).sort("updated_at", -1).limit(50)

    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
    return results


@app.get("/conversations/{user_id}/{session_id}")
async def get_conversation(
    user_id: str,
    session_id: str,
    current_user_id: str = Depends(require_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    col = database.conversations()
    doc = await col.find_one({"user_id": user_id, "session_id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")

    doc.pop("_id", None)
    return doc


@app.delete("/conversations/{user_id}/{session_id}")
async def delete_conversation(
    user_id: str,
    session_id: str,
    current_user_id: str = Depends(require_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    col = database.conversations()
    result = await col.delete_one({"user_id": user_id, "session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True}
