from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
from datetime import datetime
import re
import logging
from bson import ObjectId
from datetime import timezone, datetime, timedelta
import random
import bcrypt
import uuid
from typing import List
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from ultralytics import YOLO
from transformers import ViTForImageClassification, ViTImageProcessor
from PIL import Image, ImageDraw, ImageFont
import io
import torch
from peft import PeftModel
import cv2
import numpy as np
import base64
import psutil

from transformers import GPT2Tokenizer, GPT2LMHeadModel

# Load .env if exists (safe for local dev, ignored in HF Spaces)
load_dotenv()

# --------------------------
# ENVIRONMENT VARIABLES SAFE HANDLING
# --------------------------

# SMTP config (optional on Spaces)
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = os.getenv("SMTP_PORT")
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")

# Convert port safely
if SMTP_PORT:
    SMTP_PORT = int(SMTP_PORT)
else:
    SMTP_PORT = None  # prevents crash

# MongoDB URI required
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("❌ MONGO_URI is missing. Set it in Spaces Settings → Variables & Secrets.")

# --------------------------
# LOGGING
# --------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
try:
    client = MongoClient(MONGO_URI)
    db = client.webAppDB
    db.command("ping")
    logger.info("MongoDB connection established")
except Exception as e:
    logger.error(f"MongoDB connection failed: {str(e)}")
    raise Exception(f"MongoDB connection failed: {str(e)}")


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Load YOLOv8 model
try:
    yolo_model_path = "./models/yolo_fine_tuned.pt"
    logger.debug(f"Attempting to load YOLOv8 model from {yolo_model_path}")
    yolo_model = YOLO(yolo_model_path)
    logger.info("YOLOv8 model loaded successfully")
    logger.debug(f"YOLOv8 model details: {yolo_model}")
except Exception as e:
    logger.error(f"Failed to load YOLOv8 model: {str(e)}")
    raise Exception(f"Failed to load YOLOv8 model: {str(e)}")


# Load ViT model and processor from direct path
try:
    vit_model_path = "./models/vitadapter"
  # Directory with adapter weights
    # Load the base ViT model
    vit_model = ViTForImageClassification.from_pretrained(
        "google/vit-base-patch16-224",
        num_labels=9,
        ignore_mismatched_sizes=True
    )
    # Load the adapter weights using PeftModel
    vit_model = PeftModel.from_pretrained(vit_model, vit_model_path)
    vit_model = vit_model.merge_and_unload()  # Merge adapter weights into the base model
    vit_model = vit_model.to(device)
    vit_model.eval()
    vit_processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224")
    class_names = ['Arrest', 'Abuse', 'Assault', 'Fighting', 'Burglary', 'Normal','Explosion','Stealing', 'Arson']
    logger.info("ViT model and processor loaded successfully with adapter")
except Exception as e:
    logger.error(f"Failed to load ViT model with adapter: {str(e)}")
    raise Exception(f"Failed to load ViT model with adapter: {str(e)}")



try:
    gpt2_tokenizer = GPT2Tokenizer.from_pretrained("distilgpt2")
    gpt2_model = GPT2LMHeadModel.from_pretrained("distilgpt2").to(device)
    gpt2_model.eval()
    logger.info("DistilGPT2 model and tokenizer loaded successfully")
except Exception as e:
    logger.error(f"Failed to load DistilGPT2 model: {str(e)}")
    raise Exception(f"Failed to load DistilGPT2 model: {str(e)}")


# Pydantic models
class UserRegister(BaseModel):
    username: str
    email: str
    phone: str
    password: str
    dob: str
    role: str = "user"
    login_method: str  # Add this field

class UserLogin(BaseModel):
    login_method: str
    email: str | None = None
    phone: str | None = None
    password: str

class OtpRequest(BaseModel):
    login_method: str
    email: str | None = None
    phone: str | None = None

class OtpVerify(BaseModel):
    login_method: str
    email: str | None = None
    phone: str | None = None
    otp: str

class ResetPassword(BaseModel):
    login_method: str
    email: str | None = None
    phone: str | None = None
    new_password: str

class UserQuery(BaseModel):
    username: str
    query: str

