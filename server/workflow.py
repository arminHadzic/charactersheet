import json
import asyncio
import httpx
import re
from typing import TypedDict, List, Dict, Optional, Any
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

STRICT_ADHERENCE = 'CRITICAL: DO NOT rely on your pre-training memory of any copyrighted characters. You MUST base your design STRICTLY and ONLY on the attached reference image. If the reference does not have stripes or extra lines on the torso, DO NOT ADD THEM. Ensure the eye design, colors, and pupil shapes perfectly match the reference.'
PURE_WHITE_BG = f'SOLID PURE WHITE BACKGROUND (HEX #FFFFFF) WITH NO SHADOWS OR SCENERY. {STRICT_ADHERENCE}'

STYLE_PREFIXES = {
    "front_view": f"Animation model sheet — FULL BODY SHOT: THE ENTIRE CHARACTER MUST BE VISIBLE. Front view (facing viewer), neutral standing pose, clean line art. {PURE_WHITE_BG}",
    "three_quarter_view": f"Animation model sheet — FULL BODY SHOT: THE ENTIRE CHARACTER MUST BE VISIBLE. 3/4 angle view, slight turn to the right, neutral pose. {PURE_WHITE_BG}",
    "back_view": f"Animation model sheet — FULL BODY SHOT: THE ENTIRE CHARACTER MUST BE VISIBLE. Back view, character facing directly away from viewer, back of head only, face NOT visible, neutral standing pose. {PURE_WHITE_BG}",
    "expression_sheet": f"Animation model sheet — EXPRESSION REFERENCE GRID CHART. Must contain EXACTLY 6 SEPARATE HEADS in a 2x3 grid. Each head shows a completely different emotion (happy, sad, angry, surprised, scared, determined). CRITICAL: Ensure ALL 6 HEADS strictly maintain the EXACT same anatomy as the reference image (e.g. correct EXACT number of antennae on EVERY head, correct eye geometric shape). Do not use generic eyes. {PURE_WHITE_BG}",
    "action_pose": f"Animation model sheet — FULL BODY SHOT: THE ENTIRE CHARACTER MUST BE VISIBLE. Dynamic signature action pose that reveals the character's personality. CRITICAL: Ensure the eyes and anatomy still EXACTLY match the reference image's geometry even in a dynamic pose. {PURE_WHITE_BG}",
    "color_palette": f"Animation model sheet — COLOR PALETTE CHART. Draw a clean, organized grid of square color swatches representing every major color used in this character's design. Do not draw the character, ONLY draw the color swatches with clean borders. {PURE_WHITE_BG}"
}


class AgentState(TypedDict):
    api_key: str
    reference_image_b64: str
    user_preferences: str
    vision_extraction: Optional[Dict[str, Any]]
    locked_constraint: str
    components: List[Dict[str, str]]

async def extract_vision(state: AgentState):
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=state["api_key"])
    prompt = """Analyze this character image carefully. Extract style, colors, and specific anatomical attributes.
Return exactly a JSON object with these fields, nothing else:
{
  "artStyle": "description of art style (e.g., anime, western cartoon, pixel art)",
  "colorPalette": [{"hex": "#RRGGBB", "label": "color name/usage"}],
  "attributes": ["1-3 character attributes and personality traits"],
  "anatomy": "EXACT physical description of their face/head, number of eyes, type of eyes (pupils or solid colors?), number of ears/antennae. BE EXTREMELY PRECISE (e.g. 'Has exactly 2 tall antennae, 2 large solid magenta eyes with no white sclera/pupils').",
  "consistencyNotes": "key visual rules to maintain across all drawings"
}"""
    msg = HumanMessage(content=[
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{state['reference_image_b64']}"}}
    ])
    
    res = await llm.ainvoke([msg])
    
    text = res.content
    # Remove markdown codeblocks
    text = re.sub(r'```(?:json)?\n?', '', text).strip()
    match = re.search(r'\{.*\}', text, re.DOTALL)
    parsed_json = {}
    if match:
        try:
            parsed_json = json.loads(match.group(0))
        except:
            pass
            
    if not parsed_json:
        parsed_json = {"artStyle": "", "colorPalette": [], "attributes": [], "anatomy": "", "consistencyNotes": ""}
        
    return {"vision_extraction": parsed_json}


