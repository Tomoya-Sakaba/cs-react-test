/* ---------------------------------------------
/ attendanceAtom.ts
/ 勤怠関連のAtomをまとめたファイル
/ --------------------------------------------- */

import { atom } from "jotai";

// 勤務中かどうかの状態を管理するAtom
export const attendanceRecordAtom = atom<boolean>(false);
