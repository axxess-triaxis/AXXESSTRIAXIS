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
from datetime import datetime, timezone, timedelta


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


class AnalyticsEventCreate(BaseModel):
    type: str = Field(pattern="^(pageview|dwell|section_view)$")
    session_id: str = Field(min_length=6, max_length=64)
    path: str = Field(default="/", max_length=250)
    referrer: Optional[str] = Field(default=None, max_length=500)
    device: Optional[str] = Field(default=None, pattern="^(mobile|tablet|desktop)$")
    section: Optional[str] = Field(default=None, max_length=80)
    dwell_ms: Optional[int] = Field(default=None, ge=0, le=6 * 60 * 60 * 1000)


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


# ---------- Analytics endpoints ----------
def _norm_referrer(ref: Optional[str]) -> str:
    if not ref:
        return "direct"
    try:
        from urllib.parse import urlparse
        host = urlparse(ref).netloc.lower()
        if not host:
            return "direct"
        # strip common trackers
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception:
        return "direct"


@api_router.post("/analytics/event")
async def create_analytics_event(event: AnalyticsEventCreate):
    doc = event.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["ts"] = datetime.now(timezone.utc).isoformat()
    doc["referrer_host"] = _norm_referrer(event.referrer)
    try:
        await db.analytics_events.insert_one(doc)
    except Exception:
        logging.exception("Failed to persist analytics event")
        # never break the beacon
        return {"ok": False}
    return {"ok": True}


@api_router.get("/analytics/summary")
async def analytics_summary(
    days: int = Query(default=7, ge=1, le=90),
    token: Optional[str] = Query(default=None),
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _require_admin(token, x_admin_token)
    now = datetime.now(timezone.utc)

    # ---------- helpers ----------
    def _iso_days_ago(n: int) -> str:
        return (now - timedelta(days=n)).isoformat()

    def _iso_minutes_ago(n: int) -> str:
        return (now - timedelta(minutes=n)).isoformat()

    since_iso = _iso_days_ago(days)

    # Total pageviews (all time)
    total_pageviews = await db.analytics_events.count_documents({"type": "pageview"})
    total_pageviews_window = await db.analytics_events.count_documents(
        {"type": "pageview", "ts": {"$gte": since_iso}}
    )

    # Unique sessions in window
    unique_sessions_pipeline = [
        {"$match": {"type": "pageview", "ts": {"$gte": since_iso}}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "n"},
    ]
    us_res = await db.analytics_events.aggregate(unique_sessions_pipeline).to_list(1)
    unique_sessions_window = us_res[0]["n"] if us_res else 0

    # Live (last 5 min)
    active_5m_pipeline = [
        {"$match": {"ts": {"$gte": _iso_minutes_ago(5)}}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "n"},
    ]
    live_res = await db.analytics_events.aggregate(active_5m_pipeline).to_list(1)
    active_now = live_res[0]["n"] if live_res else 0

    # Avg dwell (window, seconds)
    dwell_pipeline = [
        {"$match": {"type": "dwell", "ts": {"$gte": since_iso}}},
        {"$group": {"_id": None, "avg": {"$avg": "$dwell_ms"}, "n": {"$sum": 1}}},
    ]
    d_res = await db.analytics_events.aggregate(dwell_pipeline).to_list(1)
    avg_dwell_seconds = round((d_res[0]["avg"] / 1000.0), 1) if d_res and d_res[0].get("avg") else 0

    # Device breakdown (window)
    device_pipeline = [
        {"$match": {"type": "pageview", "ts": {"$gte": since_iso}}},
        {"$group": {"_id": {"$ifNull": ["$device", "desktop"]}, "n": {"$sum": 1}}},
    ]
    devices = {"mobile": 0, "tablet": 0, "desktop": 0}
    async for row in db.analytics_events.aggregate(device_pipeline):
        key = row.get("_id") or "desktop"
        if key in devices:
            devices[key] = row["n"]

    # Top referrers (window)
    ref_pipeline = [
        {"$match": {"type": "pageview", "ts": {"$gte": since_iso}}},
        {"$group": {"_id": "$referrer_host", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 8},
    ]
    top_referrers = []
    async for row in db.analytics_events.aggregate(ref_pipeline):
        top_referrers.append({"referrer": row.get("_id") or "direct", "count": row["n"]})

    # Top sections (window)
    section_pipeline = [
        {"$match": {"type": "section_view", "ts": {"$gte": since_iso}, "section": {"$ne": None}}},
        {"$group": {"_id": "$section", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 12},
    ]
    top_sections = []
    async for row in db.analytics_events.aggregate(section_pipeline):
        top_sections.append({"section": row["_id"], "count": row["n"]})

    # Daily time series (window)
    daily_pipeline = [
        {"$match": {"type": "pageview", "ts": {"$gte": since_iso}}},
        {
            "$group": {
                "_id": {"$substrBytes": ["$ts", 0, 10]},  # YYYY-MM-DD
                "pageviews": {"$sum": 1},
                "sessions_set": {"$addToSet": "$session_id"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "date": "$_id",
                "pageviews": 1,
                "sessions": {"$size": "$sessions_set"},
            }
        },
        {"$sort": {"date": 1}},
    ]
    by_day_map = {row["date"]: row async for row in db.analytics_events.aggregate(daily_pipeline)}

    # Fill zero-days so the chart is contiguous
    by_day: list[dict] = []
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        row = by_day_map.get(d) or {"date": d, "pageviews": 0, "sessions": 0}
        by_day.append({"date": d, "pageviews": row.get("pageviews", 0), "sessions": row.get("sessions", 0)})

    return {
        "window_days": days,
        "total_pageviews_all_time": total_pageviews,
        "total_pageviews": total_pageviews_window,
        "unique_sessions": unique_sessions_window,
        "active_now": active_now,
        "avg_dwell_seconds": avg_dwell_seconds,
        "devices": devices,
        "top_referrers": top_referrers,
        "top_sections": top_sections,
        "by_day": by_day,
        "generated_at": now.isoformat(),
    }


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
