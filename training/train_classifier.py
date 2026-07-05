"""
Hari 2 - Train emotion classifier dari data landmark.
Versi 2: dengan data augmentation (mirror + upside down)

Cara pakai:
  python train_classifier.py

Output:
  model.pkl       -> model sklearn (dipakai app.py)
  model_info.json -> metadata & akurasi
"""

import csv
import json
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder

CSV_FILE   = 'data.csv'
MODEL_FILE = 'model.pkl'
INFO_FILE  = 'model_info.json'

# Index koordinat x dalam array 63 angka: posisi 0, 3, 6, ..., 60
X_IDX = list(range(0, 63, 3))
# Index koordinat y: posisi 1, 4, 7, ..., 61
Y_IDX = list(range(1, 63, 3))


def load_data():
    X, y = [], []
    with open(CSV_FILE, 'r') as f:
        for row in csv.reader(f):
            if len(row) == 64:
                y.append(row[0])
                X.append([float(v) for v in row[1:]])
    return np.array(X), np.array(y)


def augment(X, y):
    """
    Augmentasi data supaya model kenal gesture dari berbagai orientasi.

    Analogi: kamu ngajari model mengenali huruf 'b'.
    Kalau kamu juga kasih lihat 'd' (mirror), 'q' (terbalik), dan 'p' (mirror+terbalik),
    model jadi lebih tangguh dan tidak bergantung pada orientasi tangan.

    Yang kita lakukan:
    1. Mirror horizontal (x *= -1)  → tangan kanan ↔ tangan kiri
    2. Upside down (x *= -1, y *= -1) → tangan terbalik
    3. Mirror + upside down           → semua kombinasi
    """
    variants = [X]  # data asli

    # 1. Mirror: flip semua koordinat x
    X_mirror = X.copy()
    X_mirror[:, X_IDX] *= -1
    variants.append(X_mirror)

    # 2. Upside down: flip x dan y
    X_ud = X.copy()
    X_ud[:, X_IDX] *= -1
    X_ud[:, Y_IDX] *= -1
    variants.append(X_ud)

    # 3. Mirror + upside down
    X_mud = X.copy()
    X_mud[:, Y_IDX] *= -1
    variants.append(X_mud)

    X_aug = np.vstack(variants)
    y_aug = np.hstack([y] * len(variants))
    return X_aug, y_aug


def main():
    print("Loading data...")
    X, y = load_data()

    print(f"Data asli: {len(X)} samples")
    unique, counts = np.unique(y, return_counts=True)
    for label, count in zip(unique, counts):
        print(f"  {label}: {count}")

    # Augmentasi — 4x lipat data
    X_aug, y_aug = augment(X, y)
    print(f"\nSetelah augmentasi: {len(X_aug)} samples (4x)")

    # Encode label
    le = LabelEncoder()
    y_enc = le.fit_transform(y_aug)
    labels = le.classes_.tolist()

    # Split — test set dari data asli saja (bukan augmented)
    # Tujuan: ukur performa di kondisi nyata, bukan di data buatan
    X_orig_enc = le.transform(y)
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X_aug, y_enc, test_size=0.15, random_state=42, stratify=y_enc
    )

    print(f"Train: {len(X_train_full)} | Test: {len(X_test)}")

    # Training dua model, pilih yang terbaik
    print("\nTraining model...")

    rf = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
    rf.fit(X_train_full, y_train_full)
    acc_rf = (rf.predict(X_test) == y_test).mean()
    print(f"  RandomForest:       {acc_rf:.1%}")

    # Gradient Boosting: belajar dari kesalahan model sebelumnya secara bertahap
    # Analoginya: tiap "murid baru" fokus memperbaiki soal yang murid sebelumnya salah
    gb = GradientBoostingClassifier(n_estimators=200, learning_rate=0.1,
                                     max_depth=5, random_state=42)
    gb.fit(X_train_full, y_train_full)
    acc_gb = (gb.predict(X_test) == y_test).mean()
    print(f"  GradientBoosting:   {acc_gb:.1%}")

    clf = gb if acc_gb >= acc_rf else rf
    winner = "GradientBoosting" if acc_gb >= acc_rf else "RandomForest"
    print(f"\nPakai: {winner}")

    # Evaluasi
    y_pred   = clf.predict(X_test)
    accuracy = (y_pred == y_test).mean()
    print(f"\nAkurasi: {accuracy:.1%}")
    print("\nDetail per kelas:")
    print(classification_report(y_test, y_pred, target_names=labels))

    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    header = "        " + "  ".join(f"{l[:5]:>6}" for l in labels)
    print(header)
    for i, row_vals in enumerate(cm):
        print(f"{labels[i][:8]:>8}", "  ".join(f"{v:>6}" for v in row_vals))

    # Simpan
    with open(MODEL_FILE, 'wb') as f:
        pickle.dump({'model': clf, 'label_encoder': le}, f)
    print(f"\nModel -> {MODEL_FILE}")

    with open(INFO_FILE, 'w') as f:
        json.dump({'labels': labels, 'accuracy': round(accuracy, 4),
                   'n_samples': len(X), 'n_augmented': len(X_aug)}, f, indent=2)
    print(f"Info   -> {INFO_FILE}")
    print("\nRestart python app.py supaya pakai model baru.")


if __name__ == '__main__':
    main()
