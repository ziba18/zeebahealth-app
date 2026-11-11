import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_health_consent
from app.models.user import User
from app.models.record import HealthRecord
from app.schemas.record import (
    MAX_RECORDS_PER_USER,
    RecordCreate,
    RecordListResponse,
    RecordResponse,
    RecordUpdate,
)

router = APIRouter(prefix="/records", tags=["records"])


def _to_response(row: HealthRecord) -> RecordResponse:
    return RecordResponse(
        id=row.id,
        kind=row.kind,
        data=json.loads(row.data),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _get_owned(db: Session, user: User, record_id: str) -> HealthRecord:
    row = (
        db.query(HealthRecord)
        .filter(HealthRecord.id == record_id, HealthRecord.user_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return row


PAGE_SIZE = 500


def _parse_cursor(after: str | None) -> tuple[datetime, str] | None:
    if not after:
        return None
    stamp, sep, last_id = after.partition("|")
    try:
        return datetime.fromisoformat(stamp), last_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cursor")


@router.get("", response_model=RecordListResponse)
def list_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    after: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=PAGE_SIZE, ge=1, le=PAGE_SIZE),
):
    """One page of the user's records, oldest first. `next_cursor` is set while there are more:
    pass it back as `after`. Pages keep each response small however long someone has used the app."""
    if not isinstance(limit, int):  # called directly (tests) rather than through FastAPI
        after, limit = None, PAGE_SIZE
    query = db.query(HealthRecord).filter(HealthRecord.user_id == current_user.id)
    cursor = _parse_cursor(after)
    if cursor:
        stamp, last_id = cursor
        query = query.filter(or_(
            HealthRecord.created_at > stamp,
            and_(HealthRecord.created_at == stamp, HealthRecord.id > last_id),
        ))
    rows = query.order_by(HealthRecord.created_at.asc(), HealthRecord.id.asc()).limit(limit + 1).all()
    more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = f"{rows[-1].created_at.isoformat()}|{rows[-1].id}" if more and rows else None
    return RecordListResponse(records=[_to_response(r) for r in rows], next_cursor=next_cursor)


@router.post("", response_model=RecordResponse, status_code=201, dependencies=[Depends(require_health_consent)])
def create_record(
    body: RecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(HealthRecord).filter(HealthRecord.user_id == current_user.id).count()
    if count >= MAX_RECORDS_PER_USER:
        raise HTTPException(status_code=409, detail="Record limit reached")
    row = HealthRecord(user_id=current_user.id, kind=body.kind, data=json.dumps(body.data))
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_response(row)


@router.put("/{record_id}", response_model=RecordResponse, dependencies=[Depends(require_health_consent)])
def update_record(
    record_id: str,
    body: RecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _get_owned(db, current_user, record_id)
    row.data = json.dumps(body.data)
    db.commit()
    db.refresh(row)
    return _to_response(row)


@router.delete("/{record_id}", status_code=204)
def delete_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _get_owned(db, current_user, record_id)
    db.delete(row)
    db.commit()
    return Response(status_code=204)
