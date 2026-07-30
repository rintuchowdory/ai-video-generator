from fastapi import FastAPI
app = FastAPI(title="AI Video Generator")
@app.get("/")
def root(): return {"message": "AI Video Generator API"}
