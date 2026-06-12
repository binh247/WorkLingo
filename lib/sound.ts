/**
 * lib/sound — phản hồi âm thanh tổng hợp bằng Web Audio API (không cần file).
 * Âm "chính chủ" phong cách Duolingo: chuông sáng khi đúng (cao độ TĂNG theo
 * combo), "womp" trầm khi sai, jingle đi lên khi hoàn thành phiên.
 * No-op nếu SSR / autoplay bị chặn. Tôn trọng cờ sound_enabled.
 */
"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Trình duyệt suspend context tới khi có user gesture — các hàm play đều
  // được gọi từ click/keydown nên resume ở đây là đủ. So sánh khác "running"
  // (thay vì === "suspended") để bắt cả state "interrupted" của Safari/iOS
  // (sau cuộc gọi/Siri), nếu không âm thanh câm vĩnh viễn tới hết phiên.
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  return ctx;
}

/** Một nốt đơn: oscillator + envelope attack/decay ngắn. */
function note(
  ac: AudioContext,
  freq: number,
  at: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; glideTo?: number } = {},
) {
  const { type = "sine", gain = 0.22, glideTo } = opts;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/**
 * Đúng: 2 nốt sáng đi lên (kèm lớp triangle cho ấm). Combo càng cao,
 * cả cụm dịch lên ~1 bán âm/bậc (tối đa +8) — cảm giác "leo thang" như game.
 */
export function playCorrect(enabled: boolean, combo = 0) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const shift = Math.pow(2, Math.min(Math.max(combo - 1, 0), 8) / 12);
    const f1 = 659.25 * shift; // E5
    const f2 = 880.0 * shift; // A5
    note(ac, f1, t, 0.16, { type: "sine", gain: 0.2 });
    note(ac, f1 / 2, t, 0.16, { type: "triangle", gain: 0.1 });
    note(ac, f2, t + 0.085, 0.22, { type: "sine", gain: 0.22 });
    note(ac, f2 / 2, t + 0.085, 0.22, { type: "triangle", gain: 0.1 });
    // Combo cao (⚡): thêm "lấp lánh" 1 nốt quãng tám trên.
    if (combo >= 5) note(ac, f2 * 2, t + 0.17, 0.18, { gain: 0.12 });
  } catch {
    /* bỏ qua */
  }
}

/** Sai: "womp" trầm tụt xuống — square mềm qua envelope ngắn. */
export function playWrong(enabled: boolean) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const t = ac.currentTime;
    note(ac, 196, t, 0.28, { type: "square", gain: 0.08, glideTo: 130 });
    note(ac, 98, t, 0.3, { type: "sine", gain: 0.18, glideTo: 70 });
  } catch {
    /* bỏ qua */
  }
}

/** Hoàn thành phiên: arpeggio đi lên + nốt kết lấp lánh. */
export function playComplete(enabled: boolean) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const seq = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    seq.forEach((f, i) => {
      note(ac, f, t + i * 0.11, 0.3, { type: "sine", gain: 0.2 });
      note(ac, f / 2, t + i * 0.11, 0.3, { type: "triangle", gain: 0.09 });
    });
    note(ac, 2093, t + 0.46, 0.35, { gain: 0.1 }); // C7 sparkle
  } catch {
    /* bỏ qua */
  }
}