class QueryResponse(BaseModel):
    query_id: str
    response: str

class AddUser(BaseModel):
    username: str
    email: Optional[str] = None  # Changed to optional
    phone: Optional[str] = None  # Changed to optional
    password: str
    dob: str
    role: str = "user"

class UpdateUserRole(BaseModel):
    username: str
    role: str

class DeleteUser(BaseModel):
    username: str

class Query(BaseModel):
    id: str
    name: str
    query: str
    timestamp: str
    status: str
    response: str | None = None
    updatedAt: str | None = None

def generate_summary(prompt):
    inputs = gpt2_tokenizer.encode(prompt, return_tensors="pt").to(device)
    outputs = gpt2_model.generate(
        inputs,
        max_length=100,
        do_sample=False,
        top_k=0,
        top_p=1.0,
        temperature=0.1,
        num_beams=1,
        no_repeat_ngram_size=2,
        early_stopping=True
    )
    description = gpt2_tokenizer.decode(outputs[0], skip_special_tokens=True)
    if description.startswith(prompt):
        description = description[len(prompt):].strip()
    return description
    
# Utility functions
def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone: str) -> bool:
    pattern = r'^\+\d{1,3}\d{10}$'
    return re.match(pattern, phone) is not None

def validate_password(password: str) -> bool:
    if len(password) < 8:
        return False
    # Check for at least one uppercase, one lowercase, one number, and one special character
    pattern = r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$'
    if not re.match(pattern, password):
        return False
    return True

def calculate_age(dob: str) -> int:
    try:
        dob_date = datetime.fromisoformat(dob.replace("Z", "+00:00"))  # dob_date is offset-aware (UTC)
        today = datetime.now(timezone.utc)  # Make today offset-aware (UTC)
        age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
        return age
    except ValueError as e:
        logger.error(f"Invalid DOB format: {dob}, error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid DOB format: {str(e)}")
    
    # Function to send email
async def send_email(to_email: str, otp: str):
    # disable email sending when SMTP not configured
    if not SMTP_HOST or not SMTP_PORT:
        logger.warning(f"SMTP disabled. Skipping email send to {to_email}")
        return {"message": "Email sending disabled on server"}

    try:
        # Create the email message
        subject = "Your OTP for Verification"
        body = f"Your OTP for verification is: {otp}\nThis OTP is valid for 10 minutes."
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Connect to the SMTP server
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()  # Enable TLS
        server.login(SMTP_USERNAME, SMTP_PASSWORD)

        # Send the email
        server.sendmail(SMTP_USERNAME, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# Endpoints
@app.get("/welcome")
async def welcome_message():
    return {"message": "Welcome to SceneSolver - AI-Powered Crime Detection"}

@app.get("/")
async def health():
    return {"status": "ok"}


@app.post("/register")
async def register_user(user: UserRegister):
    logger.info(f"Register attempt: username={user.username}, email={user.email}, phone={user.phone}, login_method={user.login_method}")
    if user.login_method not in ["email", "phone"]:
        logger.warning(f"Registration failed: Invalid login method: {user.login_method}")
        raise HTTPException(status_code=400, detail="Invalid login method")
    
    if user.role != "user":
        logger.warning(f"Registration failed: Cannot set role during registration: {user.role}")
        raise HTTPException(status_code=403, detail="Cannot set role during registration")
    user.role = "user"
    
    # Validate email only if login_method is "email"
    if user.login_method == "email":
        if not validate_email(user.email):
            logger.warning(f"Registration failed: Invalid email format: {user.email}")
            raise HTTPException(status_code=400, detail="Invalid email format")
        if db.users.find_one({"email": user.email}):
            logger.warning(f"Registration failed: Email already exists: {user.email}")
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Validate phone only if login_method is "phone"
    if user.login_method == "phone":
        if not validate_phone(user.phone):
            logger.warning(f"Registration failed: Invalid phone format: {user.phone}")
            raise HTTPException(status_code=400, detail="Invalid phone format")
        if db.users.find_one({"phone": user.phone}):
            logger.warning(f"Registration failed: Phone already exists: {user.phone}")
            raise HTTPException(status_code=400, detail="Phone already exists")

    if not validate_password(user.password):
        logger.warning(f"Registration failed: Weak password")
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters and include uppercase, lowercase, number, and special character")
    
    try:
        age = calculate_age(user.dob)
        if age < 18:
            logger.warning(f"Registration failed: User under 18, age={age}")
            raise HTTPException(status_code=403, detail="User must be 18 or older")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Registration failed: DOB error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"DOB processing error: {str(e)}")
    
    try:
        hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
        hashed_password = hashed_password.decode('utf-8')  # Convert bytes to string for MongoDB
    except Exception as e:
        logger.error(f"Registration failed: Password hashing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to hash password: {str(e)}")
    
    user_data = user.dict()
    user_data["password"] = hashed_password
    user_data["otp"] = None
    user_data["createdAt"] = datetime.now().isoformat()
    user_data["updatedAt"] = datetime.now().isoformat()
    user_data["registered"] = datetime.now().isoformat()
    try:
        db.users.insert_one(user_data)
        logger.info(f"User registered: email={user.email}")
        return {"message": "User registered successfully"}
    except Exception as e:
        logger.error(f"Registration failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")

