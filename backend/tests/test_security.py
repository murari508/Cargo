from app.auth.security import (
    create_access_token,
    create_reset_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hashing():
    plain = "MySecretPassword123"
    hashed = hash_password(plain)

    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_access_token_creation_and_decoding():
    user_id = 42
    role = "customer"
    token = create_access_token(user_id=user_id, role=role)

    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_token(token, expected_type="access")
    assert payload is not None
    assert payload["sub"] == str(user_id)
    assert payload["role"] == role
    assert payload["type"] == "access"


def test_invalid_token_type():
    token = create_access_token(user_id=99, role="admin")
    # Asking for expected_type="reset" on an access token must return None
    payload = decode_token(token, expected_type="reset")
    assert payload is None


def test_reset_token():
    user_id = 7
    token = create_reset_token(user_id=user_id)

    payload = decode_token(token, expected_type="reset")
    assert payload is not None
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "reset"
