from sqlalchemy.orm import Session
from app.db.database import Base, engine, SessionLocal
from app.models.user import UserDB
from app.utils.auth_utils import get_password_hash

def init_db():
    """Initialize the database."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create a session
    db = SessionLocal()
    
    # Check if admin user already exists
    admin_user = db.query(UserDB).filter(UserDB.username == "admin").first()
    if not admin_user:
        # Create admin user
        hashed_password = get_password_hash("admin123")
        admin_user = UserDB(
            email="admin@example.com",
            username="admin",
            hashed_password=hashed_password,
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created.")
    
    # Close session
    db.close()

if __name__ == "__main__":
    init_db()
