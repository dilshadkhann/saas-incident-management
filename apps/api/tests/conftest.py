import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://opshub:opshub@localhost:5432/opshub",
)
os.environ.setdefault(
    "SECRET_KEY",
    "test-only-secret-key-not-for-production",
)
