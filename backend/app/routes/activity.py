from fastapi import APIRouter

router = APIRouter(
    prefix="/activities",
    tags=["Activity Management"]
)


@router.get("/")
def get_all_activities():
    return [
        {
            "message": "Activity module is working"
        }
    ]