# Catmoji — Training Pipeline (ML)

> Folder ini = **semua urusan Python/ML** buat bikin model deteksi gesture.
> Web app-nya (`../index.html`) **nggak butuh folder ini pas runtime** — dia cuma
> baca `../model_data.js` + `../face.js`. Jadi ini murni buat (re)train.

## Urutan pipeline (kalau mau retrain dari nol)
1. **`collect_data.py`** — buka webcam, tekan `1`=happy `2`=sad `3`=angry `4`=surprised `5`=excited,
   SPACE buat rekam frame. Output → `data.csv`. (butuh `hand_landmarker.task`, auto-download.)
2. **`clean_data.py`** — bersihin outlier/duplikat di `data.csv`.
3. **`train_classifier.py`** — train sklearn (RandomForest/GradientBoost + augmentasi mirror/flip).
   Output → `model.pkl` + `model_info.json`.
4. **`export_data.py`** — ubah `data.csv` jadi **`../model_data.js`** (ROOT project, di-load index.html).
   ⚠️ Ini yang bikin app jalan 100% di browser (kNN) — output-nya ke root, bukan sini.

> Gesture = jumlah jari: **1 happy · 2 sad · 3 angry · 4 surprised · 5 excited.**

## Legacy (nggak dipakai lagi, disimpen buat referensi)
- **`app.py`** — Flask predict server jaman awal. Udah diganti kNN di browser (via `model_data.js`).
- **`crop_stickers.py`** + **`stickers/`** — tool + aset stiker "shark cat" lama. Udah diganti
  maskot **Moji** di `../assets/stickers/`.

## Catatan
- Pakai Python venv di root (`../venv/`) atau bikin baru: `pip install -r requirements.txt`.
  (venv lama mungkin path-nya basi setelah folder pindah — recreate kalau error.)
- File berat (`data.csv`, `model.pkl`, `hand_landmarker.task`) **gitignored** — nggak ke GitHub/Vercel.
