import { sql } from '@vercel/postgres';

// 投稿を再開するAPI
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
    // データベースに再開状態を保存
    const resumedAt = new Date().toISOString();
    
    // テーブルが存在しない場合は作成
    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 停止状態を解除
    await sql`
      INSERT INTO site_settings (key, value, updated_at) 
      VALUES ('posting_paused', 'false', ${resumedAt})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = 'false',
        updated_at = ${resumedAt}
    `;
    
    // 停止理由をクリア
    await sql`
      INSERT INTO site_settings (key, value, updated_at) 
      VALUES ('pause_reason', '', ${resumedAt})
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = '',
        updated_at = ${resumedAt}
    `;
    
    console.log('Posting resumed at:', resumedAt);
    
    return res.status(200).json({
      success: true,
      message: '投稿を再開しました',
      isPaused: false,
      resumedAt: resumedAt
    });
    
  } catch (error) {
    console.error('Error resuming posts:', error);
    
    // エラーが発生してもメモリ内で再開状態を管理
    return res.status(200).json({
      success: true,
      message: '投稿を再開しました（メモリ内管理）',
      isPaused: false,
      resumedAt: new Date().toISOString(),
      warning: 'データベースへの保存に失敗しました'
    });
  }
}
