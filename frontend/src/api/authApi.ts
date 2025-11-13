import axios from 'axios';
import type { CurrentUser } from '../atoms/authAtom';

export type LoginRequest = {
  name: string;
  password: string;
};

export type LoginResponse = {
  user: CurrentUser;
  token?: string; // 将来的にJWTトークンなどを使う場合
};

export const authApi = {
  // ログインAPI（一旦簡単な実装）
  // TODO: バックエンドにログインAPIを追加したら、ここを実装
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // 一旦、ユーザー一覧から名前で検索
      // 実際の実装では、バックエンドにログインAPIを追加してパスワード認証を行う
      const res = await axios.get<
        Array<{
          id: number;
          name: string;
          email?: string;
          department?: string;
          position?: string;
        }>
      >('/api/users');
      const user = res.data.find((u) => u.name === credentials.name);

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // TODO: パスワード認証を実装
      // 現在は名前のみでログイン可能（開発用）

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
          position: user.position,
        },
      };
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  },

  // ログアウト（現在はフロントエンドのみ）
  async logout(): Promise<void> {
    // TODO: バックエンドでセッションを無効化する場合
    return Promise.resolve();
  },
};
