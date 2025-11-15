/* ----------------------------------------------------------------
 * useApproval.ts
 * 上程機能の状態管理を行うカスタムフック
 * 汎用的に使用できるように設計
 * ---------------------------------------------------------------- */

import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import axios from 'axios';
import { currentUserAtom } from '../atoms/authAtom';

export type ApprovalStatus = {
  id: number;
  pageCode: number; // ページタイプコード（1: 複数レコード型, 2: 1レコード型）
  reportNo: string;
  year: number;
  month: number;
  userName: string;
  flowOrder: number;
  status: number; // 0: 上程済み, 1: 承認待ち, 2: 承認済み, 3: 差し戻し, 4: 取り戻し, 5: 完了, 6: 承認スキップ
  comment: string | null;
  actionDate: string | null;
};

export type ApprovalRequest = {
  pageCode: number; // ページタイプコード（1: 複数レコード型, 2: 1レコード型）
  reportNo: string; // PageCode=2の場合は必須、PageCode=1の場合は空文字列またはnull可
  year: number;
  month: number;
  comment: string;
  approverNames: string[];
  submitterName: string;
};

type UseApprovalOptions = {
  pageCode: number; // ページタイプコード（1: 複数レコード型, 2: 1レコード型）
  year: number;
  month: number;
  reportNo?: string; // 特定の報告書Noで取得する場合（PageCode=2の場合は必須）
  autoFetch?: boolean; // 自動で上程状態を取得するか（デフォルト: true）
};

type UseApprovalReturn = {
  // 状態
  approvalStatus: ApprovalStatus[];
  loading: boolean;
  error: string | null;

  // Drawerの開閉状態
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;

  // 上程者情報
  submitterRecord: ApprovalStatus | null;
  approverRecords: ApprovalStatus[];

  // 判定関数
  hasExistingFlow: () => boolean; // 既存の上程フローがあるか
  isApprovalTarget: () => boolean;
  canEdit: () => boolean;
  isRejected: () => boolean; // 差し戻しされているか
  isCompleted: () => boolean; // 完了しているか
  canResubmit: () => boolean; // 再上程可能か

  // アクション
  fetchApprovalStatus: () => Promise<void>;
  submitApproval: (request: ApprovalRequest) => Promise<void>;
  approve: (id: number, comment?: string) => Promise<void>;
  reject: (id: number, comment: string) => Promise<void>;
  resubmit: (request: ApprovalRequest) => Promise<void>; // 再上程
  refresh: () => Promise<void>; // 状態を再取得
};

