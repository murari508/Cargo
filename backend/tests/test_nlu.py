from app.services import nlu


def test_detect_language_english():
    lang = nlu.detect_language("Show me available SUVs in Hyderabad for weekend")
    assert lang == "en"


def test_detect_language_telugu_script():
    lang = nlu.detect_language("నాకు హైదరాబాద్ లో ఒక కారు కావాలి")
    assert lang == "te"


def test_detect_language_hindi_script():
    lang = nlu.detect_language("मुझे तीन दिन के लिए एक कार चाहिए")
    assert lang == "hi"


def test_detect_language_tenglish():
    lang = nlu.detect_language("Hyderabad lo 5 seater car kavali")
    assert lang == "te"


def test_detect_language_hinglish():
    lang = nlu.detect_language("Mujhe Goa trip ke liye automatic gadi chahiye")
    assert lang == "hi"


def test_parse_suv_intent():
    intent, slots = nlu.parse("I need an automatic SUV under 3000 in Hyderabad")
    assert intent == "search_cars"
    assert slots.category == "SUV"
    assert slots.transmission == "Automatic"
    assert slots.location == "Hyderabad"
    assert slots.max_price == 3000.0


def test_parse_7seater_telugu():
    intent, slots = nlu.parse("Hyderabad lo 7 seater car chupinchandi")
    assert intent == "search_cars"
    assert slots.seats == 7
    assert slots.location == "Hyderabad"


def test_parse_dates_tomorrow():
    intent, slots = nlu.parse("Book a hatchback tomorrow for 3 days")
    assert slots.category == "Hatchback"
    assert slots.rental_days == 3
    assert slots.pickup_date is not None
