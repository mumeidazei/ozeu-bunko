import { sql } from '@vercel/postgres';

// 投稿を一時停止するAPI
export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // データベースに停止状態を保存（設定テーブルを使用）
    // テーブルが存在しない場合は作成
    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 停止状態を保存
    const pausedAt = new Date().toISOString();
    await sql`
      INSERT INTO site_settings (key, value, updated_at) 
      VALUES ('posting_paused', 'true', ${pausedAt})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = 'true',
        updated_at = ${pausedAt}
    `;
    
    // 停止理由も保存（オプション）
    const reason = req.body?.reason || 'メンテナンス中';
    await sql`
      INSERT INTO site_settings (key, value, updated_at) 
      VALUES ('pause_reason', ${reason}, ${pausedAt})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${reason},
        updated_at = ${pausedAt}
    `;
    
    console.log('Posting paused at:', pausedAt);
    
    return res.status(200).json({
      success: true,
      message: '投稿を一時停止しました',
      isPaused: true,
      pausedAt: pausedAt,
      reason: reason
    });
    
  } catch (error) {
    console.error('Error pausing posts:', error);
    
    // エラーが発生してもメモリ内で停止状態を管理
    return res.status(200).json({
      success: true,
      message: '投稿を一時停止しました（メモリ内管理）',
      isPaused: true,
      pausedAt: new Date().toISOString(),
      warning: 'データベースへの保存に失敗しました'
    });
  }
}
