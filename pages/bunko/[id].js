import { sql } from '@vercel/postgres';

// APIルートであることを明示
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req, res) {
  const { id } = req.query;

  // GETメソッドのみ許可
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // IDの検証
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({ error: '無効なIDです' });
    }

    // 特定の文庫を取得
    const { rows } = await sql`
      SELECT * FROM bunko 
      WHERE id = ${numericId}
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
}
