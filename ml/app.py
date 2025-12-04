import os
import re
from flask import Flask, request, jsonify
from joblib import load, dump
import subprocess

MODEL_PATH = "/var/www/newsdetection/ml/artifacts/news_model.joblib"
model = load(MODEL_PATH)

app = Flask(__name__)

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

@app.route('/api/ml/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/ml/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True) or {}
    content = data.get('content', '')
    if not content.strip():
        return jsonify({'error': 'content required'}), 400
    
    cleaned_content = clean_text(content)
    if not cleaned_content.strip():
        return jsonify({'error': 'content too short or invalid'}), 400
    
    prob = float(model.predict_proba([cleaned_content])[0][1])
    isFake = prob >= 0.5
    confidence = int(round(prob*100 if isFake else (1-prob)*100))
    return jsonify({
        'isFake': isFake,
        'confidence': confidence,
        'explanation': 'Robust ML model with text preprocessing and strong regularization',
        'factors': ['TF features (500 words)', 'Strong L2 regularization', 'Text cleaning', 'Balanced training']
    })

@app.route('/api/ml/retrain', methods=['POST'])
def retrain():
    try:
        proc = subprocess.run(
            ["/var/www/newsdetection/ml/venv/bin/python", "/var/www/newsdetection/ml/train.py"],
            capture_output=True,
            text=True,
            timeout=1800
        )
        if proc.returncode != 0:
            return jsonify({ 'error': 'training failed', 'stderr': proc.stderr[-2000:] }), 500
        return jsonify({ 'status': 'ok', 'stdout': proc.stdout[-2000:] })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

@app.route('/api/ml/reload', methods=['POST'])
def reload_model():
    global model
    try:
        model = load(MODEL_PATH)
        return jsonify({ 'status': 'ok' })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7000)