async def lock_constraints(state: AgentState):
    profile = state.get("vision_extraction", {})
    prefs = state.get("user_preferences", "")
    
    styleDesc = f"Art style: {profile.get('artStyle', '')}. " if profile.get('artStyle') else ""
    attrDesc = f"Character attributes: {', '.join(profile.get('attributes', [])[:4])}. " if profile.get('attributes') else ""
    anatomyDesc = f"CRITICAL ANATOMY RULES: {profile.get('anatomy', '')}. YOU MUST FOLLOW THESE ANATOMY RULES EXACTLY. " if profile.get('anatomy') else ""
    consistency = f"Consistency rules: {profile.get('consistencyNotes', '')}. " if profile.get('consistencyNotes') else ""
    
    colors = profile.get('colorPalette', [])
    colorStr = ", ".join([f'"{c["label"]}": {c["hex"]}' for c in colors])
    colorsText = f"COLOR PALETTE (MUST STRICTLY USE THESE COLORS): {colorStr}. " if colorStr else ""
    prefStr = f"User notes: {prefs}. " if prefs else ""
    
    constraint = f"{styleDesc}{attrDesc}{anatomyDesc}{consistency}{colorsText}{prefStr}Professional animation studio quality."
    return {"locked_constraint": constraint}


class RateLimitException(Exception):
    pass

@retry(
    wait=wait_exponential(multiplier=2, min=4, max=60), 
    stop=stop_after_attempt(5),
    retry=retry_if_exception_type((RateLimitException, httpx.TimeoutException, Exception))
)
async def fetch_imagen(client: httpx.AsyncClient, api_key: str, prompt: str, ref_b64: str):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": ref_b64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE"]
        }
    }
    
    resp = await client.post(url, json=payload, timeout=90.0)
    if resp.status_code == 429:
        raise RateLimitException("429 Too Many Requests")
    if resp.status_code >= 500:
        raise Exception(f"Server Error {resp.status_code}: {resp.text}")
    if not resp.is_success:
        # Don't retry on 400 Bad Request, we want those to fail immediately so we can fix them.
        raise ValueError(f"HTTP {resp.status_code}: {resp.text}")
        
    data = resp.json()
    try:
        if "predictions" in data:
            b64_out = data["predictions"][0]["bytesBase64Encoded"]
        else:
            b64_out = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
        return b64_out
    except (KeyError, IndexError):
        raise ValueError("Invalid output format: " + str(data))


async def generate_components(state: AgentState):
    comps = []
    
    async with httpx.AsyncClient() as client:
        tasks = []
        keys = list(STYLE_PREFIXES.keys())
        
        # Concurrently fire all requests, relying on tenacity retries to backoff safely on 429s.
        for k in keys:
            prompt = STYLE_PREFIXES[k] + " " + state["locked_constraint"]
            task = asyncio.create_task(fetch_imagen(client, state["api_key"], prompt, state["reference_image_b64"]))
            tasks.append(task)
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for k, res in zip(keys, results):
            if isinstance(res, Exception):
                print(f"Failed to generate {k}: {repr(res)}")
            else:
                comps.append({
                    "id": k,
                    "type": k,
                    "imageData": f"data:image/png;base64,{res}"
                })
                
    return {"components": comps}


builder = StateGraph(AgentState)
builder.add_node("vision", extract_vision)
builder.add_node("lock", lock_constraints)
builder.add_node("generate", generate_components)

builder.add_edge(START, "vision")
builder.add_edge("vision", "lock")
builder.add_edge("lock", "generate")
builder.add_edge("generate", END)

graph = builder.compile()

async def generate_character_sheet(api_key: str, image_b64: str, preferences: str):
    initial_state = {
        "api_key": api_key,
        "reference_image_b64": image_b64,
        "user_preferences": preferences,
        "vision_extraction": None,
        "locked_constraint": "",
        "components": []
    }
    final_state = await graph.ainvoke(initial_state)
    return final_state["components"]
