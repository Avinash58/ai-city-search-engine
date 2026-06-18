import httpx
import math
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from app.core.settings import settings
import google.genai as genai

router = APIRouter()

# Curated lists of high-quality premium Unsplash photos for category mapping
UNSPLASH_PHOTOS = {
    "restaurant": [
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=350&q=80"
    ],
    "cafe": [
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=350&q=80"
    ],
    "hotel": [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=350&q=80"
    ],
    "attraction": [
        "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=350&q=80",
        "https://images.unsplash.com/photo-1590050752117-238cb0612b1b?auto=format&fit=crop&w=350&q=80"
    ]
}

def get_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def geocode_city_query(text: str, api_key: str) -> Optional[tuple[float, float]]:
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": text,
        "key": api_key
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("results"):
                    loc = data["results"][0]["geometry"]["location"]
                    return loc["lat"], loc["lng"]
    except Exception as e:
        print(f"Geocoding exception for '{text}':", e)
    return None

@router.get("/places")
def search_places(q: str, category: Optional[str] = "All", lat: Optional[float] = None, lng: Optional[float] = None, limit: int = 15) -> dict:
    api_key = settings.GOOGLE_PLACES_API_KEY

    normalized_q = q.lower().strip()
    
    # 1. Capture active user coordinates passed by the frontend
    user_coords = None
    if lat is not None and lng is not None:
        user_coords = (lat, lng)
        
    # Check if query explicitly overrides via 'gps:lat,lng'
    search_term = q
    if normalized_q.startswith("gps:"):
        try:
            parts = normalized_q.replace("gps:", "").split(",")
            gps_lat = float(parts[0])
            gps_lng = float(parts[1])
            user_coords = (gps_lat, gps_lng)
            lat, lng = gps_lat, gps_lng
            
            # Rewrite search_term to be something meaningful based on category
            if category == "Restaurants":
                search_term = "restaurants"
            elif category == "Hotels":
                search_term = "hotels"
            elif category == "Attractions":
                search_term = "tourist attractions"
            else:
                search_term = "places of interest"
        except Exception:
            pass

    # 2. Determine target coordinate center point for search
    target_lat, target_lng = lat, lng
    
    generic_keywords = [
        "cafes", "cafe", "restaurants", "restaurant", "hotels", "hotel", 
        "attractions", "attraction", "all", "more", "near me", "current location", 
        "gps", "places near me", "places of interest", ""
    ]
    is_generic = normalized_q in generic_keywords or normalized_q.startswith("gps:")
    
    if not is_generic and api_key:
        resolved_coords = geocode_city_query(q, api_key)
        if resolved_coords:
            target_lat, target_lng = resolved_coords

    if target_lat is None or target_lng is None:
        target_lat, target_lng = 28.6139, 77.2090

    lat, lng = target_lat, target_lng

    # 3. Map Frontend Category selection to Google Place Types
    query_lower = search_term.lower()
    implied_cafe = "cafe" in query_lower or "cafes" in query_lower or "coffee" in query_lower
    implied_food = "restaurant" in query_lower or "restaurants" in query_lower or "food" in query_lower or "dining" in query_lower
    implied_hotel = "hotel" in query_lower or "hotels" in query_lower or "resort" in query_lower
    implied_monument = "monument" in query_lower or "attraction" in query_lower or "temple" in query_lower or "fort" in query_lower

    place_type = ""
    if category == "Restaurants" or implied_food or implied_cafe:
        place_type = "cafe" if implied_cafe else "restaurant"
    elif category == "Hotels" or implied_hotel:
        place_type = "lodging"
    elif category == "Attractions" or implied_monument:
        place_type = "tourist_attraction"

    transformed_results = []

    # 4. Fetch Places from Google Places API (only if API key is configured)
    if not api_key:
        raise Exception("Google Places API key not configured, using AI fallback")

    places_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": q if not is_generic else (place_type if place_type else "places of interest"),
        "location": f"{lat},{lng}",
        "radius": 15000,
        "key": api_key
    }
    if place_type:
        params["type"] = place_type

    try:
        with httpx.Client(timeout=12.0) as client:
            response = client.get(places_url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") in ["REQUEST_DENIED", "OVER_QUERY_LIMIT"]:
                    raise Exception("Google Places API Denied/Quota: " + data.get("error_message", data.get("status")))
                results = data.get("results", [])[:limit]
                
                for res in results:
                    place_id = res.get("place_id", "")
                    hash_val = abs(hash(place_id))
                    
                    name = res.get("name", "Unknown Place")
                    address = res.get("formatted_address", "City Center Location")
                    
                    geom = res.get("geometry", {}).get("location", {})
                    place_lat = geom.get("lat")
                    place_lon = geom.get("lng")
                    
                    # Real rating and total ratings
                    rating = res.get("rating", round(4.2 + (hash_val % 8) * 0.1, 1))
                    user_ratings_total = res.get("user_ratings_total", 0)
                    
                    # Real price level (0-4)
                    price_level = res.get("price_level")
                    if price_level is not None:
                        price = "$" * max(1, price_level)
                    else:
                        price_opts = ["$", "$$", "$$$", "$$$$"]
                        price = price_opts[hash_val % len(price_opts)]
                    
                    # Real opening hours
                    opening_hours = res.get("opening_hours", {})
                    open_now = opening_hours.get("open_now")
                    if open_now is True:
                        status_str = "Open Now"
                    elif open_now is False:
                        status_str = "Closed"
                    else:
                        status_opts = ["Open • Closes 11 PM", "Open • Closes 10:30 PM", "Open • Closes 12 AM", "Open • 24 Hours"]
                        status_str = status_opts[hash_val % len(status_opts)]
                    
                    # Map categories
                    types = res.get("types", [])
                    place_cat = "Restaurants"
                    photo_key = "restaurant"
                    derived_tags = []
                    
                    if "cafe" in types:
                        place_cat = "Restaurants"
                        photo_key = "cafe"
                        derived_tags = ["Cafe", "Coffee"]
                    elif "restaurant" in types or "food" in types:
                        place_cat = "Restaurants"
                        photo_key = "restaurant"
                        derived_tags = ["Restaurant", "Gourmet"]
                    elif "lodging" in types:
                        place_cat = "Hotels"
                        photo_key = "hotel"
                        derived_tags = ["Luxury", "Hotel"]
                    elif "tourist_attraction" in types or "point_of_interest" in types:
                        place_cat = "Attractions"
                        photo_key = "attraction"
                        derived_tags = ["Attraction", "Sightseeing"]
                        
                    # Real Photos mapping
                    photos = res.get("photos", [])
                    if photos:
                        photo_ref = photos[0].get("photo_reference")
                        image_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_ref}&key={api_key}"
                    else:
                        available_photos = UNSPLASH_PHOTOS.get(photo_key, UNSPLASH_PHOTOS["restaurant"])
                        image_url = available_photos[hash_val % len(available_photos)]
                    
                    dist_km = None
                    if user_coords and place_lat and place_lon:
                        dist_km = round(get_haversine_distance(user_coords[0], user_coords[1], place_lat, place_lon), 1)

                    desc = f"A premium highly rated {photo_key} spot to explore in the local area."
                    if user_ratings_total > 0:
                        desc += f" Reviewed by {user_ratings_total} people."

                    transformed_results.append({
                        "name": name,
                        "category": place_cat,
                        "rating": rating,
                        "address": address,
                        "desc": desc,
                        "price": price,
                        "status": status_str,
                        "website": "",
                        "phone": "",
                        "tags": derived_tags if derived_tags else ["Local", "Recommended"],
                        "image": image_url,
                        "lat": place_lat,
                        "lng": place_lon,
                        "distance_km": dist_km
                    })
    except Exception as e:
        print("Google Places API dynamic search exception:", e)
        # Try Gemini AI first as it supports structured outputs and is highly reliable
        if settings.GEMINI_API_KEY:
            try:
                import json
                from google.genai import types
                
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = f"""
                You are a premium travel guide and local expert.
                Generate a list of 5-8 real, accurate, and popular places matching the query '{search_term}' near latitude {lat}, longitude {lng}.
                If latitude and longitude represent a generic default location, resolve the actual coordinates for the searched area or city.
                
                For each place, provide:
                1. The real and exact name of the place.
                2. A real and accurate street address.
                3. The true latitude and longitude coordinates.
                4. A realistic rating (3.0 to 5.0) and number of ratings.
                5. An accurate price level (1 to 4).
                6. The primary category types (e.g. ["cafe"], ["restaurant"], ["tourist_attraction"], ["lodging"]).
                7. A highly detailed and informative 2-3 sentence description of the place, detailing its history, what it is known for, signature dishes, or key amenities.
                
                Also resolve the name of the neighborhood/city corresponding to the latitude {lat} and longitude {lng} (e.g. 'Connaught Place, New Delhi') in 'resolved_location'.
                And provide a 3-4 sentence engaging travel summary overview about this area and search query in 'ai_summary'.
                """
                
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema={
                            "type": "OBJECT",
                            "properties": {
                                "resolved_location": {"type": "STRING"},
                                "ai_summary": {"type": "STRING"},
                                "places": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "name": {"type": "STRING"},
                                            "formatted_address": {"type": "STRING"},
                                            "rating": {"type": "NUMBER"},
                                            "user_ratings_total": {"type": "INTEGER"},
                                            "price_level": {"type": "INTEGER"},
                                            "types": {
                                                "type": "ARRAY",
                                                "items": {"type": "STRING"}
                                            },
                                            "lat": {"type": "NUMBER"},
                                            "lng": {"type": "NUMBER"},
                                            "desc": {"type": "STRING"}
                                        },
                                        "required": ["name", "formatted_address", "rating", "user_ratings_total", "price_level", "types", "lat", "lng", "desc"]
                                    }
                                }
                            },
                            "required": ["resolved_location", "ai_summary", "places"]
                        }
                    )
                )
                
                if response.text:
                    ai_data = json.loads(response.text)
                    results = ai_data.get("places", [])[:limit]
                    
                    for res in results:
                        place_id = res.get("name", "")
                        hash_val = abs(hash(place_id))
                        
                        name = res.get("name", "Unknown Place")
                        address = res.get("formatted_address", "City Center Location")
                        
                        place_lat = res.get("lat")
                        place_lon = res.get("lng")
                        
                        rating = res.get("rating", round(4.2 + (hash_val % 8) * 0.1, 1))
                        user_ratings_total = res.get("user_ratings_total", 0)
                        
                        price_level = res.get("price_level")
                        if price_level is not None:
                            price = "$" * max(1, price_level)
                        else:
                            price_opts = ["$", "$$", "$$$", "$$$$"]
                            price = price_opts[hash_val % len(price_opts)]
                        
                        status_opts = ["Open Now", "Open • Closes 11 PM", "Open • 24 Hours"]
                        status_str = status_opts[hash_val % len(status_opts)]
                        
                        types = res.get("types", [])
                        place_cat = "Restaurants"
                        photo_key = "restaurant"
                        derived_tags = []
                        
                        if "school" in types or "education" in types:
                            place_cat = "More"
                            photo_key = "attraction"
                            derived_tags = ["Education", "School"]
                        elif "cafe" in types:
                            place_cat = "Restaurants"
                            photo_key = "cafe"
                            derived_tags = ["Cafe", "Coffee"]
                        elif "restaurant" in types or "food" in types:
                            place_cat = "Restaurants"
                            photo_key = "restaurant"
                            derived_tags = ["Restaurant", "Gourmet"]
                        elif "lodging" in types or "hotel" in types:
                            place_cat = "Hotels"
                            photo_key = "hotel"
                            derived_tags = ["Luxury", "Hotel"]
                        else:
                            place_cat = "Attractions"
                            photo_key = "attraction"
                            derived_tags = ["Attraction", "Local"]
                            
                        available_photos = UNSPLASH_PHOTOS.get(photo_key, UNSPLASH_PHOTOS["restaurant"])
                        image_url = available_photos[hash_val % len(available_photos)]
                        
                        dist_km = None
                        if user_coords and place_lat and place_lon:
                            dist_km = round(get_haversine_distance(user_coords[0], user_coords[1], place_lat, place_lon), 1)

                        desc = res.get("desc", f"A premium highly rated {photo_key} spot to explore. Recommended by AI.")

                        transformed_results.append({
                            "name": name,
                            "category": place_cat,
                            "rating": rating,
                            "address": address,
                            "desc": desc,
                            "price": price,
                            "status": status_str,
                            "website": res.get("website", ""),
                            "phone": res.get("phone", ""),
                            "tags": derived_tags,
                            "image": image_url,
                            "lat": place_lat,
                            "lng": place_lon,
                            "distance_km": dist_km
                        })
                    
                    return {
                        "query": q,
                        "category": category,
                        "results": sorted(transformed_results, key=lambda p: p.get("distance_km", 999999)) if user_coords else transformed_results,
                        "limit": limit,
                        "count": len(transformed_results),
                        "ai_summary": ai_data.get("ai_summary", ""),
                        "resolved_location": ai_data.get("resolved_location", "")
                    }
            except Exception as gemini_e:
                print("Gemini AI fallback exception inside search places:", gemini_e)

        # Fallback to OpenRouter API for generating places
        if settings.OPENROUTER_API_KEY:
            try:
                import json
                
                prompt = f"Generate a JSON response containing two fields: 'ai_summary' (a brief 2-3 sentence guide/summary about '{q}') and 'places' (an array of up to 5 places matching '{q}' near latitude {lat}, longitude {lng}). Each place must have: 'name' (string), 'formatted_address' (string), 'rating' (float 3.0-5.0), 'user_ratings_total' (int), 'price_level' (int 1-4), 'types' (array of strings, e.g. ['restaurant'] or ['school']), 'geometry' (object with 'location' containing 'lat' and 'lng' floats). Respond ONLY with valid JSON."
                
                with httpx.Client(timeout=20.0) as client:
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
                                    "role": "user",
                                    "content": prompt
                                }
                            ]
                        }
                    )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if 'choices' in response_data and len(response_data['choices']) > 0:
                        text_content = response_data['choices'][0]['message'].get('content', '')
                        cleaned_text = text_content.replace('```json', '').replace('```', '').strip()
                        ai_data = json.loads(cleaned_text)
                        results = ai_data.get("places", [])[:limit]
                    
                        # Transform the AI generated results to match our format
                        for res in results:
                            place_id = res.get("name", "")
                            hash_val = abs(hash(place_id))
                            
                            name = res.get("name", "Unknown Place")
                            address = res.get("formatted_address", "City Center Location")
                            
                            geom = res.get("geometry", {}).get("location", {})
                            place_lat = geom.get("lat")
                            place_lon = geom.get("lng")
                            
                            rating = res.get("rating", round(4.2 + (hash_val % 8) * 0.1, 1))
                            user_ratings_total = res.get("user_ratings_total", 0)
                            
                            price_level = res.get("price_level")
                            if price_level is not None:
                                price = "$" * max(1, price_level)
                            else:
                                price_opts = ["$", "$$", "$$$", "$$$$"]
                                price = price_opts[hash_val % len(price_opts)]
                            
                            status_opts = ["Open Now", "Open • Closes 11 PM", "Open • 24 Hours"]
                            status_str = status_opts[hash_val % len(status_opts)]
                            
                            types = res.get("types", [])
                            place_cat = "Restaurants"
                            photo_key = "restaurant"
                            derived_tags = []
                            
                            if "school" in types or "education" in types:
                                place_cat = "More"
                                photo_key = "attraction"
                                derived_tags = ["Education", "School"]
                            elif "cafe" in types:
                                place_cat = "Restaurants"
                                photo_key = "cafe"
                                derived_tags = ["Cafe", "Coffee"]
                            elif "restaurant" in types or "food" in types:
                                place_cat = "Restaurants"
                                photo_key = "restaurant"
                                derived_tags = ["Restaurant", "Gourmet"]
                            elif "lodging" in types or "hotel" in types:
                                place_cat = "Hotels"
                                photo_key = "hotel"
                                derived_tags = ["Luxury", "Hotel"]
                            else:
                                place_cat = "Attractions"
                                photo_key = "attraction"
                                derived_tags = ["Attraction", "Local"]
                                
                            available_photos = UNSPLASH_PHOTOS.get(photo_key, UNSPLASH_PHOTOS["restaurant"])
                            image_url = available_photos[hash_val % len(available_photos)]
                            
                            dist_km = None
                            if user_coords and place_lat and place_lon:
                                dist_km = round(get_haversine_distance(user_coords[0], user_coords[1], place_lat, place_lon), 1)

                            desc = f"A premium highly rated {photo_key} spot to explore. Recommended by AI."

                            transformed_results.append({
                                "name": name,
                                "category": place_cat,
                                "rating": rating,
                                "address": address,
                                "desc": desc,
                                "price": price,
                                "status": status_str,
                                "website": "",
                                "phone": "",
                                "tags": derived_tags,
                                "image": image_url,
                                "lat": place_lat,
                                "lng": place_lon,
                                "distance_km": dist_km
                            })
                        
                        return {
                            "query": q,
                            "category": category,
                            "results": sorted(transformed_results, key=lambda p: p.get("distance_km", 999999)) if user_coords else transformed_results,
                            "limit": limit,
                            "count": len(transformed_results),
                            "ai_summary": ai_data.get("ai_summary", "")
                        }
            except Exception as ai_e:
                print("Gemini AI fallback exception:", ai_e)

        # Last resort: return curated static results so the UI always shows something
        static_places = [
            {"name": "Karim's", "category": "Restaurants", "rating": 4.6, "address": "16, Gali Kababian, Jama Masjid, New Delhi", "desc": "Legendary Mughlai restaurant serving Delhi since 1913. Famous for mutton korma and seekh kababs.", "price": "$$", "status": "Open • Closes 11 PM", "website": "", "phone": "", "tags": ["Mughlai", "Historic", "Must Visit"], "image": UNSPLASH_PHOTOS["restaurant"][0], "lat": 28.6507, "lng": 77.2334, "distance_km": None},
            {"name": "Indian Coffee House", "category": "Restaurants", "rating": 4.2, "address": "Mohan Singh Place, Baba Kharak Singh Marg, New Delhi", "desc": "A cultural institution in Delhi. Affordable South Indian food and filter coffee since 1957.", "price": "$", "status": "Open • Closes 9 PM", "website": "", "phone": "", "tags": ["Cafe", "Coffee", "Budget"], "image": UNSPLASH_PHOTOS["cafe"][1], "lat": 28.6334, "lng": 77.2195, "distance_km": None},
            {"name": "The Imperial Hotel", "category": "Hotels", "rating": 4.8, "address": "Janpath, New Delhi, 110001", "desc": "A heritage 5-star hotel in the heart of New Delhi. Iconic colonial architecture with world-class dining.", "price": "$$$$", "status": "Open • 24 Hours", "website": "", "phone": "", "tags": ["Luxury", "Heritage", "5-Star"], "image": UNSPLASH_PHOTOS["hotel"][0], "lat": 28.6236, "lng": 77.2163, "distance_km": None},
            {"name": "Qutub Minar", "category": "Attractions", "rating": 4.5, "address": "Mehrauli, New Delhi, Delhi 110030", "desc": "UNESCO World Heritage Site. A 73-metre tall minaret built in 1193. One of Delhi's most iconic landmarks.", "price": "$", "status": "Open • Closes 5 PM", "website": "", "phone": "", "tags": ["UNESCO", "Heritage", "Sightseeing"], "image": UNSPLASH_PHOTOS["attraction"][0], "lat": 28.5245, "lng": 77.1855, "distance_km": None},
            {"name": "Bukhara", "category": "Restaurants", "rating": 4.7, "address": "ITC Maurya, Sardar Patel Marg, New Delhi", "desc": "World-renowned restaurant serving robust Northwest Frontier cuisine. Famous for its dal bukhara and tandoori dishes.", "price": "$$$$", "status": "Open • Closes 11:45 PM", "website": "", "phone": "", "tags": ["Fine Dining", "Tandoor", "Iconic"], "image": UNSPLASH_PHOTOS["restaurant"][1], "lat": 28.5991, "lng": 77.1721, "distance_km": None},
            {"name": "Andaz Delhi", "category": "Hotels", "rating": 4.7, "address": "Asset No. 1, Aerocity Hospitality District, New Delhi", "desc": "Contemporary 5-star hotel near Indira Gandhi Airport. Modern design with premium amenities and multiple restaurants.", "price": "$$$", "status": "Open • 24 Hours", "website": "", "phone": "", "tags": ["Luxury", "Modern", "Airport"], "image": UNSPLASH_PHOTOS["hotel"][1], "lat": 28.5573, "lng": 77.1201, "distance_km": None},
            {"name": "India Gate", "category": "Attractions", "rating": 4.6, "address": "Rajpath, India Gate, New Delhi, Delhi 110001", "desc": "A war memorial and iconic landmark of New Delhi. Beautiful lawns perfect for evening walks and picnics.", "price": "Free", "status": "Open • 24 Hours", "website": "", "phone": "", "tags": ["Landmark", "Free", "Historic"], "image": UNSPLASH_PHOTOS["attraction"][1], "lat": 28.6129, "lng": 77.2295, "distance_km": None},
            {"name": "Cafe Lota", "category": "Restaurants", "rating": 4.4, "address": "National Crafts Museum, Bhairon Marg, New Delhi", "desc": "A beautiful cafe inside the National Crafts Museum. Serves modern Indian food in a charming outdoor setting.", "price": "$$", "status": "Open • Closes 7:30 PM", "website": "", "phone": "", "tags": ["Cafe", "Museum", "Outdoor"], "image": UNSPLASH_PHOTOS["cafe"][2], "lat": 28.6165, "lng": 77.2420, "distance_km": None},
        ]
        # Filter by category if specified
        if category and category != "All":
            filtered = [p for p in static_places if p["category"] == category]
            if filtered:
                static_places = filtered
        return {
            "query": q,
            "category": category,
            "results": static_places,
            "limit": limit,
            "count": len(static_places),
            "ai_summary": f"Showing curated results for {q}. Enable Google Places API for live search results.",
            "fallback": True
        }

    if user_coords:
        transformed_results.sort(key=lambda p: p.get("distance_km", 999999))

    ai_summary = ""
    if settings.GEMINI_API_KEY and q.strip() and not is_generic:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = f"Provide a brief, engaging, 2-3 sentence travel guide summary about '{q}'. Focus on what it is known for, best places to visit, food, and attractions."
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            if response.text:
                ai_summary = response.text
        except Exception as e:
            print("Gemini AI summary exception:", e)

    return {
        "query": q,
        "category": category,
        "results": transformed_results,
        "limit": limit,
        "count": len(transformed_results),
        "ai_summary": ai_summary
    }


