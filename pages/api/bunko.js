import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // テーブル作成（初回のみ実行される）
    await sql`
      CREATE TABLE IF NOT EXISTS bunko (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (req.method === 'GET') {
      // 文庫一覧取得
      const { rows } = await sql`
        SELECT * FROM bunko 
        ORDER BY created_at DESC
        LIMIT 100
      `;
      
      return res.status(200).json(rows);
      
    } else if (req.method === 'POST') {
      // 文庫投稿
      const { title, author, content, key } = req.body;
      
      // キーの検証
      const validKey = process.env.POST_KEY || 'omnkdaifugou';
      if (key !== validKey) {
        return res.status(403).json({ error: '投稿キーが正しくありません' });
      }
      
      // 入力検証
      if (!title || !author || !content) {
        return res.status(400).json({ error: '必須項目を入力してください' });
      }
      
      // 文字数制限
      if (title.length > 100) {
        return res.status(400).json({ error: 'タイトルは100文字以内にしてください' });
      }
      if (author.length > 50) {
        return res.status(400).json({ error: '作成者名は50文字以内にしてください' });
      }
      if (content.length > 10000) {
        return res.status(400).json({ error: '本文は10000文字以内にしてください' });
      }
      
      // データベースに保存
      const { rows } = await sql`
        INSERT INTO bunko (title, author, content)
        VALUES (${title.trim()}, ${author.trim()}, ${content.trim()})
        RETURNING *
      `;
      
      return res.status(200).json(rows[0]);
      
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
