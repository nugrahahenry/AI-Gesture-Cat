"""
Hari 2 - Kumpulin data landmark gesture per emosi.
Kompatibel dengan MediaPipe 0.10.30+

Pertama kali jalan, script ini otomatis download model (~8MB).

Kontrol keyboard:
  1=happy  2=sad  3=angry  4=surprised  5=excited
  SPACE = simpan frame sekarang
  Q     = selesai & simpan ke data.csv
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
import numpy as np
import csv
import os
import time
import urllib.request

# ── Model download ─────────────────────────────────────────────────────────
MODEL_PATH = "hand_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)

if not os.path.exists(MODEL_PATH):
    print(f"Downloading model (~8MB)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Download selesai!")

# ── Koneksi tulang tangan (21 titik) ───────────────────────────────────────
HAND_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,4),
    (0,5),(5,6),(6,7),(7,8),
    (5,9),(9,10),(10,11),(11,12),
    (9,13),(13,14),(14,15),(15,16),
    (13,17),(17,18),(18,19),(19,20),
    (0,17)
]

EMOTIONS = {'1':'happy','2':'sad','3':'angry','4':'surprised','5':'excited'}
COLORS   = {'happy':(0,255,150),'sad':(200,100,0),'angry':(0,0,255),
            'surprised':(255,200,0),'excited':(255,0,200)}
CSV_FILE = 'data.csv'


def normalize_landmarks(landmarks):
    """
    Normalisasi supaya classifier tidak terpengaruh posisi & ukuran tangan.
    - Geser semua titik ke origin (wrist = titik 0)
    - Bagi dengan jarak wrist ke MCP jari tengah (titik 9) sebagai skala
    """
    pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])
    pts = pts - pts[0]
    scale = np.linalg.norm(pts[9])
    if scale > 0:
        pts = pts / scale
    return pts.flatten().tolist()


def draw_hand(frame, landmarks, h, w):
    """Gambar titik dan tulang tangan pakai OpenCV."""
    pts = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]
    for a, b in HAND_CONNECTIONS:
        cv2.line(frame, pts[a], pts[b], (0, 255, 100), 2)
    for x, y in pts:
        cv2.circle(frame, (x, y), 5, (255, 0, 120), -1)
        cv2.circle(frame, (x, y), 5, (255, 255, 255), 1)


def main():
    # Setup MediaPipe Tasks
    options = mp_vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    landmarker = mp_vision.HandLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(0)
    current_emotion = None
    collected = {e: 0 for e in EMOTIONS.values()}
    all_data = []

    # Load data yang sudah ada
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'r') as f:
            for row in csv.reader(f):
                if row:
                    all_data.append(row)
                    if row[0] in collected:
                        collected[row[0]] += 1
        print(f"Loaded {len(all_data)} existing samples")

    print("\nKontrol: 1=happy  2=sad  3=angry  4=surprised  5=excited")
    print("SPACE=simpan | Z=undo terakhir | Q=selesai\n")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]

        # Deteksi landmark
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(time.time() * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        landmarks = None
        if result.hand_landmarks:
            landmarks = result.hand_landmarks[0]
            draw_hand(frame, landmarks, h, w)

        # UI overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 120), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

        if current_emotion:
            color = COLORS[current_emotion]
            cv2.putText(frame, f"Mode: {current_emotion.upper()}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

        x_pos = 10
        for key, name in EMOTIONS.items():
            count = collected[name]
            color = (0, 255, 0) if count >= 30 else (120, 120, 120)
            cv2.putText(frame, f"[{key}]{name}:{count}", (x_pos, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)
            x_pos += 130

        cv2.putText(frame, "SPACE=simpan | Z=undo | Q=selesai", (10, 108),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)

        cv2.imshow('Collect Gesture Data', frame)
        key = cv2.waitKey(1) & 0xFF

        if chr(key) in EMOTIONS:
            current_emotion = EMOTIONS[chr(key)]
            print(f"[MODE] {current_emotion}")
        elif key == ord(' '):
            if current_emotion is None:
                print("Pilih emosi dulu (tekan 1-5)!")
            elif landmarks:
                flat = normalize_landmarks(landmarks)
                all_data.append([current_emotion] + flat)
                collected[current_emotion] += 1
                print(f"Saved: {current_emotion} ({collected[current_emotion]} samples)")
            else:
                print("Tangan tidak terdeteksi!")
        elif key in (ord('z'), ord('Z')):
            if all_data:
                removed = all_data.pop()
                label = removed[0]
                if label in collected and collected[label] > 0:
                    collected[label] -= 1
                print(f"Undo: hapus 1 sampel '{label}' ({collected[label]} tersisa)")
            else:
                print("Tidak ada sampel yang bisa di-undo")
        elif key in (ord('q'), ord('Q')):
            break

    cap.release()
    cv2.destroyAllWindows()
    landmarker.close()

    with open(CSV_FILE, 'w', newline='') as f:
        csv.writer(f).writerows(all_data)

    print(f"\nTotal: {sum(collected.values())} samples")
    for name, count in collected.items():
        status = "OK" if count >= 30 else f"perlu {30 - count} lagi"
        print(f"  {name}: {count} [{status}]")
    print(f"Disimpan ke {CSV_FILE}")


if __name__ == '__main__':
    main()
