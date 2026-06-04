"""
Tool untuk hapus data latih per emosi.
Pakai ini kalau kamu salah input gesture saat collect.

Cara pakai:
  python clean_data.py
"""

import csv
from collections import Counter

CSV_FILE = 'data.csv'

# Load semua data
rows = []
with open(CSV_FILE, 'r') as f:
    for row in csv.reader(f):
        if len(row) == 64:
            rows.append(row)

if not rows:
    print("data.csv kosong atau tidak ditemukan.")
    exit()

# Tampilkan statistik
labels = [r[0] for r in rows]
stats  = Counter(labels)
print(f"\nTotal data saat ini: {len(rows)} samples\n")
for label, count in sorted(stats.items()):
    bar = '█' * (count // 5)
    print(f"  {label:12} {count:3} samples  {bar}")

print("\nKetik nama emosi yang mau dihapus (pisah koma).")
print("Atau ketik 'all' untuk hapus semua dan mulai dari nol.")
print("Atau tekan Enter untuk batal.\n")
print("Contoh: sad,surprised")
inp = input("> ").strip()

if not inp:
    print("Dibatalkan.")
    exit()

if inp.lower() == 'all':
    to_delete = set(stats.keys())
    print(f"\nAkan hapus SEMUA {len(rows)} samples.")
else:
    to_delete = {x.strip().lower() for x in inp.split(',')}
    invalid = to_delete - set(stats.keys())
    if invalid:
        print(f"\nPeringatan: emosi tidak dikenal — {invalid}")
        to_delete -= invalid

if not to_delete:
    print("Tidak ada yang dihapus.")
    exit()

print(f"\nAkan menghapus data untuk: {', '.join(sorted(to_delete))}")
confirm = input("Yakin? (y/n): ").strip().lower()
if confirm != 'y':
    print("Dibatalkan.")
    exit()

# Filter + simpan
kept    = [r for r in rows if r[0] not in to_delete]
deleted = len(rows) - len(kept)

with open(CSV_FILE, 'w', newline='') as f:
    csv.writer(f).writerows(kept)

print(f"\n✓ Dihapus: {deleted} samples")
print(f"✓ Tersisa: {len(kept)} samples")

if kept:
    remaining = Counter(r[0] for r in kept)
    for label, count in sorted(remaining.items()):
        print(f"  {label}: {count}")

print("\nLangkah selanjutnya:")
print("  1. python collect_data.py  ← isi ulang emosi yang dihapus")
print("  2. python train_classifier.py")
print("  3. python export_data.py   ← update model di browser")
