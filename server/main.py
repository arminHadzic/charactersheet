from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import os

from workflow import generate_character_sheet

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    apiKey: str
    referenceImagesBase64: List[str]
    userPreferences: Optional[str] = ""

class GenerateResponse(BaseModel):
    components: List[Dict[str, str]]

@app.post("/generate", response_model=GenerateResponse)
async def generate_endpoint(request: GenerateRequest):
    if not request.apiKey:
        raise HTTPException(status_code=400, detail="API key is required.")
    
    os.environ["GOOGLE_API_KEY"] = request.apiKey
    
    try:
        results = await generate_character_sheet(
            api_key=request.apiKey,
            images_b64=request.referenceImagesBase64,
            preferences=request.userPreferences
        )
        return GenerateResponse(components=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
