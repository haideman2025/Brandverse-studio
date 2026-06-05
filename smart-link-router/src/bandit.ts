// =====================================================================
// Multi-armed bandit — chọn landing page (variant) nào cho khách kế tiếp.
//
// Mục tiêu: vừa "khám phá" (cho mọi LDP cơ hội) vừa "khai thác" (dồn
// traffic về LDP đang chuyển đổi tốt nhất) — tự động, không cần chỉnh tay.
//
// Mặc định dùng Thompson Sampling trên mô hình Beta-Bernoulli:
//   - Mỗi LDP có (conversions, clicks). Tỉ lệ chuyển đổi thật là ẩn số.
//   - Ta coi nó ~ Beta(conversions + 1, clicks - conversions + 1).
//   - Mỗi lượt: lấy 1 mẫu ngẫu nhiên từ Beta của từng LDP, chọn LDP có
//     mẫu cao nhất. LDP tốt sẽ thắng phần lớn lượt, nhưng LDP chưa rõ
//     (ít dữ liệu) vẫn được thử nhờ phương sai lớn -> tự cân bằng.
// =====================================================================

export interface VariantStat {
  id: string;
  url: string;
  label: string | null;
  weight: number;
  active: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface LinkConfig {
  slug: string;
  mode: string; // 'auto' | 'manual'
  epsilon: number;
  min_per_variant: number;
}

// --- RNG tiện ích -----------------------------------------------------

function randUniform(): number {
  // crypto cho phân phối đều chất lượng tốt hơn Math.random trên edge.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] + 0.5) / 4294967296; // (0,1)
}

function randNormal(): number {
  // Box-Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = randUniform();
  while (v === 0) v = randUniform();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Lấy mẫu Gamma(shape>=1, 1) bằng Marsaglia & Tsang.
function sampleGamma(shape: number): number {
  // Với shape < 1, boost rồi hạ xuống (ở đây shape luôn >= 1 nên hiếm dùng).
  if (shape < 1) {
    const u = randUniform();
    return sampleGamma(1 + shape) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let x = 0;
    let v = 0;
    do {
      x = randNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = randUniform();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// Lấy mẫu Beta(a, b) = Ga / (Ga + Gb).
function sampleBeta(a: number, b: number): number {
  const ga = sampleGamma(a);
  const gb = sampleGamma(b);
  return ga / (ga + gb);
}

// --- Chọn variant -----------------------------------------------------

function weightedPick(variants: VariantStat[]): VariantStat {
  const total = variants.reduce((s, v) => s + Math.max(0, v.weight), 0);
  if (total <= 0) return variants[Math.floor(randUniform() * variants.length)];
  let r = randUniform() * total;
  for (const v of variants) {
    r -= Math.max(0, v.weight);
    if (r <= 0) return v;
  }
  return variants[variants.length - 1];
}

/**
 * Chọn 1 variant cho lượt click hiện tại.
 * Trả về variant được chọn (đã lọc active).
 */
export function pickVariant(cfg: LinkConfig, all: VariantStat[]): VariantStat {
  const variants = all.filter((v) => v.active === 1);
  if (variants.length === 0) throw new Error('no active variants');
  if (variants.length === 1) return variants[0];

  // Mode thủ công: chia theo weight do người dùng đặt.
  if (cfg.mode === 'manual') return weightedPick(variants);

  // 1) WARMUP: LDP nào chưa đủ min_per_variant click thì ưu tiên cho đủ
  //    dữ liệu trước khi bandit "phán". Chọn cái ít click nhất trong nhóm này.
  const cold = variants.filter((v) => v.clicks < cfg.min_per_variant);
  if (cold.length > 0) {
    cold.sort((a, b) => a.clicks - b.clicks);
    return cold[0];
  }

  // 2) EPSILON: một phần nhỏ traffic luôn random để không bao giờ "mù"
  //    với LDP đang thua (phòng khi thị trường đổi).
  if (randUniform() < cfg.epsilon) {
    return variants[Math.floor(randUniform() * variants.length)];
  }

  // 3) THOMPSON SAMPLING trên tỉ lệ chuyển đổi.
  let best = variants[0];
  let bestSample = -1;
  for (const v of variants) {
    const conv = Math.min(v.conversions, v.clicks);
    const a = conv + 1;
    const b = v.clicks - conv + 1;
    const sample = sampleBeta(a, b);
    if (sample > bestSample) {
      bestSample = sample;
      best = v;
    }
  }
  return best;
}

/**
 * Tính các chỉ số hiển thị + đề xuất "người thắng" cho dashboard/API.
 */
export function summarize(variants: VariantStat[]) {
  const rows = variants.map((v) => {
    const cr = v.clicks > 0 ? v.conversions / v.clicks : 0;
    // Khoảng tin cậy Wilson 95% (cận dưới) — xếp hạng công bằng khi click ít.
    const z = 1.96;
    const n = v.clicks;
    const phat = cr;
    const wilsonLower =
      n > 0
        ? (phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
          (1 + (z * z) / n)
        : 0;
    return {
      id: v.id,
      label: v.label,
      url: v.url,
      active: v.active === 1,
      clicks: v.clicks,
      conversions: v.conversions,
      revenue: v.revenue,
      cr,
      crPct: +(cr * 100).toFixed(2),
      wilsonLower: +(wilsonLower * 100).toFixed(2),
      weight: v.weight,
    };
  });

  const eligible = rows.filter((r) => r.active && r.clicks > 0);
  const winner =
    eligible.length > 0
      ? eligible.reduce((a, b) => (b.wilsonLower > a.wilsonLower ? b : a))
      : null;

  const totals = rows.reduce(
    (acc, r) => {
      acc.clicks += r.clicks;
      acc.conversions += r.conversions;
      acc.revenue += r.revenue;
      return acc;
    },
    { clicks: 0, conversions: 0, revenue: 0 },
  );

  return {
    rows: rows.sort((a, b) => b.wilsonLower - a.wilsonLower),
    winner: winner ? winner.id : null,
    totals: {
      ...totals,
      cr: totals.clicks > 0 ? +((totals.conversions / totals.clicks) * 100).toFixed(2) : 0,
    },
  };
}