@app.post("/login")
async def login_user(user: UserLogin):
    logger.info(f"Login attempt: login_method={user.login_method}, email={user.email}, phone={user.phone}")
    if user.login_method not in ["email", "phone"]:
        logger.warning(f"Login failed: Invalid login method: {user.login_method}")
        raise HTTPException(status_code=400, detail="Invalid login method")
    
    query = {}
    if user.login_method == "email" and user.email:
        query = {"email": user.email}
    elif user.login_method == "phone" and user.phone:
        query = {"phone": user.phone}
    else:
        logger.warning(f"Login failed: Email or phone required")
        raise HTTPException(status_code=400, detail="Email or phone required")

    db_user = db.users.find_one(query)
    if not db_user:
        logger.warning(f"Login failed: User not found for query: {query}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    try:
        if not bcrypt.checkpw(user.password.encode('utf-8'), db_user["password"].encode('utf-8')):
            logger.warning(f"Login failed: Incorrect password for query: {query}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        logger.error(f"Login failed: Password verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to verify password: {str(e)}")
    
    if "dob" in db_user:
        try:
            age = calculate_age(db_user["dob"])
            if age < 18:
                logger.warning(f"Login failed: User under 18, age={age}")
                raise HTTPException(status_code=403, detail="User must be 18 or older")
        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Login failed: DOB error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"DOB processing error: {str(e)}")

    logger.info(f"Login successful: username={db_user['username']}")
    return {"message": "Login successful", "username": db_user["username"], "role": db_user["role"]}

@app.post("/send-otp")
async def send_otp(data: OtpRequest):
    logger.info(f"Send OTP attempt: login_method={data.login_method}, email={data.email}, phone={data.phone}")
    if data.login_method not in ["email", "phone"]:
        logger.warning(f"Send OTP failed: Invalid login method")
        raise HTTPException(status_code=400, detail="Invalid login method")
    
    query = {}
    if data.login_method == "email" and data.email:
        query = {"email": data.email}
    elif data.login_method == "phone" and data.phone:
        query = {"phone": data.phone}
    else:
        logger.warning(f"Send OTP failed: Email or phone required")
        raise HTTPException(status_code=400, detail="Email or phone required")

    db_user = db.users.find_one(query)
    if not db_user:
        logger.warning(f"Send OTP failed: User not found for query: {query}")
        raise HTTPException(status_code=404, detail="User not found")

    otp = str(random.randint(100000, 999999))
    expiration_time = datetime.utcnow() + timedelta(minutes=10)  # OTP expires in 10 minutes
    try:
        # Store OTP and expiration time
        db.users.update_one(query, {"$set": {"otp": otp, "otp_expires_at": expiration_time}})
        
        if data.login_method == "email":
            await send_email(data.email, otp)
            logger.info(f"OTP sent via email: email={data.email}")
        else:
            logger.info(f"Phone OTP not implemented: phone={data.phone}")
            logger.info(f"OTP for phone: {otp}")

        return {"message": "OTP sent successfully"}
    except Exception as e:
        logger.error(f"Send OTP failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")
    
@app.post("/verify-otp")
async def verify_otp(data: OtpVerify):
    logger.info(f"Verify OTP attempt: login_method={data.login_method}, email={data.email}, phone={data.phone}")
    if data.login_method not in ["email", "phone"]:
        logger.warning(f"Verify OTP failed: Invalid login method")
        raise HTTPException(status_code=400, detail="Invalid login method")
    
    query = {}
    if data.login_method == "email" and data.email:
        query = {"email": data.email}
    elif data.login_method == "phone" and data.phone:
        query = {"phone": data.phone}
    else:
        logger.warning(f"Verify OTP failed: Email or phone required")
        raise HTTPException(status_code=400, detail="Email or phone required")

    db_user = db.users.find_one(query)
    if not db_user:
        logger.warning(f"Verify OTP failed: User not found for query: {query}")
        raise HTTPException(status_code=404, detail="User not found")

    # Check if OTP exists and matches
    if db_user.get("otp") != data.otp:
        logger.warning(f"Verify OTP failed: Invalid OTP for query: {query}")
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # Check if OTP has expired
    expiration_time = db_user.get("otp_expires_at")
    if expiration_time and datetime.utcnow() > expiration_time:
        logger.warning(f"Verify OTP failed: OTP expired for query: {query}")
        raise HTTPException(status_code=401, detail="OTP has expired")

    # Clear OTP after successful verification
    db.users.update_one(query, {"$unset": {"otp": "", "otp_expires_at": ""}})
    logger.info(f"OTP verified: query={query}")
    return {"message": "OTP verified successfully"}

# Updated: Use bcrypt for password hashing
@app.post("/reset-password")
async def reset_password(data: ResetPassword):
    logger.info(f"Reset password attempt: login_method={data.login_method}, email={data.email}, phone={data.phone}")
    if data.login_method not in ["email", "phone"]:
        logger.warning(f"Reset password failed: Invalid login method")
        raise HTTPException(status_code=400, detail="Invalid login method")
    
    query = {}
    if data.login_method == "email" and data.email:
        query = {"email": data.email}
    elif data.login_method == "phone" and data.phone:
        query = {"phone": data.phone}
    else:
        logger.warning(f"Reset password failed: Email or phone required")
        raise HTTPException(status_code=400, detail="Email or phone required")

    db_user = db.users.find_one(query)
    if not db_user:
        logger.warning(f"Reset password failed: User not found for query: {query}")
        raise HTTPException(status_code=404, detail="User not found")

    if not validate_password(data.new_password):
        logger.warning(f"Reset password failed: New password too short")
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    # Updated: Use bcrypt instead of SHA-256
    try:
        hashed_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt())
        hashed_password = hashed_password.decode('utf-8')  # Convert bytes to string for MongoDB
    except Exception as e:
        logger.error(f"Reset password failed: Password hashing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to hash password: {str(e)}")

    try:
        db.users.update_one(query, {"$set": {"password": hashed_password, "otp": None}})
        logger.info(f"Password reset: query={query}")
        return {"message": "Password reset successfully"}
    except Exception as e:
        logger.error(f"Reset password failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")

