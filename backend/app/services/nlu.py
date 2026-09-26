"""Multilingual understanding for the CarGo assistant.

Handles English, Telugu, Hindi and the romanised code-switched forms people
actually speak (Hinglish, Tenglish). Everything runs server-side and needs no
API key; if LLM_PROVIDER is configured, `enrich()` is where a hosted model
would be called to refine the slots this rules engine produces.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Optional

TELUGU_RANGE = (0x0C00, 0x0C7F)
DEVANAGARI_RANGE = (0x0900, 0x097F)

SPEECH_CODES = {"en": "en-IN", "te": "te-IN", "hi": "hi-IN"}

# --- romanised cues, how people actually type/speak ---------------------------
TE_CUES = {
    "kavali", "kaavali", "chupinchandi", "chupinchu", "cheyyi", "cheyandi",
    "nuchi", "nunchi", "ki", "lo", "unna", "unnaya", "enni", "ela", "naaku",
    "naku", "meeru", "manchi", "rojulu", "roju", "veyyi", "vela", "vandalu",
    "kaaru", "karu", "baaga", "cheppandi", "kaavaali",
}
HI_CUES = {
    "mujhe", "chahiye", "dikhao", "dikhaiye", "karo", "kijiye", "hai", "hain",
    "kitna", "kitne", "kaun", "achha", "acha", "din", "gadi", "gaadi", "sasta",
    "mein", "mera", "meri", "aur", "nahi", "haan", "rupaye", "rupay", "hazar",
    "hazaar", "chalo", "batao",
}

CATEGORY_WORDS = {
    "SUV": ["suv", "ఎస్యూవీ", "एसयूवी"],
    "Sedan": ["sedan", "సెడాన్", "सेडान"],
    "Hatchback": ["hatchback", "hatch", "small car", "చిన్న కారు", "छोटी कार", "chinna car"],
    "MUV": ["muv", "mpv", "innova", "7 seater", "seven seater", "tempo"],
    "Luxury": ["luxury", "premium car", "లగ్జరీ", "लक्जरी"],
    "Off-road": ["off road", "offroad", "thar", "4x4", "jeep"],
}
TRANSMISSION_WORDS = {
    "Automatic": ["automatic", "auto gear", "ఆటోమేటిక్", "ऑटोमैटिक", "ऑटोमेटिक"],
    "Manual": ["manual", "gear wala", "మాన్యువల్", "मैनुअल"],
}
FUEL_WORDS = {
    "Petrol": ["petrol", "పెట్రోల్", "पेट्रोल"],
    "Diesel": ["diesel", "డీజిల్", "डीजल"],
    "CNG": ["cng", "సీఎన్జీ", "सीएनजी"],
    "Electric": ["electric", "ev", "ఎలక్ట్రిక్", "इलेक्ट्रिक"],
    "Hybrid": ["hybrid"],
}
CITIES = [
    "Hyderabad", "Bengaluru", "Bangalore", "Chennai", "Mumbai", "Pune", "Delhi",
    "Vijayawada", "Visakhapatnam", "Warangal", "Goa", "Tirupati", "Kochi",
    "Jaipur", "Kolkata", "Ahmedabad", "Nagpur", "Coimbatore", "Mysuru",
]
CITY_ALIASES = {
    "hyd": "Hyderabad", "హైదరాబాద్": "Hyderabad", "हैदराबाद": "Hyderabad",
    "బెంగళూరు": "Bengaluru", "बेंगलुरु": "Bengaluru", "bangalore": "Bengaluru",
    "గోవా": "Goa", "गोवा": "Goa", "vizag": "Visakhapatnam",
    "విజయవాడ": "Vijayawada", "चेन्नई": "Chennai", "చెన్నై": "Chennai",
    "मुंबई": "Mumbai", "ముంబై": "Mumbai", "दिल्ली": "Delhi",
    "తిరుపతి": "Tirupati", "तिरुपति": "Tirupati",
}

NUM_WORDS = {
    # english
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    # telugu (script + romanised)
    "ఒకటి": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5, "ఆరు": 6, "ఏడు": 7,
    "ఏడు": 7, "ఎనిమిది": 8, "తొమ్మిది": 9, "పది": 10, "పన్నెండు": 12,
    "okati": 1, "rendu": 2, "moodu": 3, "mudu": 3, "nalugu": 4, "aidu": 5,
    "aidugurki": 5, "ఐదుగురికి": 5, "aaru": 6, "edu": 7, "padi": 10,
    # hindi
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5, "छह": 6, "सात": 7,
    "आठ": 8, "नौ": 9, "दस": 10, "बारह": 12,
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5, "chhe": 6,
    "saat": 7, "aath": 8, "nau": 9, "das": 10,
}

# words that already carry "for N people" in one token
PEOPLE_TOKENS = {"ఐదుగురికి": 5, "నలుగురికి": 4, "ముగ్గురికి": 3, "ఆరుగురికి": 6,
                 "ఏడుగురికి": 7, "iddariki": 2, "mugguriki": 3, "naluguriki": 4,
                 "aiduguriki": 5}
THOUSAND_WORDS = ["thousand", "k", "hazar", "hazaar", "हजार", "हज़ार",
                  "vela", "velu", "veyyi", "వేల", "వేలు", "వెయ్యి"]

INTENT_TRIP = ["trip", "plan", "itinerary", "ప్రయాణ", "ట్రిప్", "प्लान", "यात्रा", "ट्रिप",
               "tour", "ghumne", "vacation", "holiday"]
INTENT_BOOK = ["book", "booking", "reserve", "బుక్", "बुक", "करा दो", "book cheyyi",
               "confirm", "కన్ఫర్మ్"]
INTENT_CANCEL = ["cancel", "రద్దు", "రద్దు చేయి", "रद्द", "cancel cheyyi"]
INTENT_BOOKINGS = ["my bookings", "na bookings", "meri booking", "నా బుకింగ్", "मेरी बुकिंग"]
INTENT_GREET = ["hello", "hi ", "hey", "namaste", "నమస్కారం", "नमस्ते", "hai andi"]
INTENT_HELP = ["help", "what can you do", "సహాయం", "मदद"]

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4,
    "saturday": 5, "sunday": 6, "somvar": 0, "shukravar": 4, "shanivar": 5,
    "ravivar": 6, "శుక్రవారం": 4, "శనివారం": 5, "ఆదివారం": 6,
    "शुक्रवार": 4, "शनिवार": 5, "रविवार": 6,
}


@dataclass
class Slots:
    location: Optional[str] = None
    category: Optional[str] = None
    seats: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    max_price: Optional[float] = None
    min_price: Optional[float] = None
    pickup_date: Optional[date] = None
    return_date: Optional[date] = None
    rental_days: Optional[int] = None
    destination: Optional[str] = None
    origin: Optional[str] = None

    def merge(self, other: "Slots") -> "Slots":
        """Newly heard values win; previously collected ones are kept."""
        merged = Slots(**asdict(self))
        for k, v in asdict(other).items():
            if v is not None:
                setattr(merged, k, v)
        return merged


def _script_counts(text: str) -> tuple[int, int]:
    te = hi = 0
    for ch in text:
        cp = ord(ch)
        if TELUGU_RANGE[0] <= cp <= TELUGU_RANGE[1]:
            te += 1
        elif DEVANAGARI_RANGE[0] <= cp <= DEVANAGARI_RANGE[1]:
            hi += 1
    return te, hi


def detect_language(text: str) -> str:
    """Script first, then romanised cue words. Falls back to English."""
    te, hi = _script_counts(text)
    if te or hi:
        return "te" if te >= hi else "hi"
    words = set(re.findall(r"[a-z']+", text.lower()))
    te_hits = len(words & TE_CUES)
    hi_hits = len(words & HI_CUES)
    if te_hits == 0 and hi_hits == 0:
        return "en"
    return "te" if te_hits >= hi_hits else "hi"


def _find_number_before(text: str, keywords: list[str]) -> Optional[int]:
    for kw in keywords:
        m = re.search(r"(\d+)\s*(?:-|\s)?\s*" + re.escape(kw), text)
        if m:
            return int(m.group(1))
        for word, val in NUM_WORDS.items():
            if re.search(re.escape(word) + r"\s+\w{0,12}\s{0,1}" + re.escape(kw), text):
                return val
    return None


def _parse_budget(text: str) -> Optional[float]:
    t = text.lower().replace(",", "")
    # "under 3000", "3000 ke andar", "10 thousand", "padi vela"
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(" + "|".join(map(re.escape, THOUSAND_WORDS)) + r")\b", t):
        return float(m.group(1)) * 1000
    for word, val in NUM_WORDS.items():
        for tw in THOUSAND_WORDS:
            if re.search(re.escape(word.lower()) + r"[\s-]*" + re.escape(tw.lower()), t):
                return float(val) * 1000
    m = re.search(r"(?:under|below|less than|within|budget|max|upto|up to|"
                  r"से कम|के अंदर|बजट|లోపు|బడ్జెట్|lopu)\D{0,12}(\d{3,7})", t)
    if m:
        return float(m.group(1))
    m = re.search(r"(?:rs\.?|₹|rupees|rupaye|rupayalu)\s*(\d{3,7})", t)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d{3,7})\s*(?:rupees|rupaye|rupayalu|रुपये|రూపాయలు|per day|rojuki|roz)", t)
    if m:
        return float(m.group(1))
    return None


def _parse_seats(text: str) -> Optional[int]:
    t = text.lower()
    for token, val in PEOPLE_TOKENS.items():
        if token.lower() in t:
            return val
    n = _find_number_before(t, ["seater", "seat", "seats", "సీటర్", "सीटर",
                                "people", "persons", "passengers", "మంది",
                                "గురికి", "log", "logon", "लोगों", "व्यक्ति"])
    if n and 2 <= n <= 12:
        return n
    for word, val in NUM_WORDS.items():
        if re.search(re.escape(word) + r"\s*(?:seater|people|persons|మంది|गुरु|लोगों)", t):
            return val
    return None


def _parse_days(text: str) -> Optional[int]:
    t = text.lower()
    n = _find_number_before(t, ["days", "day", "nights", "రోజుల", "రోజు",
                                "rojulu", "roju", "din", "dino", "दिन", "दिनों"])
    if n and 1 <= n <= 60:
        return n
    for word, val in NUM_WORDS.items():
        if re.search(re.escape(word) + r"[\s-]*(?:days?|rojulu?|din|दिन|రోజుల)", t):
            return val
    if re.search(r"weekend|వీకెండ్|वीकेंड", t):
        return 2
    return None


def _next_weekday(today: date, weekday: int) -> date:
    delta = (weekday - today.weekday()) % 7
    return today + timedelta(days=delta or 7)


def _parse_dates(text: str, days: Optional[int], today: date) -> tuple[Optional[date], Optional[date]]:
    t = text.lower()
    start = None
    if re.search(r"\btomorrow\b|kal\b|కల\b|రేపు|कल\b", t):
        start = today + timedelta(days=1)
    elif re.search(r"\btoday\b|आज|ఈరోజు|ee roju", t):
        start = today
    elif re.search(r"next week|अगले हफ्ते|వచ్చే వారం", t):
        start = today + timedelta(days=7)
    else:
        for name, wd in WEEKDAYS.items():
            if re.search(r"\b" + re.escape(name) + r"\b", t):
                start = _next_weekday(today, wd)
                break
    iso = re.findall(r"(\d{4}-\d{2}-\d{2})", t)
    if iso:
        start = date.fromisoformat(iso[0])
    end = None
    if len(iso) > 1:
        end = date.fromisoformat(iso[1])
    # "friday to sunday"
    found = [(m.start(), WEEKDAYS[w]) for w in WEEKDAYS
             for m in re.finditer(r"\b" + re.escape(w) + r"\b", t)]
    if len(found) >= 2 and end is None:
        found.sort()
        start = _next_weekday(today, found[0][1])
        end = _next_weekday(start, found[1][1])
    if start and end is None and days:
        end = start + timedelta(days=days - 1)
    return start, end


def _match_word_map(text: str, mapping: dict[str, list[str]]) -> Optional[str]:
    t = text.lower()
    for value, words in mapping.items():
        for w in words:
            if re.search(r"(?<![a-z])" + re.escape(w.lower()) + r"s?(?![a-z])", t):
                return value
    return None


def _parse_cities(text: str) -> tuple[Optional[str], Optional[str]]:
    """Returns (origin, destination_or_location)."""
    t = text.lower()
    hits: list[tuple[int, str]] = []
    for city in CITIES:
        for m in re.finditer(r"(?<![a-z])" + city.lower() + r"(?![a-z])", t):
            hits.append((m.start(), "Bengaluru" if city == "Bangalore" else city))
    for alias, city in CITY_ALIASES.items():
        for m in re.finditer(re.escape(alias.lower()), t):
            hits.append((m.start(), city))
    if not hits:
        return None, None
    hits.sort()
    seen: list[tuple[int, str]] = []
    for pos, city in hits:
        if not any(c == city for _, c in seen):
            seen.append((pos, city))
    if len(seen) == 1:
        return None, seen[0][1]
    # "A nunchi B ki", "A se B", "A to B"
    return seen[0][1], seen[1][1]


def detect_intent(text: str) -> str:
    t = " " + text.lower() + " "
    def has(words): return any(w.lower() in t for w in words)
    if has(INTENT_CANCEL):
        return "cancel_booking"
    if has(INTENT_BOOKINGS):
        return "my_bookings"
    if has(INTENT_TRIP):
        return "trip_plan"
    if has(INTENT_BOOK):
        return "book_car"
    if has(INTENT_GREET) and len(t.split()) <= 4:
        return "greet"
    if has(INTENT_HELP) and len(t.split()) <= 6:
        return "help"
    return "search_cars"


def parse(text: str, today: date | None = None) -> tuple[str, Slots]:
    today = today or date.today()
    text = unicodedata.normalize("NFC", text).strip()
    intent = detect_intent(text)
    origin, place = _parse_cities(text)
    days = _parse_days(text)
    pickup, ret = _parse_dates(text, days, today)
    if pickup and ret and not days:
        days = (ret - pickup).days + 1
    slots = Slots(
        category=_match_word_map(text, CATEGORY_WORDS),
        transmission=_match_word_map(text, TRANSMISSION_WORDS),
        fuel_type=_match_word_map(text, FUEL_WORDS),
        seats=_parse_seats(text),
        max_price=_parse_budget(text),
        rental_days=days,
        pickup_date=pickup,
        return_date=ret,
    )
    if intent == "trip_plan":
        slots.origin = origin or "Hyderabad"
        slots.destination = place
        slots.location = origin or "Hyderabad"
    else:
        slots.location = place
        slots.origin = origin
    # an SUV for 5 people implies a 5+ seater, not exactly 5
    if slots.seats and slots.seats > 7:
        slots.seats = None
    return intent, slots


def enrich(text: str, intent: str, slots: Slots) -> tuple[str, Slots]:
    """Hook for a hosted LLM. With LLM_PROVIDER=rules (the default) the
    deterministic parser above is used as-is, which keeps the assistant free,
    offline and predictable."""
    from app.config import settings
    if settings.llm_provider == "rules" or not settings.llm_api_key:
        return intent, slots
    raise NotImplementedError("Plug your LLM client in here, server-side only.")
