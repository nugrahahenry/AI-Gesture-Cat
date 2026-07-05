"""
Hari 3 - Flask API untuk jalankan model dari browser.

Cara pakai:
  python app.py

Endpoint:
  POST /predict  ->  { "landmarks": [63 angka] }  ->  { "emotion": "happy", "confidence": 0.96 }
  GET  /labels   ->  { "labels": ["angry", ...] }
"""

import pickle
import json
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model saat server start
with open('model.pkl', 'rb') as f:
    data = pickle.load(f)
    MODEL = data['model']
    LE    = data['label_encoder']

with open('model_info.json', 'r') as f:
    INFO = json.load(f)

print(f"✓ Model loaded | Labels: {INFO['labels']} | Accuracy: {INFO['accuracy']:.1%}")
print(f"  Running at http://localhost:5000")


@app.route('/predict', methods=['POST'])
def predict():
    body = request.get_json()
    landmarks = body.get('landmarks', [])

    if len(landmarks) != 63:
        return jsonify({'error': f'Expected 63 values, got {len(landmarks)}'}), 400

    X    = np.array(landmarks).reshape(1, -1)
    idx  = MODEL.predict(X)[0]
    prob = MODEL.predict_proba(X)[0]

    return jsonify({
        'emotion':    LE.inverse_transform([idx])[0],
        'confidence': round(float(prob.max()), 3),
        'all': {label: round(float(prob[i]), 3) for i, label in enumerate(LE.classes_)}
    })


@app.route('/labels', methods=['GET'])
def labels():
    return jsonify({'labels': INFO['labels']})


if __name__ == '__main__':
    app.run(debug=False, port=5000)
