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
  reportNo: string;
  year: number;
  month: number;
  userName: string;
  flowOrder: number;
  status: number; // 0: 上程済み, 1: 承認待ち, 2: 承認済み, 3: 差し戻し, 4: 取り戻し, 5: 完了, 7: 差し戻し対象
  comment: string | null;
  actionDate: string | null;
};

export type ApprovalRequest = {
  reportNo: string; // 必須
  year: number;
  month: number;
  comment: string;
  approverNames: string[];
  submitterName: string;
};

type UseApprovalOptions = {
  year: number;
  month: number;
  reportNo: string; // 必須
  autoFetch?: boolean; // 自動で上程状態を取得するか（デフォルト: true）
};

type ApprovalFlowDirection = {
  flow: string[]; // 承認フロー全体（上程者→承認者1→承認者2→...）
  action: '差し戻し' | '完了' | null; // アクションタイプ（上程中の場合はnull）
  actionDate: string | null; // アクション日時
};

type UseApprovalReturn = {
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
  canResubmit: () => boolean; // 再上程可能か
  canRecall: (record: ApprovalStatus) => boolean; // 取り戻し可能かどうか
  getApprovalFlowDirection: () => ApprovalFlowDirection; // 現在の承認フローの方向（誰から誰に）を取得

  // アクション
  submitApproval: (request: ApprovalRequest) => Promise<void>; // 上程を提出
  approve: (id: number, comment?: string) => Promise<void>; // 承認
  reject: (id: number, comment: string) => Promise<void>; // 差し戻し
  resubmit: (request: ApprovalRequest) => Promise<void>; // 再上程
  recall: (id: number) => Promise<void>; // 取り戻し
  refresh: () => Promise<void>; // 状態を再取得
};

