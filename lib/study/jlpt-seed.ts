/**
 * Danh sách JLPT TĨNH (đóng gói trong repo, KHÔNG gọi API) cho cold start (docs/08 §3).
 * Mỗi mức gồm một số lemma phổ biến; getKnownLemmasForLevel gộp mọi mức ≤ level.
 * MVP: danh sách nhỏ minh hoạ; có thể mở rộng dần.
 */
export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

const LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

const BY_LEVEL: Record<JlptLevel, string[]> = {
  N5: [
    "私", "あなた", "人", "日", "本", "今日", "明日", "学校", "先生", "学生",
    "食べる", "飲む", "見る", "行く", "来る", "する", "言う", "大きい", "小さい", "新しい",
    "水", "店", "国", "時間", "電車", "会う", "買う", "読む", "書く", "話す",
  ],
  N4: [
    "会議", "資料", "予定", "場所", "意見", "説明", "準備", "連絡", "確認", "報告",
    "始める", "終わる", "決める", "送る", "受ける", "answer", "問題", "答え", "理由", "方法",
  ],
  N3: [
    "影響", "状況", "判断", "提案", "対応", "実際", "結果", "原因", "解決", "管理",
    "増える", "減る", "比べる", "選ぶ", "進む", "経験", "技術", "情報", "関係", "目的",
  ],
  N2: [
    "効率", "傾向", "課題", "成果", "戦略", "需要", "供給", "改善", "把握", "検討",
    "促進", "維持", "削減", "導入", "達成", "評価", "予測", "前提", "観点", "要因",
  ],
  N1: [
    "概念", "妥当", "顕著", "懸念", "是正", "遂行", "齟齬", "潜在", "網羅", "示唆",
    "逐次", "緻密", "膨大", "発端", "依存", "整合", "抽出", "脆弱", "頑健", "冗長",
  ],
};

/** Mọi lemma ở/dưới `level` (gộp các mức dễ hơn). */
export function getKnownLemmasForLevel(level: JlptLevel): string[] {
  const idx = LEVELS.indexOf(level);
  if (idx < 0) return [];
  const out: string[] = [];
  for (let i = 0; i <= idx; i++) out.push(...BY_LEVEL[LEVELS[i]]);
  return out;
}

export function isJlptLevel(v: string): v is JlptLevel {
  return (LEVELS as string[]).includes(v);
}
