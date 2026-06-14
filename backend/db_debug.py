import sys
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.activity import UserSearch

db = SessionLocal()
email = "avinashne2207@gmail.com"

try:
    # 1. Row count
    count = db.execute(select(func.count(UserSearch.id)).where(UserSearch.user_email == email)).scalar()
    print("Row count via count query:", count)

    # 2. Raw query
    res = db.execute(select(UserSearch).where(UserSearch.user_email == email)).scalars().all()
    print("Fetched objects count:", len(res))
    if res:
        print("First object details:")
        print("ID:", res[0].id)
        print("Email:", res[0].user_email)
        print("Query:", res[0].query)
        print("Created At:", res[0].created_at)

    # 3. Sorted query
    res_sorted = db.execute(
        select(UserSearch)
        .where(UserSearch.user_email == email)
        .order_by(UserSearch.created_at.desc())
    ).scalars().all()
    print("Fetched sorted objects count:", len(res_sorted))

except Exception as e:
    print("ERROR DURING TEST:", e)
finally:
    db.close()
