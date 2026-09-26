"""Reply text in English, Telugu and Hindi. Kept out of the router so the
wording can be edited without touching the logic."""
from app.services.nlu import Slots

MISSING_LABEL = {
    "en": {"location": "pickup city", "pickup_date": "pickup date",
           "return_date": "return date", "pickup_time": "pickup time",
           "destination": "destination"},
    "te": {"location": "పికప్ నగరం", "pickup_date": "పికప్ తేదీ",
           "return_date": "రిటర్న్ తేదీ", "pickup_time": "పికప్ సమయం",
           "destination": "గమ్యస్థానం"},
    "hi": {"location": "पिकअप शहर", "pickup_date": "पिकअप तारीख",
           "return_date": "वापसी तारीख", "pickup_time": "पिकअप समय",
           "destination": "गंतव्य"},
}

GREETING = {
    "en": "Hi, I'm the CarGo assistant. Tell me what you need — say something like "
          "\"an automatic SUV in Hyderabad for three days under ten thousand\".",
    "te": "నమస్కారం, నేను CarGo అసిస్టెంట్‌ని. మీకు ఏం కావాలో చెప్పండి — ఉదాహరణకు "
          "\"హైదరాబాద్‌లో మూడు రోజులకు ఆటోమేటిక్ SUV, బడ్జెట్ పది వేలు\".",
    "hi": "नमस्ते, मैं CarGo असिस्टेंट हूँ। बताइए आपको क्या चाहिए — जैसे "
          "\"हैदराबाद में तीन दिन के लिए ऑटोमैटिक SUV, बजट दस हजार\"।",
}

HELP = {
    "en": "I can find cars, check dates, work out the full price and plan a road trip. "
          "Speak in English, Telugu or Hindi — mixing them is fine.",
    "te": "నేను కార్లను వెతకగలను, తేదీలు చూడగలను, పూర్తి ధరను లెక్కించగలను, "
          "ట్రిప్ ప్లాన్ చేయగలను. ఇంగ్లీష్, తెలుగు లేదా హిందీలో మాట్లాడండి.",
    "hi": "मैं कार ढूँढ सकता हूँ, तारीखें देख सकता हूँ, पूरी कीमत बता सकता हूँ और ट्रिप प्लान "
          "कर सकता हूँ। अंग्रेज़ी, तेलुगु या हिंदी में बोलिए।",
}

NO_RESULTS = {
    "en": "Nothing in the fleet matches that yet. Try a wider budget or a different city.",
    "te": "ఆ వివరాలకు సరిపోయే కార్లు ప్రస్తుతం లేవు. బడ్జెట్ పెంచి లేదా వేరే నగరం చూడండి.",
    "hi": "इन शर्तों पर अभी कोई कार नहीं मिली। बजट बढ़ाइए या दूसरा शहर देखिए।",
}

MY_BOOKINGS = {
    "en": "Opening your bookings.",
    "te": "మీ బుకింగ్‌లను చూపిస్తున్నాను.",
    "hi": "आपकी बुकिंग दिखा रहा हूँ।",
}

CANCEL = {
    "en": "You can cancel from My Bookings — open the booking and choose Cancel booking.",
    "te": "మై బుకింగ్స్ నుండి రద్దు చేయవచ్చు — బుకింగ్ తెరిచి 'Cancel booking' ఎంచుకోండి.",
    "hi": "माय बुकिंग्स से रद्द कर सकते हैं — बुकिंग खोलिए और 'Cancel booking' चुनिए।",
}

CONFIRM_PROMPT = {
    "en": "Would you like to confirm this booking?",
    "te": "ఈ బుకింగ్‌ను నిర్ధారించాలా?",
    "hi": "क्या मैं यह बुकिंग कन्फर्म कर दूँ?",
}


def _join(items: list[str], lang: str) -> str:
    sep = {"en": " and ", "te": " మరియు ", "hi": " और "}[lang]
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + sep + items[-1]


