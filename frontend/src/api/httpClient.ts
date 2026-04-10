import axios from 'axios';

/**
 * アプリ内で共通に使う axios インスタンス。
 *
 * - Content-Type をデフォルトで固定しない（GET や blob 取得で悪さをしない）
 * - JSON を送るときは各 API で必要に応じて明示指定する
 */
export const httpClient = axios.create({
  // baseURL は同一オリジン前提。必要ならここで切り替える。
  baseURL: '',
  withCredentials: true,
});

export const axiosClient = axios.create({
  // baseURL は同一オリジン前提。必要ならここで切り替える。
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
