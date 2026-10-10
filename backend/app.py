# pyrefly: ignore [missing-import]
from fastapi import FastAPI
from models import ModelRequest

app = FastAPI(name='MAHIR')

@app.get('/')
def home():
    return {
        'message': 'The app is running'
    }

@app.post('/predict')
def predict(data: ModelRequest):
    return {
        'data': data
    }