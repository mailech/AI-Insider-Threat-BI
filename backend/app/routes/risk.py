from fastapi import APIRouter

router = APIRouter(
    prefix="/risk",
    tags=["Risk Management"]
)


@router.get("/")
def get_all_risks():
    return [
        {
            "message": "Risk module is working"
        }
    ]