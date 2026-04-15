import requests
import os
import json

api_key = os.environ.get("GOOGLE_API_KEY", "")

url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key={api_key}"

payload = {
    "instances": [{
        "prompt": "A test image",
        "referenceImages": [
            {
                "referenceType": "REFERENCE_TYPE_STYLE",
                "referenceId": 1,
                "referenceImage": {
                    "image": {
                        "imageBytes": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                    }
                },
                "styleImageConfig": {}
            }
        ]
    }],
    "parameters": {
        "sampleCount": 1,
        "aspectRatio": "1:1"
    }
}

r = requests.post(url, json=payload)
print(r.status_code)
print(r.text)
