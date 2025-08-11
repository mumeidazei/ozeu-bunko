import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);
    
    // リクエストボディから保護するIDを取得
    let protectedIds = [];
    
    if (req.body) {
      // 配列の場合
      if (Array.isArray(req.body)) {
        protectedIds = req.body;
      }
      // オブジェクトでidsプロパティがある場合
      else if (req.body.ids && Array.isArray(req.body.ids)) {
        protectedIds = req.body.ids;
      }
      // オブジェクトでprotectedIdsプロパティがある場合
      else if (req.body.protectedIds && Array.isArray(req.body.protectedIds)) {
        protectedIds = req.body.protectedIds;
      }
    }
    
    // デフォルトの保護ID（リクエストに何もない場合）
    if (!protectedIds || protectedIds.length === 0) {
      protectedIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1731, 1737, 1736, 1735, 1734, 1733, 1732, 6753, 47076, 47077];
    }
    
    // 数値に変換してクリーンアップ
    protectedIds = protectedIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    
    console.log('Protected IDs:', protectedIds);
    console.log('Protected IDs count:', protectedIds.length);
    
    // PostgreSQLの配列を使用した削除
    let deletedCount = 0;
    
    try {
      // 方法1: シンプルなNOT IN
      if (protectedIds.length > 0) {
        // まず削除対象の件数を確認
        const countQuery = await sql`
          SELECT COUNT(*) as count FROM bunko
        `;
        const totalCount = parseInt(countQuery.rows[0].count, 10);
        
        // 保護対象の件数を確認
        const protectedCountQuery = await sql.query(
          `SELECT COUNT(*) as count FROM bunko WHERE id = ANY($1::int[])`,
          [protectedIds]
        );
        const protectedCount = parseInt(protectedCountQuery.rows[0].count, 10);
        
        const expectedDeleteCount = totalCount - protectedCount;
        console.log(`Total: ${totalCount}, Protected: ${protectedCount}, To delete: ${expectedDeleteCount}`);
        
        if (expectedDeleteCount === 0) {
          return res.status(200).json({
            success: true,
            message: '削除対象の投稿がありません',
            deletedCount: 0,
            protectedIds: protectedIds,
            protectedCount: protectedIds.length,
            totalCount: totalCount
          });
        }
        
        // 削除実行
        const deleteResult = await sql.query(
          `DELETE FROM bunko WHERE id != ALL($1::int[])`,
          [protectedIds]
        );
        
        deletedCount = deleteResult.rowCount;
        console.log('Deleted count:', deletedCount);
      }
      
    } catch (error) {
      console.error('Primary deletion method failed:', error);
      
      // フォールバック: 個別削除
      try {
        // すべての投稿IDを取得
        const allPosts = await sql`SELECT id FROM bunko ORDER BY id`;
        const allIds = allPosts.rows.map(row => row.id);
        
        // 削除対象のIDを特定
        const idsToDelete = allIds.filter(id => !protectedIds.includes(id));
        
        console.log(`Fallback deletion: ${idsToDelete.length} items to delete`);
        
        if (idsToDelete.length === 0) {
          return res.status(200).json({
            success: true,
            message: '削除対象の投稿がありません',
            deletedCount: 0,
            protectedIds: protectedIds,
            protectedCount: protectedIds.length,
            method: 'none_to_delete'
          });
        }
        
        // バッチで削除（100件ずつ）
        const batchSize = 100;
        let totalDeleted = 0;
        
        for (let i = 0; i < idsToDelete.length; i += batchSize) {
          const batch = idsToDelete.slice(i, i + batchSize);
          
          try {
            const batchResult = await sql.query(
              `DELETE FROM bunko WHERE id = ANY($1::int[])`,
              [batch]
            );
            totalDeleted += batchResult.rowCount;
            console.log(`Batch ${Math.floor(i/batchSize) + 1}: deleted ${batchResult.rowCount} items`);
          } catch (batchError) {
            console.error('Batch deletion error:', batchError);
          
