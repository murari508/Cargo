from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    b_cols = [c[0] for c in conn.execute(text('DESCRIBE bookings')).fetchall()]
    if 'license_image_url' not in b_cols:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN license_image_url VARCHAR(255) NOT NULL DEFAULT '' AFTER driving_license"))
        print("Added license_image_url to bookings table")
    else:
        print("license_image_url already in bookings")

    u_cols = [c[0] for c in conn.execute(text('DESCRIBE users')).fetchall()]
    if 'license_image_url' not in u_cols:
        conn.execute(text("ALTER TABLE users ADD COLUMN license_image_url VARCHAR(255) NOT NULL DEFAULT '' AFTER driving_license"))
        print("Added license_image_url to users table")
    else:
        print("license_image_url already in users")
