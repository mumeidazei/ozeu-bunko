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
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNext: false,
    total: 0
  });

  useEffect(() => {
    // セッションチェック
    const token = sessionStorage.getItem('adminToken');
    if (token === 'admin-authenticated') {
      setIsLoggedIn(true);
      loadBunkoList();
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
        loadBunkoList();
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

  const loadBunkoList = async (page = 1, append = false) => {
    if (!append) {
      setLoading(true);
    }
    
    try {
      const response = await fetch(`/api/bunko?page=${page}&limit=50`);
      if (response.ok) {
        const result = await response.json();
        
        if (append) {
          setBunkoList(prev => [...prev, ...result.data]);
        } else {
          setBunkoList(result.data);
        }
        
        setPagination(result.pagination);
        
        // 次のページがある場合は自動的に読み込む
        if (result.pagination.hasNext) {
          setTimeout(() => {
            loadBunkoList(result.pagination.page + 1, true);
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error loading bunko list:', error);
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
        loadBunkoList();
      } else {
        showMessage('削除に失敗しました', 'error');
      }
    } catch (error) {
      showMessage('エラーが発生しました', 'error');
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
        showMessage('更新しました', 'success');
        setEditMode(false);
        setSelectedBunko(null);
        loadBunkoList();
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

        <div className={styles.bunkoTable}>
          <h2>投稿一覧 {pagination.total > 0 && `(全${pagination.total}件)`}</h2>
          {loading && bunkoList.length === 0 ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : bunkoList.length === 0 ? (
            <div className={styles.emptyState}>投稿がありません</div>
          ) : (
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
          )}
        </div>

        <a href="/" className={styles.backLink}>← ホームに戻る</a>
      </div>
    </>
  );
}
