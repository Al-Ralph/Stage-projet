import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from api.routers import chat

load_dotenv()

app = FastAPI(title="RCW Chat API", version="1.0.0")

# CORS: ajuste origins en prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"name": "RCW Chat API", "status": "ok"}

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])