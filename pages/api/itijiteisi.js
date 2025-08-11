// 一時停止状態を管理するAPI
// メモリ内で状態を保持（Vercelの制限により永続化はできない）

// グローバル変数として停止状態を管理
// 注意: Vercelのサーバーレス環境ではインスタンスが再起動すると状態がリセットされます
let isPaused = false;
let pausedAt = null;
let pausedBy = null;

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 現在の停止状態を返す
  return res.status(200).json({
    isPaused: isPaused,
    pausedAt: pausedAt,
    pausedBy: pausedBy,
    message: isPaused ? '投稿は一時停止中です' : '投稿可能です',
    status: isPaused ? 'paused' : 'active'
  });
}

// 状態を外部から変更できるようにエクスポート
export function getPauseState() {
  return { isPaused, pausedAt, pausedBy };
}

export function setPauseState(paused, by = 'admin') {
  isPaused = paused;
  pausedAt = paused ? new Date().toISOString() : null;
  pausedBy = paused ? by : null;
  return { isPaused, pausedAt, pausedBy };
}
