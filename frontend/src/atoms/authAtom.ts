import { atom } from 'jotai';

export type CurrentUser = {
  id: number;
  name: string;
  email?: string;
  department?: string;
  position?: string;
};

// 現在ログインしているユーザーを管理するatom
export const currentUserAtom = atom<CurrentUser | null>(null);

// ログイン状態を管理するatom（ログインしているかどうか）
export const isAuthenticatedAtom = atom((get) => get(currentUserAtom) !== null);
