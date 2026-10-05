"""Database viewer utility for CarGo.

Clean, aligned, non-wrapping database table viewer.
Fits standard terminal widths to prevent 'zig-zag' broken text.

Usage:
    python view_db.py             # Show overview & recent records of all tables
    python view_db.py users       # Show all registered users & driving licences
    python view_db.py bookings    # Show all bookings, references, licences & amounts
    python view_db.py cars        # Show fleet cars (default 15)
    python view_db.py cars all    # Show all fleet cars
    python view_db.py tracking    # Show live GPS car tracking and trip routes
"""
import os
import sys

# Ensure backend directory is in python path regardless of where command is run
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
PARENT_DIR = os.path.dirname(CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

try:
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from app.database import SessionLocal
from app.models import Booking, Car, User


def print_banner(title: str):
    width = 90
    print("\n" + "=" * width)
    print(f"  {title.center(width - 4)}")
    print("=" * width)


def truncate(text: str, max_len: int) -> str:
    s = str(text or "").strip()
    return (s[: max_len - 2] + "..") if len(s) > max_len else s


def view_summary():
    db = SessionLocal()
    try:
        cars_count = db.query(Car).count()
        bookings_count = db.query(Booking).count()
        users_count = db.query(User).count()
        active_trips = db.query(Booking).filter(Booking.booking_status == "active").count()
        verified_dl = db.query(User).filter(User.driving_license.isnot(None), User.driving_license != "").count()

        print_banner("CARGO DATABASE SUMMARY")
        print(f"  * Total Fleet Vehicles       : {cars_count} cars available across hubs")
        print(f"  * Total Customer Bookings    : {bookings_count} ({active_trips} currently active on road)")
        print(f"  * Registered Users Accounts  : {users_count} ({verified_dl} with verified Driving Licences)")
        print(f"  * Connected Database         : MySQL 'cargo' on localhost:3306")
    finally:
        db.close()


def view_users():
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.id.asc()).all()
        print_banner(f"USERS TABLE ({len(users)} Total Accounts)")
        
        # Fit inside 88 chars width
        fmt = "{:<4} | {:<16} | {:<25} | {:<10} | {:<16} | {:<8}"
        sep = "-" * 88
        
        print(fmt.format("ID", "Full Name", "Email", "Phone", "Driving Licence", "Role"))
        print(sep)
        for u in users:
            role = u.role.value if hasattr(u.role, "value") else str(u.role)
            dl = u.driving_license if u.driving_license else "(No DL yet)"
            print(
                fmt.format(
                    u.id,
                    truncate(u.full_name, 16),
                    truncate(u.email, 25),
                    truncate(u.phone, 10),
                    truncate(dl, 16),
                    truncate(role, 8),
                )
            )
        print(sep)
    finally:
        db.close()


def view_bookings():
    db = SessionLocal()
    try:
        bookings = db.query(Booking).order_by(Booking.id.desc()).all()
        print_banner(f"BOOKINGS TABLE ({len(bookings)} Total Bookings)")

        fmt = "{:<4} | {:<11} | {:<18} | {:<10} | {:<15} | {:<9} | {:<10}"
        sep = "-" * 90

        print(fmt.format("ID", "Reference", "Vehicle", "Status", "Driving Licence", "Total", "Dates"))
        print(sep)
        for b in bookings:
            car_name = f"{b.car.brand} {b.car.model}" if b.car else f"Car #{b.car_id}"
            status = b.booking_status.value if hasattr(b.booking_status, "value") else str(b.booking_status)
            dl = b.driving_license or "(None)"
            dates = f"{b.pickup_date.strftime('%d-%b')} to {b.return_date.strftime('%d-%b')}" if hasattr(b.pickup_date, 'strftime') else f"{b.pickup_date}"
            price_str = f"Rs.{int(b.total_amount)}"
            print(
                fmt.format(
                    b.id,
                    b.booking_reference,
                    truncate(car_name, 18),
                    truncate(status, 10),
                    truncate(dl, 15),
                    truncate(price_str, 9),
                    truncate(dates, 10),
                )
            )
        print(sep)
    finally:
        db.close()


