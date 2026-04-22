import axios from "axios";

/**
 * アプリ内で共通に使う axios インスタンス。
 *
 * - Content-Type はリクエストごとに付ける（GET や blob 取得で悪さをしない）
 */
export const httpClient = axios.create({
  baseURL: "",
  withCredentials: true,
});

/**
 * JSON API 用。POST/PUT でボディがあるときの既定 Content-Type。
 */
export const axiosClient = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * PDF（バイナリ）取得用。
 *
 * - responseType: blob … axios が ArrayBuffer ではなく Blob を返す
 * - Accept: application/pdf … サーバに PDF を希望する旨を伝える（必須ではないが明示的）
 *
 * 現場でよくある `Content-Type: application/octet-stream` のデフォルトは付けない。
 * Content-Type は「送るボディ」の話なので、GET では不要。POST で JSON を送るときは
 * 各リクエストの config.headers で `application/json` を付ける。
 */
export const axiosClientBlob = axios.create({
  baseURL: "",
  withCredentials: true,
  responseType: "blob",
  headers: {
    Accept: "application/pdf",
  },
});