export const useApproval = (options: UseApprovalOptions): UseApprovalReturn => {
  const { year, month, reportNo, autoFetch = true } = options;
  const [currentUser] = useAtom(currentUserAtom);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus[]>([]);
  // 初期状態でloadingをtrueに設定（autoFetchがtrueの場合、すぐに読み込みが始まるため）
  const [loading, setLoading] = useState(autoFetch);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  /**
   * 上程状態を取得
   *
   * 処理内容：
   * 1. APIリクエストを送信（/api/approval）
   * 2. レスポンスデータを受け取る
   * 3. setApprovalStatus(res.data)で状態を更新
   * 4. Reactの再レンダリングが発生し、approvalStatusが更新される
   */
  // 上程状態を取得（内部使用のみ）
  const fetchApprovalStatus = useCallback(async () => {
    try {
      setLoading(true);
      // APIリクエストを送信して最新の上程状態を取得
      const res = await axios.get<ApprovalStatus[]>('/api/approval', {
        params: {
          reportNo,
          year,
          month,
        },
      });
      console.log('res.data', res.data);
      // 取得したデータで状態を更新（これにより再レンダリングが発生）
      setApprovalStatus(res.data);
    } catch (err) {
      console.error('上程状態の取得に失敗しました:', err);
      setApprovalStatus([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, reportNo]);

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
    const isRejected = approvalStatus.some((a) => a.status === 3);
    if (isRejected) {
      const submitterRecord =
        approvalStatus.find((a) => a.flowOrder === 0) || null;
      return submitterRecord?.userName === currentUser?.name;
    }

    // 上程中の場合、承認待ちのユーザーのみが操作可能
    if (!currentUser || approvalStatus.length === 0) return false;
    const pendingApproval = approvalStatus.find(
      (a) => a.status === 1 && a.userName === currentUser.name
    );
    return pendingApproval !== undefined;
  }, [approvalStatus, currentUser]);

  // 完了しているか
  const isCompleted = useCallback((): boolean => {
    return approvalStatus.some((a) => a.status === 5);
  }, [approvalStatus]);

  // 再上程可能か（差し戻し対象者のみ再上程可能）
  const canResubmit = useCallback((): boolean => {
    if (!currentUser) return false;

    // 差し戻し対象者レコード（Status=7）を取得
    const rejectionTarget = approvalStatus.find((a) => a.status === 7);
    if (!rejectionTarget) return false;

    // 差し戻し対象のユーザーのみ再上程可能
    return rejectionTarget.userName === currentUser.name;
  }, [currentUser, approvalStatus]);

  //------------------------------------------------------------------------------------------------
  // 取り戻し可能かどうかを判定
  //------------------------------------------------------------------------------------------------
  // 取り戻しの仕様：上程or再上程した人が承認フェーズ（Status=0）のときにその上程を取り消せる
  // Status=7が存在する場合（差し戻しされている場合）は取り戻しボタンは表示されない
  // 取り戻し可能なのは、最後の上程/再上程（Status=0のレコードの中でFlowOrderが最大のもの）のみ
  const canRecall = useCallback(
    (record: ApprovalStatus): boolean => {
      if (!currentUser) return false;
      if (record.userName !== currentUser.name) return false; // 本人のみ
      if (record.status !== 0) return false; // Status=0（上程済み）のみ取り戻し可能

      // Status=7が存在する場合（差し戻しされている場合）は取り戻し不可
      const hasRejectionTarget = approvalStatus.some((a) => a.status === 7);
      if (hasRejectionTarget) {
        return false;
      }

      // Status=0のレコードの中で、FlowOrderが最大のものが最後の上程/再上程
      const statusZeroRecords = approvalStatus.filter((a) => a.status === 0);
      if (statusZeroRecords.length === 0) return false;

      const maxFlowOrder = Math.max(
        ...statusZeroRecords.map((a) => a.flowOrder)
      );

      // 最後の上程/再上程のみ取り戻し可能
      return record.flowOrder === maxFlowOrder;
    },
    [currentUser, approvalStatus]
  );

  //------------------------------------------------------------------------------------------------
  // 上程を提出
  //------------------------------------------------------------------------------------------------
  const submitApproval = useCallback(
    async (request: ApprovalRequest) => {
      try {
        setLoading(true);
        await axios.post('/api/approval', request);
        await fetchApprovalStatus();
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchApprovalStatus]
  );

  //------------------------------------------------------------------------------------------------
  // 承認
  //------------------------------------------------------------------------------------------------
  const approve = useCallback(
    async (id: number, comment: string = '') => {
      if (!currentUser) {
        throw new Error('ログインが必要です');
      }

      // 最小FlowOrderの承認待ち（Status=1）の承認者を取得
      const pendingApprovals = approvalStatus.filter(
        (a) => a.flowOrder > 0 && a.status === 1
      );

      if (pendingApprovals.length === 0) {
        throw new Error('承認対象が見つかりません');
      }

      const minFlowOrder = Math.min(
        ...pendingApprovals.map((a) => a.flowOrder)
      );

      // 承認対象のレコードを取得
      const targetApproval = approvalStatus.find(
        (a) => a.id === id && a.status === 1 && a.userName === currentUser.name
      );

      if (!targetApproval) {
        throw new Error('承認対象が見つかりません');
      }

      // 最小FlowOrderの承認者のみ承認可能
      if (targetApproval.flowOrder !== minFlowOrder) {
        throw new Error(
          '順番通りに承認してください。先に前の承認者の承認が必要です。'
        );
      }

      try {
        setLoading(true);
        await axios.post('/api/approval/action', {
          id,
          reportNo: targetApproval.reportNo,
          year: targetApproval.year,
          month: targetApproval.month,
          userName: currentUser.name,
          action: 'approve',
          comment,
        });
        await fetchApprovalStatus();
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, approvalStatus, fetchApprovalStatus]
  );

  //------------------------------------------------------------------------------------------------
  // 差し戻し
  //------------------------------------------------------------------------------------------------
  const reject = useCallback(
    async (id: number, comment: string) => {
      if (!currentUser) {
        throw new Error('ログインが必要です');
      }

      if (!comment.trim()) {
        throw new Error('差し戻し理由を入力してください');
      }

      // 最小FlowOrderの承認待ち（Status=1）の承認者を取得
      const pendingApprovals = approvalStatus.filter(
        (a) => a.flowOrder > 0 && a.status === 1
      );

      if (pendingApprovals.length === 0) {
        throw new Error('承認対象が見つかりません');
      }

      const minFlowOrder = Math.min(
        ...pendingApprovals.map((a) => a.flowOrder)
      );

      // 差し戻し対象のレコードを取得
      const targetApproval = approvalStatus.find(
        (a) => a.id === id && a.status === 1 && a.userName === currentUser.name
      );

      if (!targetApproval) {
        throw new Error('承認対象が見つかりません');
      }

      // 最小FlowOrderの承認者のみ差し戻し可能
      if (targetApproval.flowOrder !== minFlowOrder) {
        throw new Error(
          '順番通りに承認してください。先に前の承認者の承認が必要です。'
        );
      }

      try {
        setLoading(true);
        await axios.post('/api/approval/action', {
          id,
          reportNo: targetApproval.reportNo,
          year: targetApproval.year,
          month: targetApproval.month,
          userName: currentUser.name,
          action: 'reject',
          comment: comment.trim(),
        });
        await fetchApprovalStatus();
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, approvalStatus, fetchApprovalStatus]
  );

  //------------------------------------------------------------------------------------------------
  // 再上程（差し戻し後の再提出）
  //------------------------------------------------------------------------------------------------
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
        // 再上程APIを呼び出し（既存の上程レコードを更新）
        await axios.post('/api/approval/resubmit', request);
        await fetchApprovalStatus();
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, canResubmit, fetchApprovalStatus]
  );

  //------------------------------------------------------------------------------------------------
  // 取り戻し（上程者または再上程者が上程/再上程を取り消す）
  //------------------------------------------------------------------------------------------------
  const recall = useCallback(
    async (id: number) => {
      if (!currentUser) {
        throw new Error('ログインが必要です');
      }

      const targetRecord = approvalStatus.find((a) => a.id === id);
      if (!targetRecord) {
        throw new Error('対象のレコードが見つかりません');
      }

      if (!canRecall(targetRecord)) {
        throw new Error('取り戻しできない状態です');
      }

      try {
        setLoading(true);
        await axios.post('/api/approval/recall', {
          id,
          userName: currentUser.name,
        });
        await fetchApprovalStatus();
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, approvalStatus, canRecall, fetchApprovalStatus]
  );

  /**
   * 状態を再取得
   */
  const refresh = useCallback(async () => {
    // この行でfetchApprovalStatus()関数を直接呼び出している
    await fetchApprovalStatus();
  }, [fetchApprovalStatus]);

  //------------------------------------------------------------------------------------------------
  // 画面に表示する上程状態（簡易）
  //------------------------------------------------------------------------------------------------
  /**
   * 現在の承認フローの方向を取得
   *
   * 戻り値：
   * - flow: 承認フロー全体（上程者→承認者1→承認者2→...）
   * - action: アクションタイプ（'完了'、'差し戻し'、null（上程中））
   * - actionDate: アクション日時
   *
   * 仕様：
   * 1. 完了している場合：action='完了'
   * 2. 差し戻しされている場合（承認待ちがない場合のみ）：action='差し戻し'
   * 3. それ以外（上程中）：action=null
   *    - 最後の上程ステータス（Status=0）から下の承認者を表示
   *    - 承認済み（Status=2）も含めて、現在の承認待ち（Status=1）まで表示
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
    // Status=7（差し戻し対象）が存在する場合、その一つ前（FlowOrder - 1）にStatus=3（差し戻し）が存在する
    const rejectionTarget = approvalStatus.find((a) => a.status === 7);
    if (rejectionTarget) {
      // Status=7の一つ前（FlowOrder - 1）のStatus=3を取得
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
    // FlowOrder順にソート
    const sortedApprovals = [...approvalStatus].sort(
      (a, b) => a.flowOrder - b.flowOrder
    );

    // 最後の上程ステータス（Status=0）を取得
    // Status=0のレコードの中で、最大のFlowOrderを持つものを取得（複数回再上程されている場合に対応）
    const statusZeroRecords = approvalStatus.filter((a) => a.status === 0);
    if (statusZeroRecords.length === 0) {
      return { flow: [], action: null, actionDate: null };
    }

    // 最大のFlowOrderを持つStatus=0のレコードを取得（最後の上程/再上程）
    const submitter = statusZeroRecords.reduce((latest, current) =>
      current.flowOrder > latest.flowOrder ? current : latest
    );

    // 承認待ち（Status=1）を取得
    const pendingApprovals = approvalStatus.filter(
      (a) => a.flowOrder > 0 && a.status === 1
    );

    // 承認待ち（Status=1）の最小FlowOrderを取得
    const minPendingFlowOrder = Math.min(
      ...pendingApprovals.map((a) => a.flowOrder)
    );

    // 最後の上程ステータス（Status=0）のFlowOrderから下のレコードのみを対象にする
    const startFlowOrder = submitter.flowOrder;

    // 上程者/再上程者から現在の承認待ちまでを取得
    const flowUsers: string[] = [submitter.userName];

    // FlowOrder順に、最後の上程ステータスから下のレコードのみを処理
    for (const approval of sortedApprovals) {
      // 最後の上程ステータスより前のレコードはスキップ（過去の承認履歴を除外）
      if (approval.flowOrder <= startFlowOrder) continue;
      // 現在の承認待ちより後は追加しない
      if (approval.flowOrder > minPendingFlowOrder) break;

      // 最後の上程ステータスから下の範囲内で、承認済み（Status=2）または承認待ち（Status=1）を追加
      if (approval.status === 1 || approval.status === 2) {
        flowUsers.push(approval.userName);
      }
    }

    // アクションタイプと日時を決定
    // 上程中の場合はaction=null（表示側で「上程中」と表示）
    let actionDate: string | null = submitter.actionDate;

    // 最後の上程ステータスから下の範囲内で、承認済み（Status=2）の承認者がいる場合は最後の承認者の日時を使用
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
      action: null, // 上程中
      actionDate,
    };
  }, [approvalStatus, isCompleted]);

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
    isCompleted,
    canResubmit,
    canRecall,
    getApprovalFlowDirection,

    // アクション
    submitApproval,
    approve,
    reject,
    resubmit,
    recall,
    refresh,
  };
};
