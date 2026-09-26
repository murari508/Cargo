from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    u_cols = [c[0] for c in conn.execute(text('DESCRIBE users')).fetchall()]
    if 'driving_license' not in u_cols:
        conn.execute(text("ALTER TABLE users ADD COLUMN driving_license VARCHAR(50) DEFAULT NULL AFTER phone"))
        print("Added driving_license to users table")
    else:
        print("driving_license already exists in users table")

    b_cols = [c[0] for c in conn.execute(text('DESCRIBE bookings')).fetchall()]
    if 'driving_license' not in b_cols:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN driving_license VARCHAR(50) NOT NULL DEFAULT '' AFTER return_time"))
        print("Added driving_license to bookings table")
    else:
        print("driving_license already exists in bookings table")
