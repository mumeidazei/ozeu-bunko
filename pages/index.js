import { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [view, setView] = useState('home');
  const [bunkoList, setBunkoList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBunko, setSelectedBunko] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    content: '',
    key: ''
  });

  useEffect(() => {
    loadBunkoList();
  }, []);

  const loadBunkoList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bunko');
      if (response.ok) {
        const data = await response.json();
        setBunkoList(data);
      }
    } catch (error) {
      console.error('Error loading bunko list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author || !formData.content || !formData.key) {
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
      setFormData({ title: '', author: '', content: '', key: '' });
      
      setTimeout(() => {
        setView('home');
        loadBunkoList();
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
      loadBunkoList();
    } else if (viewName === 'toukou') {
      window.history.pushState(null, '', '/toukou');
    }
  };

  return (
    <>
      <Head>
        <title>ozeu文庫web</title>
        <meta name="description" content="web版のおぜう文庫" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className={styles.container}>
        <h1 className={styles.title}>文庫</h1>
        
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
            {loading ? (
              <div className={styles.loading}>読み込み中...</div>
            ) : bunkoList.length === 0 ? (
              <div className={styles.emptyState}>まだ投稿がありません</div>
            ) : (
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
              
              <div className={styles.formGroup}>
                <label htmlFor="key">投稿キー</label>
                <input
                  type="password"
                  id="key"
                  name="key"
                  value={formData.key}
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