def view_cars(limit: int = 15):
    db = SessionLocal()
    try:
        total = db.query(Car).count()
        query = db.query(Car).order_by(Car.id.asc())
        if limit > 0:
            cars = query.limit(limit).all()
            title = f"FLEET CARS (Showing first {len(cars)} of {total} vehicles)"
        else:
            cars = query.all()
            title = f"FLEET CARS (All {total} vehicles)"

        print_banner(title)

        fmt = "{:<4} | {:<14} | {:<16} | {:<10} | {:<9} | {:<10} | {:<12}"
        sep = "-" * 88

        print(fmt.format("ID", "Brand", "Model", "Category", "Fuel", "Price/Day", "City Hub"))
        print(sep)
        for c in cars:
            price_str = f"Rs.{int(c.price_per_day)}"
            print(
                fmt.format(
                    c.id,
                    truncate(c.brand, 14),
                    truncate(c.model, 16),
                    truncate(c.category, 10),
                    truncate(c.fuel_type, 9),
                    truncate(price_str, 10),
                    truncate(c.location, 12),
                )
            )
        print(sep)
        if limit > 0 and total > limit:
            print(f"  -> Tip: Run 'python view_db.py cars all' to see all {total} cars.")
    finally:
        db.close()


def view_tracking():
    db = SessionLocal()
    try:
        bookings = db.query(Booking).order_by(Booking.id.desc()).all()
        print_banner("FLEET GPS TRACKING & ACTIVE ROUTES")
        for b in bookings:
            car_name = f"{b.car.brand} {b.car.model}" if b.car else f"Car #{b.car_id}"
            user_name = b.user.full_name if b.user else f"User #{b.user_id}"
            status = b.booking_status.value if hasattr(b.booking_status, "value") else str(b.booking_status)
            dl = b.driving_license or "(Pending verification)"
            safe_route = (b.trip_route or "Direct").replace("→", "->")

            print(f"\n  [{b.booking_reference}] {car_name}  --  STATUS: {status.upper()}")
            print(f"    Renter           : {user_name} (Licence: {dl})")
            print(f"    Destination      : {b.destination or b.return_location}")
            print(f"    Current Location : {b.current_location or (b.pickup_location + ' Hub')}")
            print(
                f"    Telemetry        : {b.distance_travelled_km} km | "
                f"Speed: {b.speed_kmh} km/h | Fuel/Battery: {b.fuel_or_battery_level}%"
            )
            print(f"    Route Points     : {truncate(safe_route, 70)}")
    finally:
        db.close()


def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "summary"
    sub_arg = sys.argv[2].lower() if len(sys.argv) > 2 else ""

    if target in ("summary", "overview"):
        view_summary()
        view_users()
        view_bookings()
        view_cars(8)
    elif target in ("users", "user"):
        view_users()
    elif target in ("bookings", "booking", "orders"):
        view_bookings()
    elif target in ("cars", "car", "fleet"):
        limit = 0 if sub_arg in ("all", "0", "-1") else (int(sub_arg) if sub_arg.isdigit() else 15)
        view_cars(limit)
    elif target in ("tracking", "locations", "routes", "gps"):
        view_tracking()
    elif target in ("all",):
        view_summary()
        view_users()
        view_bookings()
        view_tracking()
        view_cars(15)
    elif target in ("help", "-h", "--help"):
        print_banner("CARGO DATABASE VIEWER - HELP")
        print("  Available commands:")
        print("    python view_db.py              # Show summary & recent records of all tables")
        print("    python view_db.py users        # Show all users with Driving Licences")
        print("    python view_db.py bookings     # Show all bookings & references")
        print("    python view_db.py cars         # Show first 15 cars")
        print("    python view_db.py cars all     # Show all 59 cars")
        print("    python view_db.py tracking     # Show live trip tracking & GPS")
        print("    python view_db.py all          # Show complete database dump")
    else:
        # Fallback to summary
        view_summary()
        view_users()
        view_bookings()
        view_cars(8)


if __name__ == "__main__":
    main()
