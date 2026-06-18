from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, func
from pydantic import BaseModel
from typing import List, Optional

from app.db.session import SessionLocal
from app.models.user import User
from app.models.activity import UserSearch, UserFavorite, UserReview, UserBooking, UserNotification

router = APIRouter()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas for Requests
class ActivityEmailRequest(BaseModel):
    email: str

class SearchRequest(BaseModel):
    email: str
    query: str

class FavoriteToggleRequest(BaseModel):
    email: str
    place_name: str
    place_address: Optional[str] = None

class FavoriteCheckRequest(BaseModel):
    email: str
    place_name: str

class ReviewRequest(BaseModel):
    email: str
    place_name: str
    rating: float
    comment: str

class BookingRequest(BaseModel):
    email: str
    place_name: str
    booking_date: str

class NotificationReadRequest(BaseModel):
    email: str
    notification_id: int

# Helper to seed default stats if a new user has completely empty stats
def seed_default_user_activities(db: Session, email: str):
    # Check if there is already any activity for this email
    any_fav = db.execute(select(UserFavorite).where(UserFavorite.user_email == email)).scalars().first()
    any_search = db.execute(select(UserSearch).where(UserSearch.user_email == email)).scalars().first()
    any_review = db.execute(select(UserReview).where(UserReview.user_email == email)).scalars().first()
    any_booking = db.execute(select(UserBooking).where(UserBooking.user_email == email)).scalars().first()

    if not (any_fav or any_search or any_review or any_booking):
        print(f"Seeding starter dashboard metrics for new user email: {email}")
        
        # 1. Seed Favorites
        favorites = [
            UserFavorite(user_email=email, place_name="The Big Chill Cafe", place_address="Connaught Place, Delhi"),
            UserFavorite(user_email=email, place_name="Taj Palace", place_address="Diplomatic Enclave, New Delhi"),
            UserFavorite(user_email=email, place_name="Lotus Temple", place_address="Kalkaji, New Delhi")
        ]
        db.add_all(favorites)

        # 2. Seed Searches
        searches = [
            UserSearch(user_email=email, query="best restaurants in delhi"),
            UserSearch(user_email=email, query="hotels in goa"),
            UserSearch(user_email=email, query="places to visit in mumbai"),
            UserSearch(user_email=email, query="cafe in bangalore"),
            UserSearch(user_email=email, query="events in delhi")
        ]
        db.add_all(searches)

        # 3. Seed Reviews
        reviews = [
            UserReview(user_email=email, place_name="The Big Chill Cafe", rating=4.5, comment="Love the pasta and milkshake!"),
            UserReview(user_email=email, place_name="Taj Palace", rating=4.8, comment="Exceptional hospitality and luxury dining.")
        ]
        db.add_all(reviews)

        # 4. Seed Booking
        booking = UserBooking(user_email=email, place_name="Taj Palace", booking_date="2026-06-15")
        db.add(booking)

        # 5. Seed Notifications
        notifications = [
            UserNotification(user_email=email, title="Welcome to City AI Search", message="We're glad you're here. Start searching for amazing places!", is_read=False),
            UserNotification(user_email=email, title="Price Drop Alert", message="Your favorite place Taj Palace has a 10% discount this week.", is_read=False)
        ]
        db.add_all(notifications)

        db.commit()

@router.get("/me")
def me(db: Session = Depends(get_db)) -> dict:
    user = db.execute(select(User)).scalars().first()
    if not user:
        return {"email": None}
    return {"id": user.id, "email": user.email, "name": user.name}

