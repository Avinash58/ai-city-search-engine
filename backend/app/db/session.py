from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import socket

from app.core.settings import settings

database_url = settings.DATABASE_URL

# Auto-detect if PostgreSQL is running. If not, gracefully fallback to local SQLite for robust local-first reliability.
if "postgresql" in database_url:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect(("localhost", 5432))
        s.close()
    except Exception:
        print("[Database Auto-Detect]: PostgreSQL on port 5432 was not reachable. Falling back to robust local SQLite database.")
        database_url = "sqlite:///./cityai.db"

connect_args = {}
if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

