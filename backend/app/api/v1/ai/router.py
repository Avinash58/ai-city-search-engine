from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.genai as genai
from google.genai import types
from app.core.settings import settings

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/rank")
def ai_rank(query: str, items: list[dict]) -> dict:
    # Placeholder: implement embeddings + semantic ranking.
    return {"query": query, "ranked": items}


@router.post("/chat")
def ai_chat(req: ChatRequest) -> dict:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY is not configured on the backend.")
    try:
        # Configure the genai SDK
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = (
            "You are a local city concierge and premium travel guide for our AI City Search Engine application. "
            "Help the user find the best places to visit, restaurants to eat at, and activities to enjoy. "
            "Keep your responses relatively concise (1-2 short paragraphs), extremely engaging, and beautifully formatted in markdown. "
            "Suggest actual places, foods to try, or tips if they ask about a city."
        )
        
        # Format conversation history for Gemini SDK
        formatted_history = []
        for msg in req.history:
            # Normalize sender key from frontend ('user' / 'ai') to Gemini role ('user' / 'model')
            role = "user" if msg.get("sender") == "user" else "model"
            text = msg.get("text", "")
            if text:
                formatted_history.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))
        
        # Use start_chat with history to keep the conversation contextually linked
        chat = client.chats.create(
            model="gemini-2.5-flash",
            history=formatted_history,
            config=types.GenerateContentConfig(system_instruction=system_instruction)
        )
        response = chat.send_message(req.message)
        
        return {"response": response.text}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

