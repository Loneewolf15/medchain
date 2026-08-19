import os
from sqlalchemy import create_engine, text

def migrate():
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("postgres"):
        # Fix sqlalchemy compatibility with postgres:// vs postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        print(f"Running migrations on PostgreSQL database: {url.split('@')[-1]}")
        engine = create_engine(url)
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE appointments ALTER COLUMN doctor_id DROP NOT NULL;"))
                conn.execute(text("ALTER TABLE appointments ALTER COLUMN scheduled_at DROP NOT NULL;"))
                conn.commit()
                print("Migration successful: doctor_id and scheduled_at are now nullable.")
            except Exception as e:
                print(f"Migration error (might already be nullable): {e}")
    else:
        print("Not using PostgreSQL. Skipping ALTER TABLE. (If SQLite, local db should be recreated).")

if __name__ == "__main__":
    migrate()
