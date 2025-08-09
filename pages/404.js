import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Custom404() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404 - ページが見つかりません</h1>
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          お探しのページは存在しません。
        </p>
        <Link href="/" style={{ 
          color: '#333', 
          textDecoration: 'underline',
          fontSize: '1.1em'
        }}>
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
