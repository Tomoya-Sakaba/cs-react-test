/* ----------------------------------------------------------------
 * useApproval.ts
 * 上程機能の状態管理を行うカスタムフック
 * 汎用的に使用できるように設計
 * ---------------------------------------------------------------- */

import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom } from '../atoms/authAtom';
import type {
  ApprovalStatus,
  UseApprovalOptions,
  ApprovalFlowDirection,
  UseApprovalReturn,
} from '../types/approval';
import { getApprovalStatus } from '../api/approvalApi';

// ============================================================================
// 型定義のエクスポート（後方互換性のため）
// ============================================================================
export type {
  ApprovalStatus,
  UseApprovalOptions,
  ApprovalFlowDirection,
  UseApprovalReturn,
};

// ============================================================================
// カスタムフック
// ============================================================================
export const useApproval = (options: UseApprovalOptions): UseApprovalReturn => {
  const { approvalId, reportNo, autoFetch = true } = options;
  const [currentUser] = useAtom(currentUserAtom);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ============================================================================
  // データ取得
  // ============================================================================
  /**
   * 上程状態を取得
   */
  const fetchApprovalStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getApprovalStatus(approvalId, reportNo);
      console.log('res.data', data);
      setApprovalStatus(data);
    } catch (err) {
      console.error('上程状態の取得に失敗しました:', err);
      setApprovalStatus([]);
    } finally {
      setLoading(false);
    }
  }, [approvalId, reportNo]);

  // 自動取得
  useEffect(() => {
    if (autoFetch) {
      fetchApprovalStatus();
    }
  }, [autoFetch, fetchApprovalStatus]);

  // ============================================================================
  // 判定関数
  // ============================================================================
  /**
   * 既存の上程フローがあるか
   */
  const hasExistingFlow = useCallback((): boolean => {
    return approvalStatus.length > 0;
  }, [approvalStatus]);

  /**
   * 編集可能かどうかをチェック（後方互換性のため残す）
   */
  const canEdit = useCallback((): boolean => {
    if (approvalStatus.length === 0) {
      return true;
    }

    if (approvalStatus.some((a) => a.status === 5)) {
      return false;
    }

    const isRejected = approvalStatus.some((a) => a.status === 3);
    if (isRejected) {
      const submitterRecord =
        approvalStatus.find((a) => a.flowOrder === 0) || null;
      return submitterRecord?.userName === currentUser?.name;
    }

    if (!currentUser || approvalStatus.length === 0) return false;
    const pendingApproval = approvalStatus.find(
      (a) => a.status === 1 && a.userName === currentUser.name
    );
    return pendingApproval !== undefined;
  }, [approvalStatus, currentUser]);

  /**
   * 編集可否と理由を取得
   */
  const getEditStatus = useCallback((): {
    canEdit: boolean;
    message: string;
  } => {
    // 上程前：誰でも編集可能
    if (approvalStatus.length === 0) {
      return { canEdit: true, message: '' };
    }

    // 完了済み：誰も編集不可
    if (approvalStatus.some((a) => a.status === 5)) {
      return {
        canEdit: false,
        message: '承認が完了しています。編集する場合はバージョンを切ってください',
      };
    }

    // 差し戻し中：上程者のみ編集可能
    const isRejected = approvalStatus.some((a) => a.status === 3);
    if (isRejected) {
      const submitterRecord =
        approvalStatus.find((a) => a.flowOrder === 0) || null;
      const isSubmitter = submitterRecord?.userName === currentUser?.name;
      return {
        canEdit: isSubmitter,
        message: isSubmitter
          ? ''
          : '差し戻し中です。上程者のみが編集可能です。',
      };
    }

    // 上程中：承認待ちの人のみ編集可能
    if (!currentUser) {
      return {
        canEdit: false,
        message: '上程中です。承認者のみが編集できます。',
      };
    }

    const pendingApproval = approvalStatus.find(
      (a) => a.status === 1 && a.userName === currentUser.name
    );
    return {
      canEdit: pendingApproval !== undefined,
      message: pendingApproval ? '' : '上程中です。承認者のみが編集できます。',
    };
  }, [approvalStatus, currentUser]);

  /**
   * 完了しているか
   */
  const isCompleted = useCallback((): boolean => {
    return approvalStatus.some((a) => a.status === 5);
  }, [approvalStatus]);

  /**
   * 現在の承認フローの方向を取得
   */
  const getApprovalFlowDirection = useCallback((): ApprovalFlowDirection => {
    // 完了している場合
    if (isCompleted()) {
      const completedRecord = approvalStatus.find((a) => a.status === 5);
      return {
        flow: [],
        action: '完了',
        actionDate: completedRecord?.actionDate || null,
      };
    }

    // 差し戻しの判定
    const rejectionTarget = approvalStatus.find((a) => a.status === 6);
    if (rejectionTarget) {
      const rejectedApprover = approvalStatus.find(
        (a) => a.status === 3 && a.flowOrder === rejectionTarget.flowOrder - 1
      );
      if (rejectedApprover) {
        return {
          flow: [rejectedApprover.userName, rejectionTarget.userName],
          action: '差し戻し',
          actionDate: rejectedApprover.actionDate,
        };
      }
    }

    // 上程中の場合
    const sortedApprovals = [...approvalStatus].sort(
      (a, b) => a.flowOrder - b.flowOrder
    );

    const statusZeroRecords = approvalStatus.filter((a) => a.status === 0);
    if (statusZeroRecords.length === 0) {
      return { flow: [], action: null, actionDate: null };
    }

    const submitter = statusZeroRecords.reduce((latest, current) =>
      current.flowOrder > latest.flowOrder ? current : latest
    );

    const pendingApprovals = approvalStatus.filter(
      (a) => a.flowOrder > 0 && a.status === 1
    );

    const minPendingFlowOrder =
      pendingApprovals.length > 0
        ? Math.min(...pendingApprovals.map((a) => a.flowOrder))
        : Infinity;

    const startFlowOrder = submitter.flowOrder;
    const flowUsers: string[] = [submitter.userName];

    for (const approval of sortedApprovals) {
      if (approval.flowOrder <= startFlowOrder) continue;
      if (approval.flowOrder > minPendingFlowOrder) break;

      if (approval.status === 1 || approval.status === 2) {
        flowUsers.push(approval.userName);
      }
    }

    let actionDate: string | null = submitter.actionDate;

    const approvedApprovers = approvalStatus.filter(
      (a) =>
        a.status === 2 &&
        a.flowOrder > startFlowOrder &&
        a.flowOrder <= minPendingFlowOrder
    );
    if (approvedApprovers.length > 0) {
      const lastApprovedApprover = approvedApprovers.reduce((latest, current) =>
        current.flowOrder > latest.flowOrder ? current : latest
      );
      actionDate = lastApprovedApprover.actionDate;
    }

    return {
      flow: flowUsers,
      action: null,
      actionDate,
    };
  }, [approvalStatus, isCompleted]);

  // ============================================================================
  // アクション
  // ============================================================================
  /**
   * 状態を再取得
   */
  const refresh = useCallback(async () => {
    await fetchApprovalStatus();
  }, [fetchApprovalStatus]);

  // ============================================================================
  // 戻り値
  // ============================================================================
  return {
    // 状態
    approvalStatus,
    loading,

    // Drawerの開閉状態
    isDrawerOpen,
    setIsDrawerOpen,

    // 判定関数
    hasExistingFlow,
    canEdit,
    getEditStatus,
    isCompleted,
    getApprovalFlowDirection,

    // アクション
    refresh,
  };
};
