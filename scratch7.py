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
    raise ValueError("DB commit failed")

client = TestClient(app, raise_server_exceptions=False)
resp = client.post("/test", headers={"Origin": "http://localhost:3000"}, json={"date": "foo"})
print("POST 500 headers:", resp.headers)