export const useApproval = (options: UseApprovalOptions): UseApprovalReturn => {
  const { pageCode, year, month, reportNo, autoFetch = true } = options;
  const [currentUser] = useAtom(currentUserAtom);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 上程者レコード
  const submitterRecord = approvalStatus.find((a) => a.flowOrder === 0) || null;

  // 承認者レコード（FlowOrder順にソート）
  const approverRecords = approvalStatus
    .filter((a) => a.flowOrder > 0)
    .sort((a, b) => a.flowOrder - b.flowOrder);

  /**
   * 上程状態を取得
   *
   * 処理内容：
   * 1. APIリクエストを送信（/api/approval）
   * 2. レスポンスデータを受け取る
   * 3. setApprovalStatus(res.data)で状態を更新
   * 4. Reactの再レンダリングが発生し、approvalStatusが更新される
   */
  const fetchApprovalStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // APIリクエストを送信して最新の上程状態を取得
      const res = await axios.get<ApprovalStatus[]>('/api/approval', {
        params: {
          pageCode,
          reportNo: reportNo || '',
          year,
          month,
        },
      });
      // 取得したデータで状態を更新（これにより再レンダリングが発生）
      setApprovalStatus(res.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '上程状態の取得に失敗しました';
      setError(errorMessage);
      console.error('上程状態の取得に失敗しました:', err);
      setApprovalStatus([]);
    } finally {
      setLoading(false);
    }
  }, [pageCode, year, month, reportNo]);

  // 自動取得
  useEffect(() => {
    if (autoFetch) {
      fetchApprovalStatus();
    }
  }, [autoFetch, fetchApprovalStatus]);

  // 既存の上程フローがあるか
  const hasExistingFlow = useCallback((): boolean => {
    return approvalStatus.length > 0;
  }, [approvalStatus]);

  // 承認対象ユーザーかどうかをチェック（承認待ちまたは承認スキップ）
  const isApprovalTarget = useCallback((): boolean => {
    if (!currentUser || approvalStatus.length === 0) return false;
    const pendingApproval = approvalStatus.find(
      (a) =>
        (a.status === 1 || a.status === 6) && a.userName === currentUser.name
    );
    return pendingApproval !== undefined;
  }, [currentUser, approvalStatus]);

  // 編集可能かどうかをチェック
  const canEdit = useCallback((): boolean => {
    if (approvalStatus.length === 0) {
      // 上程状態がない場合は編集可能
      return true;
    }

    // 完了済みの場合は編集不可
    if (approvalStatus.some((a) => a.status === 5)) {
      return false;
    }

    // 差し戻しされている場合は、上程者のみ編集可能
    if (isRejected()) {
      return submitterRecord?.userName === currentUser?.name;
    }

    // 上程中の場合、承認待ちのユーザーのみが操作可能
    return isApprovalTarget();
  }, [approvalStatus, currentUser, submitterRecord]);

  // 差し戻しされているか
  const isRejected = useCallback((): boolean => {
    return approvalStatus.some((a) => a.status === 3);
  }, [approvalStatus]);

  // 完了しているか
  const isCompleted = useCallback((): boolean => {
    return approvalStatus.some((a) => a.status === 5);
  }, [approvalStatus]);

  // 再上程可能か（差し戻し対象者レコードが存在し、まだ再上程されていない）
  // ただし、差し戻しした承認者本人は再上程できない
  const canResubmit = useCallback((): boolean => {
    if (!currentUser) return false;
    if (isCompleted()) return false;
    if (!isRejected()) return false;

    // 差し戻し対象者レコード（Status=7）を取得
    const rejectionTarget = approvalStatus.find((a) => a.status === 7);
    if (!rejectionTarget) return false;

    // 最新の差し戻し（最大FlowOrder）を取得（approvalStatus全体から）
    const rejectedApprovals = approvalStatus.filter((a) => a.status === 3);
    if (rejectedApprovals.length === 0) return false;

    // 最大FlowOrderの差し戻しを取得（最新の差し戻し）
    const rejectedApprover = rejectedApprovals.reduce((latest, current) =>
      current.flowOrder > latest.flowOrder ? current : latest
    );

    // 差し戻しした承認者本人は再上程できない
    if (rejectedApprover.userName === currentUser.name) {
      return false;
    }

    // 差し戻し対象者レコード以降に再上程があるかチェック（Status=0のレコードが存在するか）
    const hasResubmission = approvalStatus.some(
      (a) => a.flowOrder > rejectionTarget.flowOrder && a.status === 0
    );

    return !hasResubmission;
  }, [currentUser, isRejected, isCompleted, approvalStatus]);

  // 上程を提出
  const submitApproval = useCallback(
    async (request: ApprovalRequest) => {
      try {
        setLoading(true);
        setError(null);
        await axios.post('/api/approval', request);
        await fetchApprovalStatus();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '上程に失敗しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchApprovalStatus]
  );

  // 承認
  const approve = useCallback(
    async (id: number, comment: string = '') => {
      if (!currentUser) {
        throw new Error('ログインが必要です');
      }

      const pendingApproval = approvalStatus.find(
        (a) =>
          a.id === id &&
          (a.status === 1 || a.status === 6) &&
          a.userName === currentUser.name
      );

      if (!pendingApproval) {
        throw new Error('承認対象が見つかりません');
      }

      try {
        setLoading(true);
        setError(null);
        await axios.post('/api/approval/action', {
          id,
          reportNo: pendingApproval.reportNo,
          year: pendingApproval.year,
          month: pendingApproval.month,
          userName: currentUser.name,
          action: 'approve',
          comment,
        });
        await fetchApprovalStatus();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '承認に失敗しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, approvalStatus, fetchApprovalStatus]
  );

  // 差し戻し
  const reject = useCallback(
    async (id: number, comment: string) => {
      if (!currentUser) {
        throw new Error('ログインが必要です');
      }

      if (!comment.trim()) {
        throw new Error('差し戻し理由を入力してください');
      }

      const pendingApproval = approvalStatus.find(
        (a) =>
          a.id === id &&
          (a.status === 1 || a.status === 6) &&
          a.userName === currentUser.name
      );

      if (!pendingApproval) {
        throw new Error('承認対象が見つかりません');
      }

      try {
        setLoading(true);
        setError(null);
        await axios.post('/api/approval/action', {
          id,
          reportNo: pendingApproval.reportNo,
          year: pendingApproval.year,
          month: pendingApproval.month,
          userName: currentUser.name,
          action: 'reject',
          comment: comment.trim(),
        });
        await fetchApprovalStatus();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '差し戻しに失敗しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, approvalStatus, fetchApprovalStatus]
  );

  // 再上程（差し戻し後の再提出）
  const resubmit = useCallback(
    async (request: ApprovalRequest) => {
      if (!currentUser) {
        throw new Error('ログインが必要です');
      }

      if (!canResubmit()) {
        throw new Error('再上程の条件を満たしていません');
      }

      try {
        setLoading(true);
        setError(null);
        // 再上程APIを呼び出し（既存の上程レコードを更新）
        await axios.post('/api/approval/resubmit', request);
        await fetchApprovalStatus();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '再上程に失敗しました';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, canResubmit, fetchApprovalStatus]
  );

  /**
   * 状態を再取得
   */
  const refresh = useCallback(async () => {
    // この行でfetchApprovalStatus()関数を直接呼び出している
    await fetchApprovalStatus();
  }, [fetchApprovalStatus]);

  return {
    // 状態
    approvalStatus,
    loading,
    error,

    // Drawerの開閉状態
    isDrawerOpen,
    setIsDrawerOpen,

    // 上程者情報
    submitterRecord,
    approverRecords,

    // 判定関数
    hasExistingFlow,
    isApprovalTarget,
    canEdit,
    isRejected,
    isCompleted,
    canResubmit,

    // アクション
    fetchApprovalStatus,
    submitApproval,
    approve,
    reject,
    resubmit,
    refresh,
  };
};
