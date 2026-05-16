Live Demo: https://scene-solver-eight.vercel.app/
#SceneSolver

**One-line:** Crime scene analysis app that detects and classifies harmful objects in images & video using Vision Transformer + YOLOv8.

---

## Features
- Upload images or videos for crime-scene analysis.
- Harmful object detection with YOLOv8 (bounding boxes).
- Frame-level context analysis with Vision Transformer.
- Dashboard with authentication, file upload and results view.
- Stores cases/predictions in MongoDB and also their email and queries.

---

## Tech stack
- Frontend: React.js, Axios, React Router  
- Backend: FastAPI (Python)  
- Database: MongoDB  
- Models: Vision Transformer, YOLOv8, distilgpt2
- Tools: Git

---

## Repo structure
SceneSolver/
├── Backend/
│ ├── main.py
│ ├── requirements.txt
│ ├── installed_packages.txt
│ ├── adapter_config.json
│ ├── adapter_model.safetensors
│ └── yolo_fine_tuned.pt
├── Frontend/
│ ├── public/
│ └── src/
└── README.md
