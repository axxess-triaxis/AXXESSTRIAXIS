from fastapi import FastAPI, APIRouter, HTTPException, Query, Header
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from email_service import send_email, render_waitlist_confirmation  # noqa: E402

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="TriAxis Ventures API")
api_router = APIRouter(prefix="/api")


def _require_admin(token: Optional[str], header_token: Optional[str]) -> None:
    expected = os.environ.get("ADMIN_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="admin_token_not_configured")
    provided = (token or header_token or "").strip()
    if provided != expected:
        raise HTTPException(status_code=401, detail="invalid_admin_token")


# ---------- Models ----------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class ContactInquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    organization: Optional[str] = Field(default=None, max_length=180)
    inquiry_type: str = Field(default="general", max_length=60)
    message: str = Field(min_length=1, max_length=4000)


class ContactInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    organization: Optional[str] = None
    inquiry_type: str = "general"
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WaitlistCreate(BaseModel):
    email: EmailStr
    platform: str = Field(default="both", pattern="^(ios|android|both)$")
    source: str = Field(default="hero", max_length=40)


class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    platform: str = "both"
    source: str = "hero"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "TriAxis Ventures", "status": "operational"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


@api_router.post("/contact", response_model=ContactInquiry)
async def create_contact(inquiry: ContactInquiryCreate):
    obj = ContactInquiry(**inquiry.model_dump())
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    try:
        await db.contact_inquiries.insert_one(doc)
    except Exception as e:
        logging.exception("Failed to persist contact inquiry")
        raise HTTPException(status_code=500, detail="Failed to submit inquiry") from e
    return obj


@api_router.get("/contact", response_model=List[ContactInquiry])
async def list_contacts(limit: int = 100):
    docs = await db.contact_inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for d in docs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs


@api_router.post("/waitlist", response_model=WaitlistEntry)
async def join_waitlist(entry: WaitlistCreate):
    obj = WaitlistEntry(**entry.model_dump())
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    try:
        # dedupe by email — update or insert
        await db.waitlist.update_one(
            {"email": obj.email},
            {"$set": doc},
            upsert=True,
        )
    except Exception as e:
        logging.exception("Failed to persist waitlist entry")
        raise HTTPException(status_code=500, detail="Failed to join waitlist") from e

    # Fire-and-forget confirmation email (no-op if RESEND_API_KEY is empty).
    subject, html, text = render_waitlist_confirmation(obj.email, obj.platform)
    try:
        await send_email(to=obj.email, subject=subject, html=html, text=text)
    except Exception:  # never let email failures break the API
        logging.exception("Confirmation email dispatch failed for %s", obj.email)

    return obj


@api_router.get("/waitlist/count")
async def waitlist_count():
    total = await db.waitlist.count_documents({})
    return {"total": total}


@api_router.get("/waitlist", response_model=List[WaitlistEntry])
async def list_waitlist(
    limit: int = 500,
    token: Optional[str] = Query(default=None),
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _require_admin(token, x_admin_token)
    docs = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for d in docs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs


@api_router.get("/waitlist/export.csv", response_class=PlainTextResponse)
async def export_waitlist_csv(
    token: Optional[str] = Query(default=None),
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _require_admin(token, x_admin_token)
    docs = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["email", "platform", "source", "created_at", "id"])
    for d in docs:
        writer.writerow([
            d.get("email", ""),
            d.get("platform", ""),
            d.get("source", ""),
            d.get("created_at", ""),
            d.get("id", ""),
        ])
    return PlainTextResponse(
        content=buf.getvalue(),
        headers={
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="triaxis-waitlist.csv"',
        },
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