# Updated: Save as 'name' instead of 'username' to match /my-queries
@app.post("/submit-query")
async def submit_query(query: UserQuery):
    try:
        query_data = {
            "name": query.username,  # Changed from 'username' to 'name' to match /my-queries
            "query": query.query,
            "query_id": str(uuid.uuid4()),  # Generate and store query_id
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "status": "pending",  # Added to match Query model
            "response": None
        }
        db.queries.insert_one(query_data)
        logger.info(f"Query submitted: query_id={query_data['query_id']}")
        return {"message": "Query submitted successfully", "query_id": query_data["query_id"]}
    except Exception as e:
        logger.error(f"Failed to submit query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit query: {str(e)}")

# Updated: Add responded_at field and align with frontend
@app.post("/respond-query")
async def respond_query(response: QueryResponse):
    logger.info(f"Respond query attempt: query_id={response.query_id}")
    try:
        # Validate that query_id and response are not empty
        if not response.query_id or not response.response:
            logger.warning(f"Respond query failed: Missing query_id or response")
            raise HTTPException(status_code=400, detail="query_id and response are required")

        # Look for the query using either query_id (string) or _id (ObjectId)
        query = db.queries.find_one({
            "$or": [
                {"query_id": response.query_id},  # query_id is a string
                {"_id": ObjectId(response.query_id) if ObjectId.is_valid(response.query_id) else None}  # Convert to ObjectId for _id
            ]
        })
    except ValueError as e:
        logger.warning(f"Respond query failed: Invalid query_id format: {response.query_id}")
        raise HTTPException(status_code=400, detail=f"Invalid query_id format: {str(e)}")
    except Exception as e:
        logger.warning(f"Respond query failed: Invalid query_id format: {response.query_id}")
        raise HTTPException(status_code=400, detail=f"Invalid query_id format: {str(e)}")
    
    if not query:
        logger.warning(f"Respond query failed: Query not found: {response.query_id}")
        raise HTTPException(status_code=404, detail="Query not found")
    
    try:
        result = db.queries.update_one(
            {
                "$or": [
                    {"query_id": response.query_id},
                    {"_id": ObjectId(response.query_id) if ObjectId.is_valid(response.query_id) else None}  # Convert to ObjectId for _id
                ]
            },
            {
                "$set": {
                    "response": response.response,
                    "status": "resolved",  # Add status update
                    "updatedAt": datetime.now().isoformat()
                }
            }
        )
        if result.modified_count == 0:
            logger.warning(f"Respond query failed: No query updated for query_id={response.query_id}")
            raise HTTPException(status_code=400, detail="Failed to update query: No changes made")
        
        logger.info(f"Query responded: query_id={response.query_id}")
        return {"message": "Response recorded successfully"}
    except ValueError as e:
        logger.error(f"Respond query failed: Invalid query_id format: {response.query_id}")
        raise HTTPException(status_code=400, detail=f"Invalid query_id format: {str(e)}")
    except Exception as e:
        logger.error(f"Respond query failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to respond to query: {str(e)}")