def describe_filters(s: Slots, lang: str) -> str:
    bits = []
    if s.transmission:
        bits.append(s.transmission.lower())
    if s.category:
        bits.append(s.category)
    if s.seats:
        bits.append({"en": f"{s.seats}-seater", "te": f"{s.seats} సీటర్",
                     "hi": f"{s.seats} सीटर"}[lang])
    if s.location:
        bits.append({"en": f"in {s.location}", "te": f"{s.location}లో",
                     "hi": f"{s.location} में"}[lang])
    if s.max_price:
        bits.append({"en": f"under ₹{int(s.max_price):,}/day",
                     "te": f"రోజుకు ₹{int(s.max_price):,} లోపు",
                     "hi": f"₹{int(s.max_price):,} प्रतिदिन के अंदर"}[lang])
    return " ".join(bits)


def search_reply(count: int, s: Slots, lang: str, missing: list[str]) -> str:
    if count == 0:
        return NO_RESULTS[lang]
    desc = describe_filters(s, lang)
    head = {
        "en": f"I found {count} {desc} {'car' if count == 1 else 'cars'} you can book.",
        "te": f"{desc} కార్లు {count} అందుబాటులో ఉన్నాయి.",
        "hi": f"{desc} {count} कार उपलब्ध हैं।",
    }[lang].replace("  ", " ")
    if missing:
        labels = [MISSING_LABEL[lang][m] for m in missing if m in MISSING_LABEL[lang]]
        if labels:
            ask = {
                "en": f" Tell me the {_join(labels, 'en')} and I'll check availability.",
                "te": f" {_join(labels, 'te')} చెబితే అందుబాటును చూస్తాను.",
                "hi": f" {_join(labels, 'hi')} बताइए, मैं उपलब्धता देख लेता हूँ।",
            }[lang]
            return head + ask
    return head


def trip_reply(origin: str, destination: str, days: int, cost: float, lang: str) -> str:
    return {
        "en": f"Here's a {days}-day {origin} to {destination} plan. A suitable rental "
              f"works out to about ₹{int(cost):,} including tax.",
        "te": f"{origin} నుండి {destination}కి {days} రోజుల ప్లాన్ ఇదిగో. తగిన కారు "
              f"పన్నుతో కలిపి సుమారు ₹{int(cost):,} అవుతుంది.",
        "hi": f"{origin} से {destination} की {days} दिन की योजना तैयार है। उपयुक्त कार "
              f"टैक्स सहित लगभग ₹{int(cost):,} की पड़ेगी।",
    }[lang]


def need_destination(lang: str) -> str:
    return {
        "en": "Where would you like to go?",
        "te": "మీరు ఎక్కడికి వెళ్లాలనుకుంటున్నారు?",
        "hi": "आप कहाँ जाना चाहते हैं?",
    }[lang]


def booking_summary(car_name: str, q: dict, pickup, ret, location: str, lang: str) -> str:
    def money(v):
        return f"₹{int(v):,}"
    if lang == "te":
        return (f"కారు: {car_name}\nతేదీలు: {pickup} నుండి {ret} ({q['rental_days']} రోజులు)\n"
                f"స్థలం: {location}\nఅద్దె: {money(q['base_price'])}\n"
                f"పన్నులు: {money(q['taxes'])}\nసేవా రుసుము: {money(q['service_fee'])}\n"
                f"సెక్యూరిటీ డిపాజిట్: {money(q['security_deposit'])}\n"
                f"మొత్తం: {money(q['total_amount'])}\n\n{CONFIRM_PROMPT['te']}")
    if lang == "hi":
        return (f"कार: {car_name}\nतारीखें: {pickup} से {ret} ({q['rental_days']} दिन)\n"
                f"जगह: {location}\nकिराया: {money(q['base_price'])}\n"
                f"टैक्स: {money(q['taxes'])}\nसर्विस फीस: {money(q['service_fee'])}\n"
                f"सिक्योरिटी डिपॉजिट: {money(q['security_deposit'])}\n"
                f"कुल: {money(q['total_amount'])}\n\n{CONFIRM_PROMPT['hi']}")
    return (f"Car: {car_name}\nDates: {pickup} to {ret} ({q['rental_days']} days)\n"
            f"Location: {location}\nRental: {money(q['base_price'])}\n"
            f"Taxes: {money(q['taxes'])}\nService fee: {money(q['service_fee'])}\n"
            f"Security deposit: {money(q['security_deposit'])}\n"
            f"Total: {money(q['total_amount'])}\n\n{CONFIRM_PROMPT['en']}")
