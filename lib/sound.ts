/**
 * lib/sound — phản hồi âm thanh (Howler), tôn trọng cờ sound_enabled.
 * No-op nếu SSR / file thiếu / autoplay bị chặn. Asset đặt ở public/sounds/.
 */
"use client";

import { Howl } from "howler";

type Key = "correct" | "wrong" | "complete";
const FILES: Record<Key, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  complete: "/sounds/complete.mp3",
};

const cache = new Map<Key, Howl>();

function get(key: Key): Howl | null {
  if (typeof window === "undefined") return null;
  if (!cache.has(key)) {
    try {
      cache.set(key, new Howl({ src: [FILES[key]], volume: 0.5, html5: true }));
    } catch {
      return null;
    }
  }
  return cache.get(key) ?? null;
}

function play(key: Key, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    get(key)?.play();
  } catch {
    /* autoplay/asset thiếu → bỏ qua */
  }
}

export const playCorrect = (enabled: boolean) => play("correct", enabled);
export const playWrong = (enabled: boolean) => play("wrong", enabled);
export const playComplete = (enabled: boolean) => play("complete", enabled);