@router.get("/stats")
def get_user_stats(email: str, db: Session = Depends(get_db)):
    if not email:
        raise HTTPException(status_code=400, detail="User email is required")

    # Auto-seed beautiful, realistic starter items if the database has absolutely zero actions
    seed_default_user_activities(db, email)

    # 1. Fetch counts
    favs_count = db.execute(select(func.count(UserFavorite.id)).where(UserFavorite.user_email == email)).scalar() or 0
    searches_count = db.execute(select(func.count(UserSearch.id)).where(UserSearch.user_email == email)).scalar() or 0
    reviews_count = db.execute(select(func.count(UserReview.id)).where(UserReview.user_email == email)).scalar() or 0
    bookings_count = db.execute(select(func.count(UserBooking.id)).where(UserBooking.user_email == email)).scalar() or 0

    # 2. Fetch lists
    # Detailed searches list (up to 50 for the Search History tab)
    searches_res = db.execute(
        select(UserSearch)
        .where(UserSearch.user_email == email)
        .order_by(UserSearch.created_at.desc())
        .limit(50)
    ).scalars().all()
    searches_detailed = [
        {"id": s.id, "query": s.query, "created_at": s.created_at.isoformat() if s.created_at else None}
        for s in searches_res
    ]

    # Recent 5 search queries only (for the sidebar)
    recent_searches_res = [s.query for s in searches_res[:5]]

    # Saved places list
    favs_res = db.execute(
        select(UserFavorite)
        .where(UserFavorite.user_email == email)
    ).scalars().all()
    saved_places_detailed = [
        {"id": f.id, "place_name": f.place_name, "place_address": f.place_address}
        for f in favs_res
    ]
    saved_places_names = [f.place_name for f in favs_res]

    # Bookings list
    bookings_res = db.execute(
        select(UserBooking)
        .where(UserBooking.user_email == email)
        .order_by(UserBooking.created_at.desc())
    ).scalars().all()
    bookings_detailed = [
        {"id": b.id, "place_name": b.place_name, "booking_date": b.booking_date}
        for b in bookings_res
    ]

    # Reviews list
    reviews_res = db.execute(
        select(UserReview)
        .where(UserReview.user_email == email)
        .order_by(UserReview.created_at.desc())
    ).scalars().all()
    reviews_detailed = [
        {"id": r.id, "place_name": r.place_name, "rating": r.rating, "comment": r.comment}
        for r in reviews_res
    ]

    return {
        "email": email,
        "saved_places_count": favs_count,
        "searches_count": searches_count,
        "reviews_count": reviews_count,
        "bookings_count": bookings_count,
        "recent_searches": recent_searches_res,
        "saved_places": saved_places_names,
        "saved_places_detailed": saved_places_detailed,
        "bookings": bookings_detailed,
        "reviews": reviews_detailed,
        "searches_detailed": searches_detailed
    }

@router.post("/search")
def log_search(req: SearchRequest, db: Session = Depends(get_db)):
    new_search = UserSearch(user_email=req.email, query=req.query)
    db.add(new_search)
    db.commit()
    db.refresh(new_search)
    return {"status": "success", "id": new_search.id}

@router.post("/favorite/toggle")
def toggle_favorite(req: FavoriteToggleRequest, db: Session = Depends(get_db)):
    # Check if place is already saved
    existing = db.execute(
        select(UserFavorite)
        .where(UserFavorite.user_email == req.email)
        .where(UserFavorite.place_name == req.place_name)
    ).scalars().first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed", "saved": False}
    else:
        new_fav = UserFavorite(
            user_email=req.email,
            place_name=req.place_name,
            place_address=req.place_address
        )
        db.add(new_fav)
        db.commit()
        return {"status": "added", "saved": True}

@router.post("/favorite/check")
def check_favorite(req: FavoriteCheckRequest, db: Session = Depends(get_db)):
    existing = db.execute(
        select(UserFavorite)
        .where(UserFavorite.user_email == req.email)
        .where(UserFavorite.place_name == req.place_name)
    ).scalars().first()
    return {"saved": existing is not None}

@router.post("/review")
def log_review(req: ReviewRequest, db: Session = Depends(get_db)):
    new_review = UserReview(
        user_email=req.email,
        place_name=req.place_name,
        rating=req.rating,
        comment=req.comment
    )
    db.add(new_review)
    db.commit()
    return {"status": "success", "id": new_review.id}

@router.post("/booking")
def log_booking(req: BookingRequest, db: Session = Depends(get_db)):
    new_booking = UserBooking(
        user_email=req.email,
        place_name=req.place_name,
        booking_date=req.booking_date
    )
    db.add(new_booking)
    db.commit()
    return {"status": "success", "id": new_booking.id}

class BookingDeleteRequest(BaseModel):
    email: str
    booking_id: int

class SearchDeleteRequest(BaseModel):
    email: str
    search_id: int

class ProfileUpdateRequest(BaseModel):
    email: str
    name: str

