"""A small example to copy when adding your team's endpoints."""
from fastapi import APIRouter, Query

router = APIRouter()

@router.get("/hello")
def hello(name: str = Query(default="Alex", min_length=1, max_length=80)) -> dict[str, str]:
    return {"message": f"Hello, {name}! Your frontend and backend are connected."}
