/* ----------------------------------------------------------------
 * approval.ts
 * 承認機能に関する型定義
 * ---------------------------------------------------------------- */

/**
 * 承認状態
 */
export type ApprovalStatus = {
  approvalId: string; // nvarchar(4): 4桁の文字列（例："0101"）
  reportNo: string;
  userName: string;
  flowOrder: number;
  status: number; // 0: 上程済み, 1: 承認待ち, 2: 承認済み, 3: 差し戻し, 4: 取り戻し, 5: 完了, 6: 差し戻し対象
  comment: string | null;
  actionDate: string | null;
};

/**
 * 承認リクエスト（新規上程・再上程用）
 */
export type ApprovalRequest = {
  reportNo: string; // 必須
  approvalId: string; // 必須（4桁の文字列、例："0101"）
  comment: string;
  approverNames: string[];
  submitterName: string;
};

/**
 * 承認リクエスト
 */
export type ApproveRequest = {
  approvalId: string;
  reportNo: string;
  flowOrder: number;
  userName: string;
  comment?: string;
};

/**
 * 差し戻しリクエスト
 */
export type RejectRequest = {
  approvalId: string;
  reportNo: string;
  flowOrder: number;
  userName: string;
  comment: string; // 必須
};

/**
 * 取り戻しリクエスト
 */
export type RecallRequest = {
  approvalId: string;
  reportNo: string;
  flowOrder: number;
  userName: string;
};

/**
 * useApprovalフックのオプション
 */
export type UseApprovalOptions = {
  approvalId: string; // 必須（4桁の文字列、例："0101"）
  reportNo: string; // 必須
  autoFetch?: boolean; // 自動で上程状態を取得するか（デフォルト: true）
};

/**
 * 承認フローの方向（誰から誰に、アクションタイプ、日時）
 */
export type ApprovalFlowDirection = {
  flow: string[]; // 承認フロー全体（上程者→承認者1→承認者2→...）
  action: '差し戻し' | '完了' | null; // アクションタイプ（上程中の場合はnull）
  actionDate: string | null; // アクション日時
};

/**
 * useApprovalフックの戻り値
 */
export type UseApprovalReturn = {
  // 状態
  approvalStatus: ApprovalStatus[];
  loading: boolean;

  // Drawerの開閉状態
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;

  // 判定関数
  hasExistingFlow: () => boolean; // 既存の上程フローがあるか
  canEdit: () => boolean; // 編集可能かどうか
  isCompleted: () => boolean; // 完了しているか
  getApprovalFlowDirection: () => ApprovalFlowDirection; // 現在の承認フローの方向（誰から誰に）を取得

  // アクション
  refresh: () => Promise<void>; // 状態を再取得
};
