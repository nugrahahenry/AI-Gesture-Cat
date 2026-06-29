# Catmoji — DESIGN.md (Cetak Biru Redesign)

> Tujuan: buang kesan **"AI slop"** (ungu #7C5CFC → pink #FF6B9D + glassmorphism),
> bikin identitas **DISTINCTIVE + playful + portfolio-worthy**. Acuan implementasi CSS vanilla.

## Gaya: Neubrutalism (playful)
Border **ink tegas**, **shadow offset keras** (mis. `4px 4px 0 #1B1B1F`), panel chunky
rounded, warna hangat berani. **NO** glass/blur, **NO** gradient ungu-pink, **NO** soft shadow.

## Palette
| Token | Hex | Pakai |
|---|---|---|
| Cream (bg) | `#FFF7ED` | latar app |
| Ink | `#1B1B1F` | teks + border + shadow |
| Tangerine (primary/CTA) | `#FF6A3D` | tombol utama, highlight |
| Teal (secondary) | `#17B0A0` | aksen, success |
| Yellow (accent) | `#FFC93C` | sorotan, badge |
| Coral/Red | `#E5484D` | error/danger |

Di atas kamera: panel **cream solid** + border ink + hard shadow (bukan blur).

## Motif bintang ⭐ (benang merah antar-produk)
Henry suka motif bintang (Canopus→Canox, Nova→Neurova). Jadiin **aksen HALUS** biar
Catmoji sekeluarga sama produk lain — tanpa ngebunuh vibe lucu/neubrutalist:
- Bintang kecil di logo + **glint bintang di mata kucing**.
- **Sparkle bintang** pas momen senang: wajah dikenali, intro selesai, dapet skor.
- BUKAN starfield kosmik penuh (itu balik ke "slop") — cukup **HINT** bintang.
> Catmoji = produk PERTAMA yang di-redesign → jadi **acuan bahasa desain** (neubrutalism
> + hint bintang) yang nanti diadopsi produk lain (Canox/Neurova/dll) biar seragam.

## Tipografi (Google Fonts)
- **Heading**: Bricolage Grotesque (chunky, ekspresif — anti default)
- **Body**: Plus Jakarta Sans

## Motion (snappy & playful)
- Klik tombol: **press-down** (`translate(2px,2px)` + shadow mengecil)
- Stiker/badge: **bounce pop**
- Transisi 120–220ms, cubic-bezier mantul; `prefers-reduced-motion` → matiin

## Layout Intro (visi Henry)
- 💻 **Desktop (≥900px)**: **SPLIT** — Kiri = panel UI (sapaan / form / kontrol).
  Kanan = kamera (wajah **JELAS**, nggak ketutup). Scan effect di sisi kanan.
- 📱 **Mobile**: **STACK** — form full-screen dulu (tanpa wajah di belakang).
  Habis submit → animasi: sapaan ke **ATAS**, wajah muncul di **BAWAH**.
- ✨ **Sapaan LIVE**: judul "Hai, [nama]!" di panel kiri **update real-time** ngikutin
  kolom nama yang lagi diketik guest (pakai nama depan). Owner → langsung nama owner.

## States (WAJIB lengkap — pakai ikon SVG, bukan emoji)
- **Loading**: face scan (sweep), TTS (spinner di tombol), enroll (progress bar), ganti mode.
- **Success**: wajah dikenali (badge teal), enroll sukses, dll.
- **Error**: Human gagal load, wajah tak terdeteksi, TTS gagal, kamera ditolak.
- Tiap state: warna + ikon + microcopy jelas.

## Komponen
- **Tombol**: border ink + hard shadow + press-down; CTA = tangerine fill.
- **Input/select**: border ink, fokus = ring tangerine.
- **Card/panel**: cream solid, border ink 2–3px, shadow keras.
- **Mode tabs**: chunky; aktif = tangerine fill.
- **Maskot kucing**: tetap (brand).

## Maskot & Logo — brief buat GPT (Henry generate sendiri, taruh di folder)
Generate di GPT/image-gen → simpan ke `gesture-cat-sticker/assets/`.
**Gaya**: neubrutalism — **outline ink tebal** (#1B1B1F), fill flat, palette tangerine
#FF6A3D / cream #FFF7ED / teal #17B0A0 / yellow #FFC93C + **hint bintang** ⭐.
- **Maskot** (`mascot.png`, PNG transparan): kucing bulat, lucu, ramah; outline tebal;
  **glint bintang di mata**. Idealnya beberapa ekspresi (senang/kaget/sedih) buat reuse.
- **Logo/wordmark** (`logo.svg` / PNG transparan): teks "Catmoji" (Bricolage Grotesque
  bold) + kepala kucing kecil + bintang. Sediakan versi horizontal + ikon-saja (favicon).
- **Hindari**: gradient, glow, gaya 3D realistis, ungu-pink.

## Anti-pattern (JANGAN)
Gradient ungu→pink · glassmorphism/blur · soft drop-shadow · emoji sebagai ikon
fungsional · card di TENGAH nutupin wajah · z-index > 9999 · `!important`.
