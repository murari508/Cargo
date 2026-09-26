"""Database viewer utility for CarGo.

Run this script to inspect database tables and data directly:
    python view_db.py cars
    python view_db.py bookings
    python view_db.py tracking
    python view_db.py users
    python view_db.py all
"""
import sys
try:
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from app.database import SessionLocal
from app.models import Car, Booking, User


def print_separator(title: str):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def view_summary():
    db = SessionLocal()
    try:
        cars_count = db.query(Car).count()
        bookings_count = db.query(Booking).count()
        users_count = db.query(User).count()
        active_trips = db.query(Booking).filter(Booking.booking_status == 'active').count()

        print_separator("DATABASE OVERVIEW (Database: cargo)")
        print(f"Total Fleet Cars  : {cars_count}")
        print(f"Total Bookings    : {bookings_count} ({active_trips} currently on road)")
        print(f"Registered Users  : {users_count}")
    finally:
        db.close()


def view_cars(limit: int = 15):
    db = SessionLocal()
    try:
        cars = db.query(Car).order_by(Car.id.asc()).limit(limit).all()
        total = db.query(Car).count()
        print_separator(f"CARS TABLE (Showing first {len(cars)} of {total} vehicles)")
        header = f"{'ID':<4} | {'Brand':<15} | {'Model':<16} | {'Fuel':<10} | {'Price/Day':<10} | {'Location':<12}"
        print(header)
        print("-" * len(header))
        for c in cars:
            print(
                f"{c.id:<4} | {c.brand:<15} | {c.model:<16} | {c.fuel_type:<10} | "
                f"Rs.{int(c.price_per_day):<6} | {c.location:<12}"
            )
        if total > limit:
            print(f"\n... and {total - limit} more cars. (Total: {total})")
    finally:
        db.close()


def view_bookings():
    db = SessionLocal()
    try:
        bookings = db.query(Booking).order_by(Booking.id.desc()).all()
        print_separator(f"BOOKINGS TABLE ({len(bookings)} Total Bookings)")
        header = f"{'ID':<3} | {'Ref':<12} | {'Car':<18} | {'Status':<10} | {'Dates':<23} | {'Amount':<9}"
        print(header)
        print("-" * len(header))
        for b in bookings:
            car_name = f"{b.car.brand} {b.car.model}" if b.car else f"Car #{b.car_id}"
            dates = f"{b.pickup_date} to {b.return_date}"
            status = b.booking_status.value if hasattr(b.booking_status, 'value') else str(b.booking_status)
            print(
                f"{b.id:<3} | {b.booking_reference:<12} | {car_name:<18} | "
                f"{status:<10} | {dates:<23} | Rs.{int(b.total_amount):<5}"
            )
    finally:
        db.close()


def view_tracking():
    db = SessionLocal()
    try:
        bookings = db.query(Booking).order_by(Booking.id.desc()).all()
        print_separator("CAR LOCATIONS & WHERE PEOPLE WENT (Trip Tracking)")
        for b in bookings:
            car_name = f"{b.car.brand} {b.car.model}" if b.car else f"Car #{b.car_id}"
            user_name = b.user.full_name if b.user else f"User #{b.user_id}"
            status = b.booking_status.value if hasattr(b.booking_status, 'value') else str(b.booking_status)
            print(f"\n[{b.booking_reference}] {car_name} ({status.upper()})")
            print(f"  Renter        : {user_name}")
            print(f"  Destination   : {b.destination or 'Local'}")
            print(f"  Current Loc   : {b.current_location}")
            print(
                f"  Distance      : {b.distance_travelled_km} km | "
                f"Speed: {b.speed_kmh} km/h | Battery/Fuel: {b.fuel_or_battery_level}%"
            )
            safe_route = (b.trip_route or 'Direct').replace('→', '->')
            print(f"  Route Checkpoints: {safe_route}")
    finally:
        db.close()


def view_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print_separator(f"USERS TABLE ({len(users)} Total Accounts)")
        header = f"{'ID':<3} | {'Full Name':<18} | {'Email':<24} | {'Role':<10} | {'Phone':<12}"
        print(header)
        print("-" * len(header))
        for u in users:
            role = u.role.value if hasattr(u.role, 'value') else str(u.role)
            print(f"{u.id:<3} | {u.full_name:<18} | {u.email:<24} | {role:<10} | {u.phone:<12}")
    finally:
        db.close()


if __name__ == "__main__":
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    if target == "cars":
        view_cars(30)
    elif target == "bookings":
        view_bookings()
    elif target in ("tracking", "locations"):
        view_tracking()
    elif target == "users":
        view_users()
    else:
        view_summary()
        view_tracking()
        view_bookings()
        view_cars(10)
        view_users()
