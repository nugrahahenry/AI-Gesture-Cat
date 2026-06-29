// ─── /api/tts ─────────────────────────────────────────────────────────────
// Vercel serverless function — proxy Text-to-Speech ke Gemini TTS.
//
// Kenapa proxy (bukan panggil Gemini langsung dari index.html)?
//   1. API key TIDAK ke-expose ke publik (dulu ELEVENLABS_KEY ketulis di
//      index.html → siapa pun bisa nyolong & ngabisin kuota).
//   2. Bisa rotasi banyak key Gemini → kuota gabungan gede, anti rate-limit.
//
// Input  : POST { "text": "...", "voice": "Sulafat" (opsional) }
// Output : audio/wav (24kHz, 16-bit mono) — langsung bisa diputar <audio>/new Audio()
//
// ENV yang dibaca (set di Vercel → Project → Settings → Environment Variables):
//   GEMINI_API_KEYS   : daftar key dipisah koma, mis. "AIza...A,AIza...B,AIza...C"
//   GEMINI_TTS_VOICE  : (opsional) nama voice default, mis. "Sulafat" (warm)
//   GEMINI_TTS_MODEL  : (opsional) override model, default gemini-2.5-flash-preview-tts
//
// Catatan: ini cuma jalan kalau di-deploy ke Vercel (atau `vercel dev` lokal).
// Buka index.html langsung dari file:// → /api/tts tidak ada → otomatis
// fallback ke Web Speech API (suara browser). Itu by design, bukan bug.

const DEFAULT_VOICE = 'Sulafat'; // warm — cocok buat intro ramah. Lihat daftar di README.
const MODELS = [
  process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts', // stabil
  'gemini-3.1-flash-tts-preview',                                  // cadangan (terbaru)
];
const MAX_TEXT = 800; // batas aman biar endpoint publik nggak disalahgunakan

// Acak urutan array (Fisher–Yates) — supaya beban tersebar rata antar key
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Bungkus PCM mentah (s16le) jadi file WAV — browser nggak bisa putar PCM telanjang,
// tapi WAV cuma butuh header 44 byte di depannya. Ini pembungkusnya.
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bits = 16) {
  const blockAlign = (channels * bits) >> 3;
  const byteRate = sampleRate * blockAlign;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);          // ukuran sub-chunk fmt
  h.writeUInt16LE(1, 20);           // format = PCM
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(bits, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// Panggil Gemini TTS sekali. Return Buffer WAV kalau sukses, atau lempar error.
async function geminiTTS(model, key, text, voice) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Framing "Bacakan:" — cegah Gemini TTS kadang BALIK TEKS (error 400
      // "tried to generate text") buat kalimat pendek. Directive ini ditafsir
      // sebagai gaya, bukan ikut dibacakan.
      contents: [{ parts: [{ text: `Bacakan dengan ramah dan jelas: ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    const err = new Error(`Gemini ${resp.status}: ${body.slice(0, 160)}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  const b64 = part?.inlineData?.data;
  if (!b64) {
    // Kadang model balikin teks, bukan audio (lihat 'Limitations' di docs) → anggap retryable
    const e = new Error('Gemini tidak mengembalikan audio');
    e.status = 502;
    throw e;
  }

  // Ambil sample-rate dari mimeType kalau ada, mis. "audio/L16;codec=pcm;rate=24000"
  const mime = part.inlineData.mimeType || '';
  const rate = parseInt((mime.match(/rate=(\d+)/) || [])[1], 10) || 24000;
  return pcmToWav(Buffer.from(b64, 'base64'), rate);
}

module.exports = async (req, res) => {
  // CORS (aman buat same-origin; berguna kalau test dari origin lain)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // req.body kadang sudah obj (Vercel auto-parse JSON), kadang string
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const text = (body?.text || '').toString().trim();
  const voice = (body?.voice || process.env.GEMINI_TTS_VOICE || DEFAULT_VOICE).toString();

  if (!text) return res.status(400).json({ error: 'Field "text" wajib diisi' });
  if (text.length > MAX_TEXT) return res.status(413).json({ error: `Teks maks ${MAX_TEXT} karakter` });

  const keys = (process.env.GEMINI_API_KEYS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (keys.length === 0) {
    // Tidak ada key → kasih sinyal jelas ke frontend supaya fallback ke Web Speech
    return res.status(503).json({ error: 'GEMINI_API_KEYS belum di-set di environment' });
  }

  // Coba tiap model, tiap key (acak). Lewati key yang kena 429 (rate-limit) /
  // 500/502 (error acak Gemini) → coba key/model berikutnya.
  let lastErr = null;
  for (const model of MODELS) {
    for (const key of shuffle(keys)) {
      try {
        const wav = await geminiTTS(model, key, text, voice);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // teks intro tetap → boleh di-cache 1 hari
        res.setHeader('X-TTS-Model', model);
        return res.status(200).send(wav);
      } catch (e) {
        lastErr = e;
        const retryable = [429, 500, 502, 503].includes(e.status);
        console.warn(`TTS gagal (${model}, key ...${key.slice(-6)}): ${e.message}`);
        if (!retryable) break; // error non-retryable (mis. 400/403) → ganti model, jangan buang semua key
      }
    }
  }

  // Semua percobaan gagal → frontend akan fallback ke Web Speech API
  return res.status(502).json({ error: 'Semua key/model TTS gagal', detail: lastErr?.message });
};