# Added: Endpoint to fetch all queries for AdminPage
@app.get("/queries")
async def get_queries():
    try:
        # Fetch all queries, include _id so we can use it as a fallback
        cursor = db.queries.find()  # Removed {"_id": 0}
        # Convert cursor to list and rename fields as needed
        queries = []
        for query in cursor:
            query_entry = {
                "query_id": query.get("query_id", str(query["_id"])),  # Use query_id if present, fallback to _id
                "username": query.get("name", "Unknown"),  # Changed to 'name' to match updated schema
                "query": query.get("query", query.get("query_text", "")),
                "response": query.get("response"),
                # Exclude submitted_at, status, responded_at
            }
            queries.append(query_entry)
        logger.info(f"Fetched {len(queries)} queries")
        return queries
    except Exception as e:
        logger.error(f"Failed to fetch queries: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch queries: {str(e)}")

# Utility function to convert ObjectId to string
def str_obj_id(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    raise TypeError(f"Object {obj} is not of type 'ObjectId'")

# /submit-file endpoint (updated to use new ViT class names)
@app.post("/submit-file")
async def submit_file(image: UploadFile = File(...)):
    # Log initial RAM usage
    process = psutil.Process()
    logger.info(f"Initial RAM usage: {process.memory_info().rss / 1024**3:.2f} GB")

    logger.info(f"Submit file attempt: filename={image.filename}, content_type={image.content_type}, size={image.size}")
    if not image.content_type:
        logger.warning("Submit file failed: No content type provided")
        raise HTTPException(status_code=400, detail="No content type provided")
    if not image.content_type.startswith(('image/', 'video/')):
        logger.warning(f"Submit file failed: Invalid file type: {image.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only images or videos allowed.")
    
    content = await image.read()
    logger.info(f"File content length: {len(content)} bytes")

    if len(content) == 0:
        logger.warning("Submit file failed: Empty file")
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Handle image or video based on content type
    if image.content_type.startswith('image/'):
        # Process image directly
        try:
            image_pil = Image.open(io.BytesIO(content)).convert("RGB")
            # Resize image to reduce memory
            image_pil = image_pil.resize((640, 480), Image.Resampling.LANCZOS)
        except Exception as e:
            logger.error(f"Submit file failed: Image processing error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")
    elif image.content_type.startswith('video/'):
        # Save video content to a temporary file
        temp_video_path = f"temp_{image.filename}"
        try:
            with open(temp_video_path, 'wb') as f:
                f.write(content)

            # Extract every nth frame (e.g., every 10th frame)
            n = 10  # Adjustable: process every 10th frame
            video = cv2.VideoCapture(temp_video_path)
            if not video.isOpened():
                logger.error("Submit file failed: Could not open video file")
                raise HTTPException(status_code=400, detail="Could not open video file")

            frames = []
            frame_count = 0
            max_frames = 50  # Limit total frames to control memory
            while video.isOpened() and len(frames) < max_frames:
                success, frame = video.read()
                if not success:
                    break
                if frame_count % n == 0:  # Process every nth frame
                    # Resize frame to reduce memory
                    frame = cv2.resize(frame, (640, 480))
                    # Convert to RGB for PIL
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frames.append(Image.fromarray(frame_rgb))
                frame_count += 1
            video.release()
            logger.info(f"Extracted {len(frames)} frames (every {n}th frame, max {max_frames})")
            
            # Use the first frame for processing (or aggregate results later)
            if not frames:
                logger.error("Submit file failed: No frames extracted from video")
                raise HTTPException(status_code=400, detail="No frames extracted from video")
            image_pil = frames[0]  # Process first frame for now

            # Log RAM after video processing
            logger.info(f"RAM usage after video processing: {process.memory_info().rss / 1024**3:.2f} GB")
        except Exception as e:
            logger.error(f"Submit file failed: Video processing error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to process video: {str(e)}")
        finally:
            # Clean up temporary file
            if os.path.exists(temp_video_path):
                os.remove(temp_video_path)
    else:
        logger.warning("Submit file failed: Unsupported content type")
        raise HTTPException(status_code=400, detail="Unsupported content type")

    # Step 1: Object detection with YOLOv8
    try:
        with torch.no_grad():  # Reduce memory usage
            yolo_results = yolo_model.predict(image_pil, conf=0.3)
        detected_objects = []
        for result in yolo_results:
            logger.info(f"YOLOv8 result: boxes={len(result.boxes)}")
            for box in result.boxes:
                label = result.names[int(box.cls)]
                confidence = float(box.conf)
                bbox = box.xywh[0].tolist()
                logger.info(f"Detected object: label={label}, confidence={confidence}, bbox={bbox}")
                detected_objects.append({
                    "label": label,
                    "confidence": confidence,
                    "bbox": bbox
                })
        if not detected_objects:
            logger.info("No objects detected with confidence >= 0.3")
        
        # Log RAM after YOLOv8
        logger.info(f"RAM usage after YOLOv8: {process.memory_info().rss / 1024**3:.2f} GB")
    except Exception as e:
        logger.error(f"Submit file failed: YOLOv8 prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YOLOv8 prediction failed: {str(e)}")

    # Draw bounding boxes
    draw = ImageDraw.Draw(image_pil)
    try:
        font = ImageFont.load_default()
    except Exception as e:
        logger.warning(f"Could not load default font: {str(e)}. Using no font for labels.")
        font = None

    for obj in detected_objects:
        x_center, y_center, width, height = obj["bbox"]
        left = int(x_center - width / 2)
        top = int(y_center - height / 2)
        right = int(x_center + width / 2)
        bottom = int(y_center + height / 2)

        draw.rectangle([left, top, right, bottom], outline="red", width=2)
        label_text = f"{obj['label']} ({obj['confidence']:.2f})"
        if font:
            text_bbox = draw.textbbox((left, top - 20), label_text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]
            draw.rectangle([left, top - 20, left + text_width, top], fill="red")
            draw.text((left, top - 20), label_text, fill="white", font=font)
        else:
            draw.text((left, top - 20), label_text, fill="white")

    # Convert annotated image to base64
    buffered = io.BytesIO()
    image_pil.save(buffered, format="PNG")
    annotated_image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    # Step 2: Classification with ViT
    classifications = []
    for obj in detected_objects:
        try:
            x_center, y_center, width, height = obj["bbox"]
            left = int(x_center - width / 2)
            top = int(y_center - height / 2)
            right = int(x_center + width / 2)
            bottom = int(y_center + height / 2)
            cropped_image = image_pil.crop((left, top, right, bottom))

            inputs = vit_processor(images=cropped_image, return_tensors="pt").to(device)
            with torch.no_grad():
                outputs = vit_model(**inputs)
                logits = outputs.logits
                predicted_class_idx = logits.argmax(-1).item()
                predicted_class = class_names[predicted_class_idx]
                confidence = float(torch.softmax(logits, dim=-1)[0, predicted_class_idx])

            classifications.append({
                "object": obj["label"],
                "classification": predicted_class,
                "confidence": confidence
            })
        except Exception as e:
            logger.warning(f"ViT classification failed for object {obj['label']}: {str(e)}")
            classifications.append({
                "object": obj["label"],
                "classification": "Unknown",
                "confidence": 0.0
            })

    # Log RAM after ViT
    logger.info(f"RAM usage after ViT: {process.memory_info().rss / 1024**3:.2f} GB")

    # Step 3: Generate descriptions with DistilGPT2
    descriptions = []
    for cls in classifications:
        confidence_percentage = cls['confidence'] * 100
        prompt = (
            f"Format the following information into exactly three sentences: "
            f"First sentence: 'A {cls['object']} was detected in the image.' "
            f"Second sentence: 'The scene appears to be classified as {cls['classification']}.' "
            f"Third sentence: 'This classification has a confidence level of {confidence_percentage:.0f}%.' "
            f"Do not add any additional text or modify the sentence structure."
        )
        description = generate_summary(prompt)
        if not description.startswith(f"A {cls['object']}"):
            description = (
                f"A {cls['object']} was detected in the image. "
                f"The scene appears to be classified as {cls['classification']}. "
                f"This classification has a confidence level of {confidence_percentage:.0f}%."
            )
        descriptions.append({
            "object": cls["object"],
            "classification": cls["classification"],
            "description": description
        })
        logger.info(f"Generated description for {cls['object']}: {description}")

    # Log RAM after DistilGPT2
    logger.info(f"RAM usage after DistilGPT2: {process.memory_info().rss / 1024**3:.2f} GB")

    # Prepare prediction response
    prediction = {
        "object_detection": detected_objects,
        "classifications": classifications,
        "descriptions": descriptions,
        "timestamp": datetime.now().isoformat(),
        "image_filename": image.filename,
        "annotated_image": f"data:image/png;base64,{annotated_image_base64}"
    }
    
    try:
        inserted = db.predictions.insert_one(prediction)
        prediction['_id'] = str(inserted.inserted_id)
        logger.info(f"File submitted: filename={image.filename}")
        return prediction
    except Exception as e:
        logger.error(f"Submit file failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to store prediction: {str(e)}")
@app.get("/users")
async def get_users():
    logger.info("Get users attempt")
    try:
        users = list(db.users.find({}, {"password": 0, "otp": 0, "_id": 0}))
        logger.info(f"Users fetched: count={len(users)}")
        return {"users": users}
    except Exception as e:
        logger.error(f"Get users failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")
@app.post("/add-user")
async def add_user(user: AddUser):
    logger.info(f"Add user attempt: email={user.email}, phone={user.phone}")
    
    # Ensure at least one of email or phone is provided
    if not user.email and not user.phone:
        logger.warning("Add user failed: Email or phone required")
        raise HTTPException(status_code=400, detail="Email or phone required")
    
    # Check for duplicate email or phone, only if provided
    query = {"$or": []}
    if user.email:
        query["$or"].append({"email": user.email})
    if user.phone:
        query["$or"].append({"phone": user.phone})
    if query["$or"] and db.users.find_one(query):
        logger.warning(f"Add user failed: Email or phone already exists")
        raise HTTPException(status_code=400, detail="Email or phone already exists")
    
    # Validate email if provided
    if user.email and not validate_email(user.email):
        logger.warning(f"Add user failed: Invalid email format: {user.email}")
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate phone if provided
    if user.phone and not validate_phone(user.phone):
        logger.warning(f"Add user failed: Invalid phone format: {user.phone}")
        raise HTTPException(status_code=400, detail="Invalid phone format (e.g., +911234567890)")
    
    if not validate_password(user.password):
        logger.warning(f"Add user failed: Password too short")
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    try:
        age = calculate_age(user.dob)
        if age < 18:
            logger.warning(f"Add user failed: User under 18, age={age}")
            raise HTTPException(status_code=403, detail="User must be 18 or older")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Add user failed: DOB error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"DOB processing error: {str(e)}")
    
    try:
        hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
        hashed_password = hashed_password.decode('utf-8')
    except Exception as e:
        logger.error(f"Add user failed: Password hashing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to hash password: {str(e)}")
    
    user_data = user.dict()
    user_data["password"] = hashed_password
    user_data["otp"] = None
    user_data["createdAt"] = datetime.now().isoformat()
    user_data["updatedAt"] = datetime.now().isoformat()
    user_data["registered"] = datetime.now().isoformat()
    try:
        result = db.users.insert_one(user_data)
        inserted_user = db.users.find_one({"_id": result.inserted_id})
        inserted_user["_id"] = str(inserted_user["_id"])
        logger.info(f"User added: email={user.email}, phone={user.phone}")
        return {"message": "User added successfully", "user": inserted_user}
    except Exception as e:
        logger.error(f"Add user failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add user: {str(e)}")
    
