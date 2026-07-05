/* face.js — Face ID via @vladmandic/human. Reusable: Catmoji & Polara.
 * Lazy-load: library Human (1.5 MB) cuma di-download pas PERTAMA dipakai,
 * jadi startup app tetap ringan. Models dari CDN resmi (sudah diverifikasi 200).
 *
 * API global window.CatFace:
 *   ensureReady(videoEl)         → Promise<bool>  (siapin Human + model)
 *   enrollOwner(onProgress,name) → Promise<bool>  (rekam wajah owner → localStorage)
 *   recognize()                  → Promise<{isOwner, similarity, name, emotion}>
 *   isEnrolled() / clearOwner() / detectOnce()
 */
(function () {
  'use strict';

  const OWNER_KEY     = 'catmoji_owner_face';
  const SIM_THRESHOLD = 0.6;   // 0..1 — makin tinggi makin ketat. Henry ~0.906, jadi 0.6 lega
                               // buat dia + lebih susah ditembus orang lain. Naikin ke 0.65-0.7
                               // kalau ada yang mirip ke-accept.
  const ENROLL_SAMPLES = 8;
  // Enroll TERPANDU (ala Face-ID): user diarahkan nengok tiap arah → rekam embedding
  // dari banyak sudut. Recognition nanti ambil similarity TERTINGGI dari semua sudut,
  // jadi walau wajah miring/dongak/nunduk tetep kenal (bukan cuma pas depan-lurus).
  const ENROLL_POSES = [
    { key: 'center', dir: 'center', main: 'PAS-IN MUKA',   sub: 'Lihat lurus ke kamera' },
    { key: 'right',  dir: 'right',  main: 'TENGOK KANAN',  sub: 'Putar kepala pelan ke kanan' },
    { key: 'left',   dir: 'left',   main: 'TENGOK KIRI',   sub: 'Putar kepala pelan ke kiri' },
    { key: 'up',     dir: 'up',     main: 'DONGAK DIKIT',  sub: 'Angkat dagu, lihat ke atas' },
    { key: 'down',   dir: 'down',   main: 'TUNDUK DIKIT',  sub: 'Turunin dagu, lihat ke bawah' },
  ];
  const ENROLL_PER_POSE = 3;   // 5 sudut × 3 = ~15 sampel (jauh lebih tahan dari 8 frontal)
  const HUMAN_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.js';

  const config = {
    modelBasePath: 'https://vladmandic.github.io/human-models/models/',
    face: {
      enabled: true,
      detector: { rotation: false, maxDetected: 1, minConfidence: 0.4 },
      mesh: { enabled: true },
      iris: { enabled: false },
      description: { enabled: true },  // embedding buat verifikasi identitas
      emotion: { enabled: true },      // dipakai nanti (emosi wajah universal)
      antispoof: { enabled: false },
      liveness: { enabled: false },
    },
    hand: { enabled: false }, body: { enabled: false },
    object: { enabled: false }, gesture: { enabled: false },
    filter: { enabled: true }, segmentation: { enabled: false },
  };

  let human = null, video = null, loadingPromise = null, modelsLoaded = false;

  function loadLib() {
    if (window.Human) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = HUMAN_CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('gagal download library Human (cek koneksi)'));
      document.head.appendChild(s);
    });
  }

  async function ensureReady(videoEl) {
    if (videoEl) video = videoEl;
    if (modelsLoaded) return true;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      console.log('[CatFace] menyiapkan Human…');
      await loadLib();
      const H = (window.Human && (window.Human.Human || window.Human.default)) || window.Human;
      human = new H(config);
      await human.load();
      try { await human.warmup(); } catch (e) {}
      modelsLoaded = true;
      console.log('[CatFace] siap ✓');
      return true;
    })();
    try { return await loadingPromise; }
    catch (e) { console.warn('[CatFace] gagal siap:', e.message); loadingPromise = null; return false; }
  }

  async function detectOnce() {
    if (!human || !video) return null;
    let res;
    try { res = await human.detect(video); } catch (e) { console.warn('[CatFace] detect error:', e.message); return null; }
    const f = res && res.face && res.face[0];
    if (!f) return null;
    const emb = f.embedding || f.descriptor;
    if (!emb || !emb.length) return null;
    const emo = (f.emotion && f.emotion[0]) ? f.emotion[0].emotion : null;
    const score = f.faceScore != null ? f.faceScore : (f.score != null ? f.score : (f.boxScore || 0));
    return { embedding: Array.from(emb), emotion: emo, score, box: f.box };
  }

  // ── Owner DITANAM (baked) — dikenali di SEMUA device tanpa ?setup ──
  // Diisi lewat file owner.js (di-load SEBELUM face.js di index.html):
  //     window.CATMOJI_OWNER = <hasil copy(localStorage.getItem('catmoji_owner_face'))>;
  // localStorage tetap menang kalau user enroll sendiri. Kalau owner.js kosong → null (form biasa).
  const DEFAULT_OWNER = (typeof window !== 'undefined' && window.CATMOJI_OWNER && window.CATMOJI_OWNER.embeddings) ? window.CATMOJI_OWNER : null;

  function _valid(o) { return !!(o && o.embeddings && o.embeddings.length); }
  function getOwner() {
    try { const o = JSON.parse(localStorage.getItem(OWNER_KEY) || 'null'); if (_valid(o)) return o; } catch (e) {}
    return _valid(DEFAULT_OWNER) ? DEFAULT_OWNER : null;   // fallback ke owner yang ditanam
  }
  function isEnrolled() { return !!getOwner(); }
  function clearOwner() { localStorage.removeItem(OWNER_KEY); }
  function exportOwner() { return JSON.stringify(getOwner()); }   // buat Henry copy → tanam ke DEFAULT_OWNER

  function simil(a, b) {
    if (human && typeof human.similarity === 'function') {
      try { return human.similarity(a, b); } catch (e) {}
    }
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
    return dot / ((Math.sqrt(na) * Math.sqrt(nb)) || 1);
  }

  async function enrollOwner(onProgress, name) {
    if (!(await ensureReady())) return false;
    const samples = [];
    for (let i = 0; i < ENROLL_SAMPLES; i++) {
      const d = await detectOnce();
      if (d && d.score > 0.55) samples.push(d.embedding);
      if (onProgress) onProgress(samples.length, ENROLL_SAMPLES);
      await new Promise(r => setTimeout(r, 350));
    }
    if (samples.length < 3) { console.warn('[CatFace] enroll gagal — wajah kurang kebaca'); return false; }
    localStorage.setItem(OWNER_KEY, JSON.stringify({ name: name || 'Owner', embeddings: samples, ts: Date.now() }));
    console.log(`[CatFace] owner "${name || 'Owner'}" terdaftar ✓ (${samples.length} sampel)`);
    return true;
  }

  // Enroll TERPANDU — UI ngedrive lewat callback (onStep/onCapture/onPoseDone).
  // cb = { name, onStep(p,pose,totalPoses,totalSamples), onCapture(p,done,total),
  //        onWait(p), onPoseDone(p,got) }.  Semua callback opsional.
  async function enrollOwnerGuided(cb) {
    cb = cb || {};
    if (!(await ensureReady())) return false;
    const samples = [];
    const total = ENROLL_POSES.length * ENROLL_PER_POSE;
    for (let p = 0; p < ENROLL_POSES.length; p++) {
      const pose = ENROLL_POSES[p];
      if (cb.onStep) cb.onStep(p, pose, ENROLL_POSES.length, total);
      await new Promise(r => setTimeout(r, 750));       // kasih waktu user gerak ke arah pose (settle)
      let got = 0, tries = 0;
      const maxTries = ENROLL_PER_POSE * 12;            // kalau susah kebaca → nyerah, lanjut pose lain
      while (got < ENROLL_PER_POSE && tries < maxTries) {
        tries++;
        const d = await detectOnce();
        if (d && d.score > 0.5 && faceBigEnough(d.box)) {
          samples.push(d.embedding); got++;
          if (cb.onCapture) cb.onCapture(p, samples.length, total);
        } else if (cb.onWait) { cb.onWait(p); }
        await new Promise(r => setTimeout(r, 160));
      }
      if (cb.onPoseDone) cb.onPoseDone(p, got);
    }
    if (samples.length < 4) { console.warn('[CatFace] enroll terpandu gagal — wajah kurang kebaca'); return false; }
    localStorage.setItem(OWNER_KEY, JSON.stringify({ name: cb.name || 'Owner', embeddings: samples, ts: Date.now() }));
    console.log(`[CatFace] owner "${cb.name || 'Owner'}" terdaftar ✓ (${samples.length} sampel · ${ENROLL_POSES.length} sudut)`);
    return true;
  }

  // Wajah harus cukup besar di frame (bukan jauh/keintip). Lenient kalau format box beda.
  function faceBigEnough(box) {
    const w = Array.isArray(box) ? box[2] : (box && box.width) || 0;
    if (!w) return true;
    const vw = (video && video.videoWidth) || 640;
    return w >= vw * 0.12;
  }

  async function recognize() {
    const owner = getOwner();
    if (!owner || !owner.embeddings) return { isOwner: false, similarity: 0, reason: 'belum enroll' };
    if (!(await ensureReady())) return { isOwner: false, similarity: 0, reason: 'human gagal load' };

    // Sample BEBERAPA frame: butuh wajah jelas di banyak frame + similarity konsisten.
    // Ini yang benerin "ketutup tapi masih dikenali" — kalau wajah ketutup, frame
    // valid sedikit → langsung dianggap "tak terdeteksi".
    const FRAMES = 4, MIN_FACE_FRAMES = 2;     // lebih sedikit = lebih ringan (anti-lag)
    let faceFrames = 0, best = 0; const sims = [];
    for (let i = 0; i < FRAMES; i++) {
      const d = await detectOnce();
      if (d && d.score > 0.6 && faceBigEnough(d.box)) {
        faceFrames++;
        let s = 0;
        for (const e of owner.embeddings) { const x = simil(d.embedding, e); if (x > s) s = x; }
        sims.push(s); if (s > best) best = s;
      }
      await new Promise(r => setTimeout(r, 150));
    }
    if (faceFrames < MIN_FACE_FRAMES) {
      console.log(`[CatFace] wajah kurang jelas (${faceFrames}/${FRAMES} frame) → TIDAK dikenali`);
      return { isOwner: false, similarity: best, reason: 'wajah tak terdeteksi' };
    }
    // Pakai MEDIAN (lebih jujur dari best — butuh mayoritas frame mirip)
    sims.sort((a, b) => a - b);
    const med = sims[Math.floor(sims.length / 2)];
    console.log(`[CatFace] owner: median=${med.toFixed(3)} best=${best.toFixed(3)} (threshold ${SIM_THRESHOLD}, ${faceFrames}/${FRAMES} frame wajah)`);
    return { isOwner: med >= SIM_THRESHOLD, similarity: med, name: owner.name };
  }

  window.CatFace = { ensureReady, detectOnce, enrollOwner, enrollOwnerGuided, ENROLL_POSES, recognize, isEnrolled, clearOwner, exportOwner, SIM_THRESHOLD };
})();
