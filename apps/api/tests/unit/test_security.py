from app.core.security import (
    generate_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_password_is_hashed_and_verified():
    password = "StrongPassword123!"

    password_hash = hash_password(password)

    assert password_hash.startswith("$argon2id$")
    assert password_hash != password
    assert verify_password(password, password_hash)


def test_wrong_password_is_rejected():
    password_hash = hash_password("StrongPassword123!")

    assert not verify_password("WrongPassword123!", password_hash)


def test_invalid_password_hash_is_rejected():
    assert not verify_password("any-password", "invalid-hash")


def test_generated_tokens_are_unique():
    assert generate_token() != generate_token()


def test_token_hash_is_deterministic():
    token = generate_token()

    assert hash_token(token) == hash_token(token)
    assert hash_token(token) != token
    assert len(hash_token(token)) == 64
