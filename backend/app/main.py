import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router as api_router
from app.ws.battle_ws import router as ws_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Pokemon Arena API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
