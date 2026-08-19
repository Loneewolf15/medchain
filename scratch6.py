from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.testclient import TestClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Item(BaseModel):
    date: str

@app.post("/test")
def test(item: Item):
    return item

client = TestClient(app)
resp = client.options("/test", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"})
print("OPTIONS headers:", resp.headers)
resp = client.post("/test", headers={"Origin": "http://localhost:3000"}, json={})
print("POST 422 headers:", resp.headers)
