import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [view, setView] = useState('home');
  const [bunkoList, setBunkoList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBunko, setSelectedBunko] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNext: false,
    total: 0
  });
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    content: ''
  });

  useEffect(() => {
    loadBunkoList(1);
  }, []);

  const loadBunkoList = async (page = 1, append = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
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
        if (result.pagination.hasNext && !append) {
          // 初回読み込み時は少し待ってから次を読み込む
          setTimeout(() => {
            loadBunkoList(2, true);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading bunko list:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (view !== 'home' || loadingMore || !pagination.hasNext) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    // ページの下部に近づいたら次のページを読み込む
    if (scrollTop + clientHeight >= scrollHeight - 500) {
      loadBunkoList(pagination.page + 1, true);
    }
  }, [view, pagination, loadingMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author || !formData.content) {
      showMessage('すべての項目を入力してください', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/bunko', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '投稿に失敗しました');
      }

      showMessage('投稿が完了しました', 'success');
      setFormData({ title: '', author: '', content: '' });
      
      setTimeout(() => {
        setView('home');
        loadBunkoList(1);
        setMessage({ text: '', type: '' });
      }, 2000);

    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const navigateTo = (viewName) => {
    setView(viewName);
    if (viewName === 'home') {
      window.history.pushState(null, '', '/');
      if (bunkoList.length === 0) {
        loadBunkoList(1);
      }
    } else if (viewName === 'toukou') {
      window.history.pushState(null, '', '/toukou');
    }
  };

  return (
    <>
      <Head>
        <title>おぜう文庫web版</title>
        <meta name="description" content="Web版おぜう文庫" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className={styles.container}>
        <h1 className={styles.title}>Web版おぜう文庫</h1>
        
        <nav className={styles.nav}>
          <a 
            className={view === 'home' ? styles.active : ''}
            onClick={() => navigateTo('home')}
          >
            ホーム
          </a>
          <a 
            className={view === 'toukou' ? styles.active : ''}
            onClick={() => navigateTo('toukou')}
          >
            投稿
          </a>
        </nav>

        {view === 'home' && (
          <div className={styles.homeView}>
            {pagination.total > 0 && (
              <div className={styles.totalCount}>
                全 {pagination.total} 件の投稿
              </div>
            )}
            
            {loading && bunkoList.length === 0 ? (
              <div className={styles.loading}>読み込み中...</div>
            ) : bunkoList.length === 0 && !loadingMore ? (
              <div className={styles.emptyState}>まだ投稿がありません</div>
            ) : (
              <>
                <div className={styles.bunkoList}>
                  {bunkoList.map((bunko) => (
                    <div
                      key={bunko.id}
                      className={styles.bunkoItem}
                      onClick={() => setSelectedBunko(bunko)}
                    >
                      <div className={styles.bunkoTitle}>{bunko.title}</div>
                      <div className={styles.bunkoAuthor}>作成者: {bunko.author}</div>
                      <div className={styles.bunkoPreview}>{bunko.content}</div>
                      <div className={styles.bunkoDate}>
                        {new Date(bunko.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  ))}
                </div>
                
                {loadingMore && (
                  <div className={styles.loadingMore}>
                    追加読み込み中...
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {view === 'toukou' && (
          <div className={styles.toukouView}>
            {message.text && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="title">タイトル</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="author">作成者</label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="content">本文</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? '投稿中...' : '投稿する'}
              </button>
            </form>
          </div>
        )}

        {selectedBunko && (
          <div 
            className={styles.bunkoDetail}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedBunko(null);
              }
            }}
          >
            <div className={styles.detailContent}>
              <span 
                className={styles.closeBtn}
                onClick={() => setSelectedBunko(null)}
              >
                &times;
              </span>
              <h2 className={styles.detailTitle}>{selectedBunko.title}</h2>
              <div className={styles.detailAuthor}>作成者: {selectedBunko.author}</div>
              <div className={styles.detailText}>{selectedBunko.content}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
