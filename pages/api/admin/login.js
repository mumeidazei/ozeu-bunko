export default async function handler(req, res) {
  // CORS設定（ツール対応）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, password } = req.body;

  // 管理者認証
  const ADMIN_ID = 'mumeidayo';
  const ADMIN_PASSWORD = 'mumei1215';

  if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
    return res.status(200).json({ 
      success: true,
      message: 'ログイン成功'
    });
  } else {
    return res.status(401).json({ 
      success: false,
      error: 'IDまたはパスワードが正しくありません' 
    });
  }
}
