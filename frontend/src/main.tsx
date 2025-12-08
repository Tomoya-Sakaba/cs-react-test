import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 開発環境でも本番環境と同じ挙動にするため、StrictModeを無効化
createRoot(document.getElementById('root')!).render(
  <App />
)