@app.post("/update-user-role")
async def update_user_role(data: UpdateUserRole):
    logger.info(f"Update user role attempt: username={data.username}, role={data.role}")
    user = db.users.find_one({"username": data.username})
    if not user:
        logger.warning(f"Update user role failed: User not found: {data.username}")
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        db.users.update_one({"username": data.username}, {"$set": {"role": data.role}})
        logger.info(f"User role updated: username={data.username}, role={data.role}")
        return {"message": f"Role updated to {data.role} for user {data.username}"}
    except Exception as e:
        logger.error(f"Update user role failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user role: {str(e)}")

@app.post("/delete-user")
async def delete_user(data: DeleteUser):
    logger.info(f"Delete user attempt: username={data.username}")
    try:
        result = db.users.delete_one({"username": data.username})
        if result.deleted_count == 0:
            logger.warning(f"Delete user failed: User not found: {data.username}")
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"User deleted: username={data.username}")
        return {"message": f"User {data.username} deleted successfully"}
    except HTTPException:
        raise  # Let HTTPException propagate unchanged
    except Exception as e:
        logger.error(f"Delete user failed: MongoDB error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@app.get("/my-queries", response_model=List[Query])
async def get_user_queries(username: str):
    logger.info(f"Fetching queries for username: {username}")
    if not username:
        logger.warning("Get user queries failed: Username is required")
        raise HTTPException(status_code=400, detail="Username is required")

    try:
        # Fetch queries where the 'name' field matches the username
        queries = list(db.queries.find({"name": {"$regex": f"^{username}$", "$options": "i"}}))
        if not queries:
            logger.info(f"No queries found for username: {username}")
            return []

        # Convert MongoDB documents to match the Query model
        formatted_queries = []
        for query in queries:
            formatted_query = {
                "id": query.get("query_id", str(query["_id"])),  # Use query_id if available
                "name": query.get("name", ""),
                "query": query.get("query", ""),
                "timestamp": query.get("createdAt", ""),  # Changed from timestamp to createdAt
                "status": query.get("status", "pending"),
                "response": query.get("response"),
                "updatedAt": query.get("updatedAt")
            }
            formatted_queries.append(formatted_query)
        
        logger.info(f"Successfully fetched {len(formatted_queries)} queries for username: {username}")
        return formatted_queries
    except Exception as e:
        logger.error(f"Get user queries failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch queries: {str(e)}")