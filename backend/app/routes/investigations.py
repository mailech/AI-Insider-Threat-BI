from fastapi import APIRouter, HTTPException

from app.database import get_connection

router = APIRouter(
    prefix="/investigations",
    tags=["Investigations"],
)


@router.get("/")
def get_investigations():
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM investigations
        ORDER BY id
        """
    ).fetchall()

    connection.close()

    return {
        "items": [dict(row) for row in rows],
        "total": len(rows),
    }


@router.get("/{investigation_id}")
def get_investigation(investigation_id: str):
    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM investigations
        WHERE id = ?
        """,
        (investigation_id,),
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    return dict(row)