@router.get("/trending")
def get_trending_cities():
    # Return premium Indian cities data for the LandingView
    return {
        "cities": [
            {"id": "del", "name": "New Delhi", "desc": "Cultural capital with historic monuments and premium dining.", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/India_Gate_in_New_Delhi_03-2016.jpg/640px-India_Gate_in_New_Delhi_03-2016.jpg"},
            {"id": "mum", "name": "Mumbai", "desc": "The city of dreams, marine drive, and vibrant nightlife.", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Mumbai_03-2016_30_Gateway_of_India.jpg/640px-Mumbai_03-2016_30_Gateway_of_India.jpg"},
            {"id": "goa", "name": "Goa", "desc": "Sun, sand, and sea. Explore premium beachfront resorts.", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Baga_Beach%2C_Goa.jpg/640px-Baga_Beach%2C_Goa.jpg"},
            {"id": "blr", "name": "Bangalore", "desc": "Silicon Valley of India with a stunning cafe culture.", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Vidhana_Soudha_Bangalore.jpg/640px-Vidhana_Soudha_Bangalore.jpg"},
            {"id": "jai", "name": "Jaipur", "desc": "The Pink City famous for royal palaces and heritage stays.", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Hawa_Mahal%2C_Jaipur%2C_India.jpg/640px-Hawa_Mahal%2C_Jaipur%2C_India.jpg"},
            {"id": "hyd", "name": "Hyderabad", "desc": "Historic city of pearls known for its legendary Biryani.", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Charminar_on_13_June_2010.jpg/640px-Charminar_on_13_June_2010.jpg"}
        ]
    }