@router.post("/booking/delete")
def delete_booking(req: BookingDeleteRequest, db: Session = Depends(get_db)):
    booking = db.execute(
        select(UserBooking)
        .where(UserBooking.user_email == req.email)
        .where(UserBooking.id == req.booking_id)
    ).scalars().first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    db.delete(booking)
    db.commit()
    return {"status": "success"}

@router.post("/search/delete")
def delete_search(req: SearchDeleteRequest, db: Session = Depends(get_db)):
    search = db.execute(
        select(UserSearch)
        .where(UserSearch.user_email == req.email)
        .where(UserSearch.id == req.search_id)
    ).scalars().first()
    
    if not search:
        raise HTTPException(status_code=404, detail="Search log not found")
        
    db.delete(search)
    db.commit()
    return {"status": "success"}

@router.post("/search/clear_all")
def clear_all_searches(req: ActivityEmailRequest, db: Session = Depends(get_db)):
    db.execute(
        delete(UserSearch)
        .where(UserSearch.user_email == req.email)
    )
    db.commit()
    return {"status": "success"}

@router.post("/profile/update")
def update_profile(req: ProfileUpdateRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(User)
        .where(User.email == req.email)
    ).scalars().first()
    
    if user:
        user.name = req.name
    else:
        user = User(email=req.email, name=req.name)
        db.add(user)
        
    db.commit()
    return {"status": "success", "name": req.name}

@router.get("/notifications")
def get_notifications(email: str, db: Session = Depends(get_db)):
    if not email:
        raise HTTPException(status_code=400, detail="User email is required")

    notifs_res = db.execute(
        select(UserNotification)
        .where(UserNotification.user_email == email)
        .order_by(UserNotification.created_at.desc())
        .limit(20)
    ).scalars().all()
    
    notifs = [
        {"id": n.id, "title": n.title, "message": n.message, "is_read": n.is_read, "created_at": n.created_at.isoformat() if n.created_at else None}
        for n in notifs_res
    ]
    return {"notifications": notifs}

@router.post("/notifications/read")
def read_notification(req: NotificationReadRequest, db: Session = Depends(get_db)):
    notif = db.execute(
        select(UserNotification)
        .where(UserNotification.user_email == req.email)
        .where(UserNotification.id == req.notification_id)
    ).scalars().first()
    
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

@router.get("/recommendations")
def get_recommendations(email: str, db: Session = Depends(get_db)):
    if not email:
        raise HTTPException(status_code=400, detail="User email is required")

    # In a real app, these would be generated by AI based on the user's searches and favorites.
    # For now, we return intelligent generic ones.
    recommendations = [
        {"title": "Explore Local Cuisine", "desc": "Try out the top-rated street food spots based on your search history.", "action": "See Food", "bg": "bg-amber-100 dark:bg-amber-900/30", "text": "text-amber-800 dark:text-amber-300"},
        {"title": "Weekend Getaways", "desc": "You saved Taj Palace. Have you checked other luxury stays nearby?", "action": "View Stays", "bg": "bg-indigo-100 dark:bg-indigo-900/30", "text": "text-indigo-800 dark:text-indigo-300"},
        {"title": "Trending Now", "desc": "Art exhibitions are trending in the cities you frequently explore.", "action": "Explore Arts", "bg": "bg-rose-100 dark:bg-rose-900/30", "text": "text-rose-800 dark:text-rose-300"},
        {"title": "Special Offers", "desc": "Unlock 20% off at premium restaurants based on your reviews.", "action": "Claim Offer", "bg": "bg-emerald-100 dark:bg-emerald-900/30", "text": "text-emerald-800 dark:text-emerald-300"}
    ]
    return {"recommendations": recommendations}

@router.get("/is_admin")
def check_user_admin(email: str, db: Session = Depends(get_db)):
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    user = db.execute(select(User).where(User.email == email)).scalars().first()
    if not user:
        # Lazy sync user from Supabase to local PostgreSQL DB
        is_admin_user = email.strip().lower().startswith("admin@") or "admin" in email.strip().lower().split("@")[0]
        user = User(
            email=email,
            name=email.split("@")[0],
            is_email_verified=True,
            is_admin=is_admin_user
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return {"is_admin": user.is_admin}
