import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Home from './index';

export default function Toukou() {
  const router = useRouter();
  
  useEffect(() => {
    // URLを/toukouに保つ
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/toukou');
    }
  }, []);

  return <Home />;
}
