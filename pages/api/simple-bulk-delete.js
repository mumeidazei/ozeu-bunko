import { sql } from '@vercel/postgres';

// シンプルな一括削除API（デバッグ・テスト用）
export default async function handler(req, res) {
  // 必ずContent-Typeを設定
  res.setHeader('Content-Type', 'application/json');
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
    // デフォルトの保護ID
    const defaultProtectedIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1731, 1737, 1736, 1735, 1734, 1733, 1732, 6753, 47076, 47077];
    
    // リクエストボディの処理
    let protectedIds = defaultProtectedIds;
    if (req.body && Array.isArray(req.body)) {
      protectedIds = req.body.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    }
    
    console.log('Protecting IDs:', protectedIds);
    
    // まず全件数を取得
    const countResult = await sql`SELECT COUNT(*) as total FROM bunko`;
    const totalCount = parseInt(countResult.rows[0].total, 10);
    
    // すべてのIDを取得
    const allPostsResult = await sql`SELECT id FROM bunko`;
    const allIds = allPostsResult.rows.map(row => row.id);
    
    // 削除対象を特定
    const idsToDelete = allIds.filter(id => !protectedIds.includes(id));
    
    console.log(`Total: ${totalCount}, To delete: ${idsToDelete.length}, Protected: ${protectedIds.length}`);
    
    if (idsToDelete.length === 0) {
      return res.status(200).json({
        success: true,
        message: '削除対象なし',
        deletedCount: 0,
        totalCount: totalCount,
        protectedCount: protectedIds.length
      });
    }
    
    // 削除実行（100件ずつバッチ処理）
    let deletedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      
      // バッチ削除
      for (const id of batch) {
        try {
          const result = await sql`DELETE FROM bunko WHERE id = ${id}`;
          if (result.rowCount > 0) {
            deletedCount++;
          }
        } catch (err) {
          console.error(`Failed to delete ID ${id}:`, err);
        }
      }
      
      console.log(`Progress: ${Math.min(i + batchSize, idsToDelete.length)}/${idsToDelete.length}`);
    }
    
    return res.status(200).json({
      success: true,
      message: `削除完了: ${deletedCount}件`,
      deletedCount: deletedCount,
      attemptedCount: idsToDelete.length,
      protectedIds: protectedIds,
      protectedCount: protectedIds.length
    });
    
  } catch (error) {
    console.error('Error in simple bulk delete:', error);
    
    // エラーでも必ずJSONレスポンスを返す
    return res.status(200).json({
      success: false,
      message: 'エラーが発生しました',
      error: error.message,
      deletedCount: 0
    });
  }
}
