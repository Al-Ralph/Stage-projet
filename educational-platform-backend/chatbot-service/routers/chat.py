import os
from typing import Dict, Generator, Iterable

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain_ollama import OllamaLLM

from api.schemas import (
    OpenAIChatRequest,
    OllamaRequest,
    OllamaMemoryRequest,
    Message,
    ChatResponse,
)

router = APIRouter()

# Mémoire simple côté serveur pour Ollama "memory" (optionnelle)
SESSION_CONTEXTS: Dict[str, str] = {}

# ---------- Helpers ----------
def history_to_text(history: Iterable[Message]) -> str:
    # Convertit une liste de messages {role, content} en texte pour le prompt
    lines = []
    for m in history:
        role = "Utilisateur" if m.role == "user" else ("Assistant" if m.role == "assistant" else "Système")
        lines.append(f"{role}: {m.content}")
    return "\n".join(lines)

def sse_stream(tokens: Iterable[str]) -> Generator[str, None, None]:
    for t in tokens:
        # SSE
        yield f"data: {t}\n\n"
    # Indique la fin du flux
    yield "data: [DONE]\n\n"

# ---------- OpenAI chat (avec historique + option streaming) ----------
@router.post("/openai", response_model=ChatResponse)
def chat_openai(body: OpenAIChatRequest):
    """
    JSON: { user_question, chat_history[{role,content}], model?, max_tokens?, temperature?, stream? }
    """
    # Sécurité clé
    if not os.getenv("OPENAI_API_KEY"):
        return JSONResponse(status_code=500, content={"error": "OPENAI_API_KEY manquant dans l'environnement"})

    template = """
Vous êtes un assistant précieux. Vous DEVEZ répondre aux questions suivantes en tenant compte de l'historique de la conversation :
Historique de la conversation :
{chat_history}

Question de l'utilisateur :
{user_question}
"""
    prompt = ChatPromptTemplate.from_template(template)

    llm = ChatOpenAI(
        model=body.model,
        max_tokens=body.max_tokens,
        temperature=body.temperature,
    )
    chain = prompt | llm | StrOutputParser()

    vars = {
        "chat_history": history_to_text(body.chat_history),
        "user_question": body.user_question,
    }

    if body.stream:
        def token_generator():
            for chunk in chain.stream(vars):
                yield chunk
        return StreamingResponse(
            sse_stream(token_generator()),
            media_type="text/event-stream",
        )
    else:
        output = chain.invoke(vars)
        return ChatResponse(output=output)

# ---------- Ollama simple ----------
@router.post("/ollama", response_model=ChatResponse)
def chat_ollama(body: OllamaRequest):
    """
    JSON: { prompt, model?, stream? }
    """
    model = OllamaLLM(model=body.model)

    if body.stream:
        def token_gen():
            # stream() renvoie un itérable de tokens/segments
            for token in model.stream(body.prompt):
                yield token
        return StreamingResponse(
            sse_stream(token_gen()),
            media_type="text/event-stream",
        )
    else:
        output = model.invoke(body.prompt)
        return ChatResponse(output=output)

# ---------- Ollama avec "mémoire" ----------
@router.post("/ollama-memory", response_model=ChatResponse)
def chat_ollama_memory(body: OllamaMemoryRequest):
    """
    JSON: { question, model?, stream?, session_id?, context? }
    - Si session_id est fourni, on conserve le contexte côté serveur (volatile).
    - Sinon, tu peux fournir 'context' (texte) dans la requête.
    """
    model = OllamaLLM(model=body.model)

    # Gérer la mémoire: session côté serveur OU contexte fourni
    context_text = ""
    if body.session_id:
        context_text = SESSION_CONTEXTS.get(body.session_id, "")
    elif body.context:
        context_text = body.context

    template = """
Tu es un professeur . Sois clair, concis et pédagogue.
Explique les réponses en utilisant des exemples simples et un langage adapté aux élèves de 16 ans.

Voici l’historique de la conversation :
{context}

Question :
{question}

Réponse :
"""
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | model | StrOutputParser()

    vars = {"context": context_text, "question": body.question}

    if body.stream:
        def token_gen():
            acc = ""
            for token in chain.stream(vars):
                acc += token
                yield token
            # Mise à jour mémoire une fois terminé
            if body.session_id:
                SESSION_CONTEXTS[body.session_id] = f"{context_text}\nUser: {body.question}\nAI: {acc}".strip()
        return StreamingResponse(sse_stream(token_gen()), media_type="text/event-stream")
    else:
        output = chain.invoke(vars)
        # Mettre à jour la mémoire serveur si session_id
        if body.session_id:
            SESSION_CONTEXTS[body.session_id] = f"{context_text}\nUser: {body.question}\nAI: {output}".strip()
        return ChatResponse(output=output)