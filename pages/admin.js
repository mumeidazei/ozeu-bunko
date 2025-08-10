import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/Admin.module.css';

export default function Admin() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [bunkoList, setBunkoList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedBunko, setSelectedBunko] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', author: '', content: '' });
  const [totalCount, setTotalCount] = useState(0);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [keepIds, setKeepIds] = useState('');

  useEffect(() => {
    // セッションチェック
    const token = sessionStorage.getItem('adminToken');
    if (token === 'admin-authenticated') {
      setIsLoggedIn(true);
      loadAllBunko();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('adminToken', 'admin-authenticated');
        setIsLoggedIn(true);
        loadAllBunko();
        showMessage('ログインしました', 'success');
      } else {
        showMessage('IDまたはパスワードが正しくありません', 'error');
      }
    } catch (error) {
      showMessage('ログインエラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAllBunko = async () => {
    setLoading(true);
    setBunkoList([]);
    let allData = [];
    let page = 1;
    let hasMore = true;

    try {
      // ページネーションで全件取得
      while (hasMore) {
        const response = await fetch(`/api/bunko?page=${page}&limit=100`);
        if (response.ok) {
          const result = await response.json();
          allData = [...allData, ...result.data];
          setTotalCount(result.pagination.total);
          hasMore = result.pagination.hasNext;
          page++;
          
          // 段階的に表示を更新
          setBunkoList([...allData]);
        } else {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error('Error loading bunko list:', error);
      // エラー時は旧形式で試す
      try {
        const response = await fetch('/api/bunko');
        if (response.ok) {
          const data = await response.json();
          setBunkoList(data);
          setTotalCount(data.length);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('本当に削除しますか？')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/bunko/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'admin-authenticated'
        }
      });

      if (response.ok) {
        showMessage('削除しました', 'success');
        // リストから削除
        setBunkoList(prev => prev.filter(b => b.id !== id));
        setTotalCount(prev => prev - 1);
      } else {
        showMessage('削除に失敗しました', 'error');
      }
    } catch (error) {
      showMessage('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    // 入力値をパース（例: "1,2,3,4" → [1,2,3,4]）
    const idsToKeep = keepIds
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));

    if (idsToKeep.length === 0) {
      showMessage('残すIDを入力してください', 'error');
      return;
    }

    // 削除対象のIDリスト
    const idsToDelete = bunkoList
      .filter(bunko => !idsToKeep.includes(bunko.id))
      .map(bunko => bunko.id);

    if (idsToDelete.length === 0) {
      showMessage('削除対象がありません', 'error');
      return;
    }

    if (!confirm(`${idsToDelete.length}件の投稿を削除します。\n残すID: ${idsToKeep.join(', ')}\n本当に実行しますか？`)) {
      return;
    }

    setLoading(true);
    let deletedCount = 0;
    let failedCount = 0;

    try {
      // 一つずつ削除（並列処理）
      const deletePromises = idsToDelete.map(async (id) => {
        try {
          const response = await fetch(`/api/admin/bunko/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'admin-authenticated'
            }
          });
          if (response.ok) {
            deletedCount++;
            return id;
          } else {
            failedCount++;
            return null;
          }
        } catch (error) {
          failedCount++;
          return null;
        }
      });

      const results = await Promise.all(deletePromises);
      const successfullyDeleted = results.filter(id => id !== null);

      // リストを更新
      setBunkoList(prev => prev.filter(b => !successfullyDeleted.includes(b.id)));
      setTotalCount(prev => prev - deletedCount);

      if (failedCount > 0) {
        showMessage(`${deletedCount}件削除、${failedCount}件失敗`, 'error');
      } else {
        showMessage(`${deletedCount}件削除しました`, 'success');
      }

      // フォームをリセット
      setKeepIds('');
      setBulkDeleteMode(false);
    } catch (error) {
      showMessage('一括削除中にエラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bunko) => {
    setSelectedBunko(bunko);
    setEditForm({
      title: bunko.title,
      author: bunko.author,
      content: bunko.content
    });
    setEditMode(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/bunko/${selectedBunko.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'admin-authenticated'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedBunko = await response.json();
        showMessage('更新しました', 'success');
        setEditMode(false);
        setSelectedBunko(null);
        // リストを更新
        setBunkoList(prev => prev.map(b => 
          b.id === selectedBunko.id ? updatedBunko : b
        ));
      } else {
        showMessage('更新に失敗しました', 'error');
      }
    } catch (error) {
      showMessage('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    router.push('/');
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>管理画面 - ログイン</title>
        </Head>
        <div className={styles.container}>
          <div className={styles.loginBox}>
            <h1 className={styles.title}>管理画面</h1>
            {message.text && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label htmlFor="id">ID</label>
                <input
                  type="text"
                  id="id"
                  value={loginForm.id}
                  onChange={(e) => setLoginForm({ ...loginForm, id: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="password">パスワード</label>
                <input
                  type="password"
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
            <a href="/" className={styles.backLink}>← ホームに戻る</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>管理画面</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>管理画面</h1>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            ログアウト
          </button>
        </div>

        {message.text && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        {editMode && selectedBunko && (
          <div className={styles.editModal}>
            <div className={styles.editContent}>
              <h2>編集</h2>
              <form onSubmit={handleUpdate}>
                <div className={styles.formGroup}>
                  <label>タイトル</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>作成者</label>
                  <input
                    type="text"
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>本文</label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.buttonGroup}>
                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? '更新中...' : '更新'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditMode(false)}
                    className={styles.cancelBtn}
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {bulkDeleteMode && (
          <div className={styles.bulkDeleteModal}>
            <div className={styles.bulkDeleteContent}>
              <h2>一括削除</h2>
              <p className={styles.warning}>
                ⚠️ 入力したID以外のすべての投稿が削除されます
              </p>
              <div className={styles.formGroup}>
                <label>残すIDを入力（カンマ区切り）</label>
                <input
                  type="text"
                  value={keepIds}
                  onChange={(e) => setKeepIds(e.target.value)}
                  placeholder="例: 1,2,3,4"
                />
                <small>現在の投稿ID範囲: {bunkoList.length > 0 ? `${Math.min(...bunkoList.map(b => b.id))} ～ ${Math.max(...bunkoList.map(b => b.id))}` : 'なし'}</small>
              </div>
              <div className={styles.buttonGroup}>
                <button 
                  onClick={handleBulkDelete}
                  className={styles.dangerBtn}
                  disabled={loading || !keepIds}
                >
                  {loading ? '削除中...' : '一括削除実行'}
                </button>
                <button 
                  onClick={() => {
                    setBulkDeleteMode(false);
                    setKeepIds('');
                  }}
                  className={styles.cancelBtn}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.bunkoTable}>
          <div className={styles.tableHeader}>
            <h2>投稿一覧 {totalCount > 0 && `(全${totalCount}件)`}</h2>
            <button 
              onClick={() => setBulkDeleteMode(true)}
              className={styles.bulkDeleteBtn}
              disabled={loading || bunkoList.length === 0}
            >
              一括削除
            </button>
          </div>
          
          {loading && bunkoList.length === 0 ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : bunkoList.length === 0 ? (
            <div className={styles.emptyState}>投稿がありません</div>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>タイトル</th>
                    <th>作成者</th>
                    <th>投稿日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {bunkoList.map((bunko) => (
                    <tr key={bunko.id}>
                      <td>{bunko.id}</td>
                      <td>{bunko.title}</td>
                      <td>{bunko.author}</td>
                      <td>{new Date(bunko.created_at).toLocaleDateString('ja-JP')}</td>
                      <td>
                        <button 
                          onClick={() => handleEdit(bunko)}
                          className={styles.editBtn}
                        >
                          編集
                        </button>
                        <button 
                          onClick={() => handleDelete(bunko.id)}
                          className={styles.deleteBtn}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loading && bunkoList.length > 0 && (
                <div className={styles.loadingMore}>
                  追加データ読み込み中...
                </div>
              )}
            </>
          )}
        </div>

        <a href="/" className={styles.backLink}>← ホームに戻る</a>
      </div>
    </>
  );
}
