import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // 特定の文庫を取得
      const { rows } = await sql`
        SELECT * FROM bunko 
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '文庫が見つかりません' });
      }
      
      return res.status(200).json(rows[0]);
      
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
