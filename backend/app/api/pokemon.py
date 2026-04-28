import json

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/pokemon", tags=["pokemon"])


def _load_pokemon() -> dict:
    with open("app/data/pokemon.json") as f:
        return json.load(f)


@router.get("")
async def list_pokemon():
    return list(_load_pokemon().values())


@router.get("/{pokemon_id}")
async def get_pokemon(pokemon_id: str):
    data = _load_pokemon()
    if pokemon_id not in data:
        raise HTTPException(status_code=404, detail="Pokemon not found")
    return data[pokemon_id]
