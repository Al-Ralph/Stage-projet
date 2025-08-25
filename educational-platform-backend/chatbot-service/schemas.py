from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Role = Literal["user", "assistant", "system"]

class Message(BaseModel):
    role: Role
    content: str

class OpenAIChatRequest(BaseModel):
    user_question: str = Field(..., description="Dernière question de l'utilisateur")
    chat_history: List[Message] = Field(default_factory=list)
    model: str = Field(default="gpt-4o")
    max_tokens: int = Field(default=2500)
    temperature: float = Field(default=0.7)
    stream: bool = Field(default=False)

class ChatResponse(BaseModel):
    output: str

class OllamaRequest(BaseModel):
    prompt: str
    model: str = Field(default="llama3.2")
    stream: bool = Field(default=False)

class OllamaMemoryRequest(BaseModel):
    question: str
    model: str = Field(default="ministral")
    stream: bool = Field(default=False)
    # Mémoire côté serveur (sessionId) OU historique fourni par le client
    session_id: Optional[str] = Field(default=None)
    context: Optional[str] = Field(default=None, description="Historique texte complet si tu ne veux pas de session serveur")