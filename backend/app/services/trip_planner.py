"""Road-trip planning from a curated route table, with a sensible generic
fallback for destinations that aren't in the table yet."""
from __future__ import annotations

ROUTES = {
    ("Hyderabad", "Goa"): {
        "distance_km": 660,
        "stops": ["Zaheerabad", "Solapur", "Belagavi", "Anmod Ghat"],
        "highlights": ["Palolem beach", "Old Goa churches", "Dudhsagar falls",
                       "Anjuna flea market", "Fontainhas Latin quarter"],
        "notes": ["NH65 and NH48 are four-lane for most of the drive.",
                  "Break the drive at Belagavi if you start after noon.",
                  "Carry the rental papers — Goa checkposts ask for them."],
    },
    ("Hyderabad", "Bengaluru"): {
        "distance_km": 570,
        "stops": ["Kurnool", "Anantapur", "Chikballapur"],
        "highlights": ["Lepakshi temple", "Nandi Hills sunrise", "Cubbon Park"],
        "notes": ["NH44 the whole way, roughly 8 hours with two breaks."],
    },
    ("Hyderabad", "Vijayawada"): {
        "distance_km": 275,
        "stops": ["Suryapet", "Nandigama"],
        "highlights": ["Kanaka Durga temple", "Undavalli caves", "Bhavani Island"],
        "notes": ["NH65 is fast; an easy one-tank round trip."],
    },
    ("Hyderabad", "Tirupati"): {
        "distance_km": 560,
        "stops": ["Kurnool", "Kadapa"],
        "highlights": ["Tirumala darshan", "Talakona falls", "Chandragiri fort"],
        "notes": ["Book darshan slots before you leave.",
                  "Ghat road to Tirumala closes to private vehicles at night."],
    },
    ("Hyderabad", "Visakhapatnam"): {
        "distance_km": 620,
        "stops": ["Suryapet", "Rajahmundry", "Annavaram"],
        "highlights": ["Araku Valley", "Borra caves", "RK Beach", "Kailasagiri"],
        "notes": ["Leave Araku before dusk — the ghat road is unlit."],
    },
    ("Hyderabad", "Pune"): {
        "distance_km": 560,
        "stops": ["Zaheerabad", "Solapur"],
        "highlights": ["Shaniwar Wada", "Sinhagad fort", "Aga Khan Palace"],
        "notes": ["NH65 to Solapur, then NH65/NH48 into Pune."],
    },
}

DAY_SHAPES = {
    "en": ["Drive out and settle in", "Full day exploring", "Local sights at an easy pace",
           "Day trip from base", "Drive back"],
    "te": ["ప్రయాణం మొదలు, విశ్రాంతి", "పూర్తి రోజు చుట్టిరావడం", "స్థానిక ప్రదేశాలు",
           "సమీప ప్రాంతాలకు ట్రిప్", "తిరుగు ప్రయాణం"],
    "hi": ["सफर की शुरुआत और आराम", "पूरे दिन घूमना", "आसपास की जगहें",
           "पास के इलाके की सैर", "वापसी"],
}


def _route(origin: str, destination: str) -> dict:
    key = (origin.title(), destination.title())
    if key in ROUTES:
        return ROUTES[key]
    reverse = (destination.title(), origin.title())
    if reverse in ROUTES:
        r = dict(ROUTES[reverse])
        r["stops"] = list(reversed(r["stops"]))
        return r
    return {
        "distance_km": None,
        "stops": [],
        "highlights": [f"{destination} city centre", f"Popular viewpoints around {destination}",
                       "Local food streets"],
        "notes": ["Confirm road conditions before a long drive.",
                  "Keep fuel above a quarter tank on highway stretches."],
    }


def build(origin: str, destination: str, days: int, lang: str = "en") -> dict:
    route = _route(origin, destination)
    highlights = route["highlights"] or ["Explore the town"]
    shapes = DAY_SHAPES.get(lang, DAY_SHAPES["en"])
    itinerary = []
    for d in range(1, days + 1):
        if d == 1:
            title = shapes[0]
            stops = [f"Break at {s}" for s in route["stops"][:2]]
            items = [f"{origin} → {destination}"] + stops + [highlights[0]]
        elif d == days and days > 1:
            title = shapes[4]
            stops = [f"Stop at {s}" for s in route["stops"][-1:]]
            items = [f"{destination} → {origin}"] + stops
        else:
            title = shapes[min(d - 1, 3)]
            items = highlights[(d - 1) % len(highlights):(d - 1) % len(highlights) + 2] or highlights
        itinerary.append({"day": d, "title": title, "items": items})
    return {
        "origin": origin,
        "destination": destination,
        "duration": days,
        "language": lang,
        "itinerary": itinerary,
        "stops": route["stops"],
        "distance_km": route["distance_km"],
        "notes": route["notes"],
    }


def recommended_category(days: int, passengers: int, distance_km: int | None) -> str:
    if passengers >= 6:
        return "MUV"
    if (distance_km or 0) > 400 or days >= 3:
        return "SUV"
    return "Sedan"
