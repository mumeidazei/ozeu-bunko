import { sql } from '@vercel/postgres';

// 停止状態をチェックする関数
async function checkIfPaused() {
  try {
    // データベースから停止状態を取得
    const result = await sql`
      SELECT value FROM site_settings 
      WHERE key = 'posting_paused'
      LIMIT 1
    `;
    
    if (result.rows.length > 0) {
      return result.rows[0].value === 'true';
    }
    return false;
  } catch (error) {
    // テーブルが存在しない場合は停止していないとみなす
    return false;
  }
}

export default async function handler(req, res) {
  // CORS設定（ツール対応）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    // クエリパラメータを取得
    const { id, page, limit, all } = req.query;
    
    if (req.method === 'GET' && id) {
      // 個別の文庫取得
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        return res.status(400).json({ error: '無効なIDです' });
      }

      const { rows } = await sql`
        SELECT * FROM bunko 
        WHERE id = ${numericId}
        LIMIT 1
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '文庫が見つかりません' });
      }
      
      return res.status(200).json(rows[0]);
      
    } else if (req.method === 'GET') {
      // 全件取得モード（all=trueまたはページネーションなし）
      if (all === 'true' || (!page && !limit)) {
        // 全件取得（制限なし）
        const { rows } = await sql`
          SELECT * FROM bunko 
          ORDER BY created_at DESC
        `;
        
        // allパラメータがある場合は、件数情報も含める
        if (all === 'true') {
          return res.status(200).json({
            data: rows,
            total: rows.length,
            message: `全${rows.length}件を取得しました`
          });
        }
        
        // 旧形式（配列のみ）
        return res.status(200).json(rows);
      }
      
      // ページネーション対応
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 50;
      const offset = (pageNum - 1) * limitNum;
      
      // 全件数を取得
      const countResult = await sql`
        SELECT COUNT(*) as total FROM bunko
      `;
      const totalCount = parseInt(countResult.rows[0].total, 10);
      
      // ページネーションでデータ取得
      const { rows } = await sql`
        SELECT * FROM bunko 
        ORDER BY created_at DESC
        LIMIT ${limitNum}
        OFFSET ${offset}
      `;
      
      // ページネーション情報を含めて返す
      return res.status(200).json({
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasNext: offset + limitNum < totalCount,
          hasPrev: pageNum > 1
        }
      });
      
      
    } else if (req.method === 'POST') {
      // 停止状態をチェック
      const isPaused = await checkIfPaused();
      if (isPaused) {
        // 停止理由を取得
        let reason = 'メンテナンス中';
        try {
          const reasonResult = await sql`
            SELECT value FROM site_settings 
            WHERE key = 'pause_reason'
            LIMIT 1
          `;
          if (reasonResult.rows.length > 0 && reasonResult.rows[0].value) {
            reason = reasonResult.rows[0].value;
          }
        } catch (e) {
          // エラーは無視
        }
        
        return res.status(503).json({ 
          error: '投稿は一時停止中です',
          reason: reason,
          isPaused: true,
          message: '現在、投稿機能を一時停止しています。しばらくお待ちください。'
        });
      }
      
      // 文庫投稿（キー認証を削除）
      const { title, author, content } = req.body;
      
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
