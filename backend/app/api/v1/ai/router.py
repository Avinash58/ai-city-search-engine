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
    # 1. Try Gemini AI if API Key is configured
    if settings.GEMINI_API_KEY:
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
            print("Gemini AI chat error:", e)

    # 2. Try OpenRouter Llama Fallback if API Key is configured
    if settings.OPENROUTER_API_KEY:
        try:
            import httpx
            formatted_history = []
            for msg in req.history:
                role = "user" if msg.get("sender") == "user" else "assistant"
                formatted_history.append({"role": role, "content": msg.get("text", "")})
            
            formatted_history.append({"role": "user", "content": req.message})
            
            with httpx.Client(timeout=25.0) as client:
                response = client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "meta-llama/llama-3.1-8b-instruct:free",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a local city concierge and premium travel guide. Help the user find the best places to visit, restaurants to eat at, and activities. Keep your responses relatively concise (1-2 short paragraphs), extremely engaging, and formatted in markdown."
                            }
                        ] + formatted_history
                    }
                )
                if response.status_code == 200:
                    res_data = response.json()
                    if 'choices' in res_data and len(res_data['choices']) > 0:
                        content = res_data['choices'][0]['message'].get('content', '')
                        return {"response": content}
        except Exception as or_e:
            print("OpenRouter chat fallback exception:", or_e)

    # 3. Simulate rule-based response if offline/no keys configured
    msg_lower = req.message.lower()
    
    if "bhopal" in msg_lower:
        response_text = (
            "Welcome to Bhopal, the gorgeous **City of Lakes**! 🌊\n\n"
            "As your local concierge, I highly recommend visiting:\n"
            "- **Upper Lake (Bhojtal)**: Perfect for scenic boating and walks.\n"
            "- **Taj-ul-Masajid**: One of India's largest and most grand mosques.\n"
            "- **Manohar Dairy**: An absolute must-visit to try local sweets and street food!\n\n"
            "To unlock full dynamic AI conversation, please add a `GEMINI_API_KEY` to your settings."
        )
    elif "delhi" in msg_lower:
        response_text = (
            "Welcome to New Delhi, the historic heart of India! 🏛️\n\n"
            "Here are some top spots to explore:\n"
            "- **Qutub Minar**: A stunning UNESCO World Heritage minaret.\n"
            "- **Karim's near Jama Masjid**: Legendary Mughlai kebabs and korma since 1913.\n"
            "- **India Gate**: Perfect for an evening stroll and family picnics.\n\n"
            "To unlock full dynamic AI conversation, please add a `GEMINI_API_KEY` to your settings."
        )
    else:
        response_text = (
            "Hi there! I'm your local travel concierge. ✈️\n\n"
            "I can help you explore premium restaurants, hotels, and attractions in major Indian cities. "
            "Feel free to search for a city in the search bar above or check out the interactive map.\n\n"
            "*Note: To get live AI answers to your questions, please configure your `GEMINI_API_KEY` in the environment settings.*"
        )
        
    return {"response": response_text}

