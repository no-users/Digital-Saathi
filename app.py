import os
import io
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image, ImageEnhance, ImageOps
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
GENAI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"
genai.configure(api_key=GENAI_API_KEY)

# --- 1. PHOTO TOOLS LOGIC ---
def process_passport_photo(img):
    # Standard 3.5x4.5cm size (approx 413x531 px)
    target_size = (413, 531)
    # Auto-enhance brightness
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)
    # Resize & Crop center
    img = ImageOps.fit(img, target_size, Image.Resampling.LANCZOS)
    return img

# --- 2. UTILITY LOGIC ---
@app.route('/api/process', methods=['POST'])
def universal_api():
    folder = request.form.get('category') # Konsa folder hai (photo, pdf, etc)
    tool = request.form.get('tool')       # Konsa tool hai (passport, compress, etc)
    
    if 'file' not in request.files:
        return jsonify({"error": "File missing"}), 400

    file = request.files['file']
    img = Image.open(file.stream).convert("RGB")

    # --- ROUTING LOGIC ---
    if folder == 'photo':
        if tool == 'AI Passport Pro':
            result_img = process_passport_photo(img)
            
        elif tool == 'Color Fixer':
            enhancer = ImageEnhance.Color(img)
            result_img = enhancer.enhance(1.5)
            
        # Add more photo tools here...
        
        # Save to buffer
        img_io = io.BytesIO()
        result_img.save(img_io, 'JPEG', quality=95)
        img_io.seek(0)
        return send_file(img_io, mimetype='image/jpeg')

    # --- PDF LOGIC (Placeholder for now) ---
    elif folder == 'pdf':
        return jsonify({"message": "PDF Logic Coming Soon! Needs PyMuPDF library."})

    return jsonify({"error": "Tool logic not implemented yet"}), 501

if __name__ == '__main__':
    app.run(port=5000, debug=True)