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
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# Pydantic Schemas for requests
class BroadcastNotificationRequest(BaseModel):
    title: str
    message: str

class UserToggleAdminRequest(BaseModel):
    user_id: int

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    # Counts
    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    total_searches = db.execute(select(func.count(UserSearch.id))).scalar() or 0
    total_bookings = db.execute(select(func.count(UserBooking.id))).scalar() or 0
    total_reviews = db.execute(select(func.count(UserReview.id))).scalar() or 0

    # Average rating
    avg_rating = db.execute(select(func.avg(UserReview.rating))).scalar() or 0.0
    avg_rating = round(float(avg_rating), 1)

    # Top search queries
    top_queries_res = db.execute(
        select(UserSearch.query, func.count(UserSearch.id).label("cnt"))
        .group_by(UserSearch.query)
        .order_by(func.count(UserSearch.id).desc())
        .limit(5)
    ).all()
    
    top_queries = [
        {"query": q, "count": count}
        for q, count in top_queries_res
    ]

    # Combined recent activities
    recent_searches = db.execute(select(UserSearch).order_by(UserSearch.created_at.desc()).limit(5)).scalars().all()
    recent_bookings = db.execute(select(UserBooking).order_by(UserBooking.created_at.desc()).limit(5)).scalars().all()
    recent_reviews = db.execute(select(UserReview).order_by(UserReview.created_at.desc()).limit(5)).scalars().all()

    activities = []
    for s in recent_searches:
        activities.append({
            "type": "search",
            "desc": f"User {s.user_email} searched for '{s.query}'",
            "time": s.created_at.isoformat() if s.created_at else None
        })
    for b in recent_bookings:
        activities.append({
            "type": "booking",
            "desc": f"User {b.user_email} booked '{b.place_name}' for {b.booking_date}",
            "time": b.created_at.isoformat() if b.created_at else None
        })
    for r in recent_reviews:
        activities.append({
            "type": "review",
            "desc": f"User {r.user_email} rated '{r.place_name}' ★{r.rating}",
            "time": r.created_at.isoformat() if r.created_at else None
        })

    # Sort activities by time descending
    activities.sort(key=lambda x: x["time"] or "", reverse=True)
    activities = activities[:8]

    return {
        "total_users": total_users,
        "total_searches": total_searches,
        "total_bookings": total_bookings,
        "total_reviews": total_reviews,
        "average_rating": avg_rating,
        "top_queries": top_queries,
        "recent_activities": activities
    }

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users_res = db.execute(select(User).order_by(User.created_at.desc())).scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "is_email_verified": u.is_email_verified,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users_res
    ]

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cascade delete searches, favorites, etc manually if they exist
    db.execute(delete(UserSearch).where(UserSearch.user_email == user.email))
    db.execute(delete(UserFavorite).where(UserFavorite.user_email == user.email))
    db.execute(delete(UserReview).where(UserReview.user_email == user.email))
    db.execute(delete(UserBooking).where(UserBooking.user_email == user.email))
    db.execute(delete(UserNotification).where(UserNotification.user_email == user.email))

    db.delete(user)
    db.commit()
    return {"status": "success"}

@router.post("/users/toggle-admin")
def toggle_user_admin(req: UserToggleAdminRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == req.user_id)).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = not user.is_admin
    db.commit()
    return {"status": "success", "is_admin": user.is_admin}

@router.get("/searches")
def get_searches(db: Session = Depends(get_db)):
    searches_res = db.execute(select(UserSearch).order_by(UserSearch.created_at.desc()).limit(100)).scalars().all()
    return [
        {
            "id": s.id,
            "user_email": s.user_email,
            "query": s.query,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in searches_res
    ]

@router.get("/reviews")
def get_reviews(db: Session = Depends(get_db)):
    reviews_res = db.execute(select(UserReview).order_by(UserReview.created_at.desc())).scalars().all()
    return [
        {
            "id": r.id,
            "user_email": r.user_email,
            "place_name": r.place_name,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in reviews_res
    ]

@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.execute(select(UserReview).where(UserReview.id == review_id)).scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"status": "success"}

@router.get("/bookings")
def get_bookings(db: Session = Depends(get_db)):
    bookings_res = db.execute(select(UserBooking).order_by(UserBooking.created_at.desc())).scalars().all()
    return [
        {
            "id": b.id,
            "user_email": b.user_email,
            "place_name": b.place_name,
            "booking_date": b.booking_date,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }
        for b in bookings_res
    ]

@router.delete("/bookings/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.execute(select(UserBooking).where(UserBooking.id == booking_id)).scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    db.delete(booking)
    db.commit()
    return {"status": "success"}

@router.post("/notifications/broadcast")
def broadcast_notification(req: BroadcastNotificationRequest, db: Session = Depends(get_db)):
    users = db.execute(select(User.email)).scalars().all()
    if not users:
        return {"status": "success", "recipients": 0}

    notifications = [
        UserNotification(
            user_email=email,
            title=req.title,
            message=req.message,
            is_read=False
        )
        for email in users
    ]
    db.add_all(notifications)
    db.commit()
    return {"status": "success", "recipients": len(users)}
