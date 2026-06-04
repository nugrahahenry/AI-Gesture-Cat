"""
Crop stiker individual dari pack image download (1).jpg
Jalankan sekali, hasilnya masuk ke folder stickers/

Cara pakai:
  pip install Pillow
  python crop_stickers.py
"""

from PIL import Image
import os

src = os.path.join('stickers', 'download (1).jpg')
img = Image.open(src)
w, h = img.size
print(f"Pack size: {w} x {h}")

# Koordinat crop (left, top, right, bottom) — sesuaikan kalau perlu
# Berdasarkan posisi di gambar illustrated shark cat pack
crops = {
    'sad':       (0,    0,    w//2, h//5),          # kiri atas - shark cat rebahan (sad/tired)
    'surprised': (w//2, 0,    w,    h//5),           # kanan atas - shark cat santai
    'excited':   (0,    h//5, w//2, 2*h//5),         # kiri baris 2 - shark cat happy
}

out_dir = 'stickers'
for name, box in crops.items():
    cropped = img.crop(box)
    out_path = os.path.join(out_dir, f'{name}_shark.png')
    # Simpan sebagai PNG (bisa handle transparency lebih baik)
    cropped = cropped.resize((300, 300), Image.LANCZOS)
    cropped.save(out_path)
    print(f"Saved: {out_path}")

print("\nDone! Cek folder stickers/ dan update nama file di STICKERS config di index.html")
print("Kalau hasilnya kurang tepat, sesuaikan koordinat 'crops' di script ini.")
