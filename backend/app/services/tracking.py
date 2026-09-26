"""Car location and trip tracking service.

Tracks vehicle coordinates, travel destinations, routes, and checkpoints
so administrators can see where people went with rental vehicles.
"""
from typing import Optional

CITY_COORDINATES: dict[str, tuple[float, float]] = {
    "hyderabad": (17.3850, 78.4867),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "chennai": (13.0827, 80.2707),
    "pune": (18.5204, 73.8567),
    "goa": (15.2993, 74.1240),
    "kolkata": (22.5726, 88.3639),
    "srisailam": (16.0734, 78.8687),
    "coorg": (12.3375, 75.8069),
    "lonavala": (18.7557, 73.4091),
    "tirupati": (13.6288, 79.4192),
    "araku": (18.3273, 82.8775),
    "ooty": (11.4102, 76.6950),
    "mysore": (12.2958, 76.6394),
    "pondicherry": (11.9416, 79.8083),
    "jaipur": (26.9124, 75.7873),
    "chandigarh": (30.7333, 76.7794),
}


def get_city_coordinates(city_name: Optional[str]) -> tuple[float, float]:
    """Return (latitude, longitude) for a city name or a sensible default."""
    if not city_name:
        return (17.3850, 78.4867)
    normalized = city_name.strip().lower()
    for key, coords in CITY_COORDINATES.items():
        if key in normalized:
            return coords
    return (17.3850, 78.4867)


def build_default_route(origin: str, destination: str) -> str:
    """Construct an initial travel route representation."""
    orig = origin.strip() or "Hub"
    dest = destination.strip() or origin
    if orig.lower() == dest.lower():
        return f"{orig} Hub → City Center → Outer Ring Road Checkpoint → {orig} Hub"
    return f"{orig} Hub → Highway Toll Plaza → Scenic Waypoint → {dest}"
