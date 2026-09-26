import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.config import settings
from app.database import Base, engine
from app.routers import (
    admin,
    ai,
    auth,
    bookings,
    cars,
    payments,
    users,
    voice,
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("cargo")


# ============================================================
# LIFESPAN & FASTAPI APPLICATION
# ============================================================

@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting CarGo API...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("CarGo database initialized successfully")
    except SQLAlchemyError as exc:
        logger.exception("Failed to initialize database: %s", exc)
    yield


app = FastAPI(
    title="CarGo API",
    description="""
# CarGo API 🚗

Modern car rental platform for the Indian market.

## Features

- User Registration
- User Login
- Authentication
- Car Search
- Car Details
- Car Bookings
- Payments
- User Dashboard
- My Bookings
- Profile Management
- Admin Dashboard
- Car Management
- Booking Management
- User Management
- AI Assistant
- Voice Assistant
- English Language
- Telugu Language
- Hindi Language

**Your Journey. Your Car.**
""",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# COMMON ERROR RESPONSE
# ============================================================

def error_response(
    status_code: int,
    message: str,
    detail: object = None,
) -> JSONResponse:
    error_obj: dict[str, object] = {
        "status": status_code,
        "message": message,
    }

    if detail is not None:
        error_obj["detail"] = detail

    return JSONResponse(
        status_code=status_code,
        content={"error": error_obj},
    )


# ============================================================
# HTTP EXCEPTION HANDLER
# ============================================================

@app.exception_handler(HTTPException)
async def http_error(
    _request: Request,
    exc: HTTPException,
) -> JSONResponse:
    if isinstance(exc.detail, dict):

        message = exc.detail.get(
            "message",
            "Request failed",
        )

        detail = {
            key: value
            for key, value in exc.detail.items()
            if key != "message"
        }

        return error_response(
            exc.status_code,
            str(message),
            detail if detail else None,
        )

    return error_response(
        exc.status_code,
        str(exc.detail),
    )


# ============================================================
# VALIDATION ERROR HANDLER
# ============================================================

@app.exception_handler(RequestValidationError)
async def validation_error(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    fields = []

    for err in exc.errors():

        location = err.get(
            "loc",
            (),
        )

        # Remove "body", "query", "path", etc.
        field_path = ".".join(
            str(item)
            for item in location[1:]
        )

        fields.append(
            {
                "field": field_path,
                "message": str(
                    err.get(
                        "msg",
                        "Invalid value",
                    )
                ),
            }
        )

    return error_response(
        status.HTTP_400_BAD_REQUEST,
        "Some fields need fixing",
        fields,
    )


# ============================================================
# DATABASE INTEGRITY ERROR
# ============================================================

@app.exception_handler(IntegrityError)
async def integrity_error(
    _request: Request,
    _exc: IntegrityError,
) -> JSONResponse:
    logger.exception(
        "Database integrity error"
    )

    return error_response(
        status.HTTP_409_CONFLICT,
        "That record conflicts with one already saved",
    )


# ============================================================
# SQLALCHEMY DATABASE ERROR
# ============================================================

@app.exception_handler(SQLAlchemyError)
async def database_error(
    _request: Request,
    _exc: SQLAlchemyError,
) -> JSONResponse:
    logger.exception(
        "Database error"
    )

    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Something went wrong on our side",
    )


# ============================================================
# GENERAL ERROR HANDLER
# ============================================================

@app.exception_handler(Exception)
async def general_error(
    _request: Request,
    _exc: Exception,
) -> JSONResponse:
    logger.exception(
        "Unexpected server error"
    )

    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Internal server error",
    )


# ============================================================
# ROUTERS
# ============================================================

routers = [
    auth.router,
    cars.router,
    bookings.router,
    payments.router,
    users.router,
    admin.router,
    ai.router,
    voice.router,
]

for router in routers:
    app.include_router(router)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get(
    "/",
    tags=["Meta"],
)
def root():

    return {
        "service": "CarGo API",
        "version": "1.0.0",
        "status": "running",
        "message": "Welcome to CarGo API",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/api/health",
    tags=["Meta"],
)
def health():

    return {
        "status": "ok",
        "service": "CarGo API",
        "version": "1.0.0",
        "tagline": "Your Journey. Your Car.",
    }


# ============================================================
# API INFORMATION
# ============================================================

@app.get(
    "/api",
    tags=["Meta"],
)
def api_info():

    response: dict[str, object] = {
        "name": "CarGo API",
        "version": "1.0.0",
        "status": "online",
        "features": [
            "Authentication",
            "Cars",
            "Bookings",
            "Payments",
            "Users",
            "Admin",
            "AI Assistant",
            "Voice Assistant",
        ],
        "languages": [
            "English",
            "Telugu",
            "Hindi",
        ],
        "docs": "/docs",
    }
    return response
