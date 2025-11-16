import { useState, useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import axios from 'axios';
import { currentUserAtom } from '../atoms/authAtom';
import { useApproval, type ApprovalStatus, type ApprovalRequest } from '../hooks/useApproval';
import ApprovalFlowCard from './ApprovalFlowCard';

export type User = {
  id: number;
  name: string;
  email?: string; // メールアドレスは後でAPIから取得する想定
  department?: string; // 部署
  position?: string; // 役職
  createdAt?: string;
  updatedAt?: string;
};

type ApprovalDrawerProps = {
  onClose: () => void;
  pageCode: number; // ページタイプコード（1: 複数レコード型, 2: 1レコード型）
  year: number;
  month: number;
  reportNo?: string; // 特定の報告書Noで取得する場合（PageCode=2の場合は必須）
  onApprovalChange?: () => void; // 上程状態が変更された時に呼ばれるコールバック
};

const ApprovalDrawer = ({ onClose, pageCode, year, month, reportNo, onApprovalChange }: ApprovalDrawerProps) => {
  // ============================================================================
  // 状態管理
  // ============================================================================
  const [currentUser] = useAtom(currentUserAtom);
  const [users, setUsers] = useState<User[]>([]);
  const [comment, setComment] = useState('');
  // 承認者を順番に保持（配列のインデックスが順序を表す）
  const [selectedApprovers, setSelectedApprovers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  // 承認・差し戻し用のコメント
  const [approvalComment, setApprovalComment] = useState('');

  // useApproval hookを使用
  const {
    approvalStatus,
    loading: approvalLoading,
    hasExistingFlow,
    canResubmit,
    isCompleted,
    submitApproval,
    approve,
    reject,
    resubmit,
    recall,
    refresh,
    canRecall,
  } = useApproval({
    pageCode,
    year,
    month,
    reportNo,
    autoFetch: true, // コンポーネントがマウントされている = 開いている状態
  });

  // 既存の上程状態がある場合、それを表示用に設定
  const existingFlow = hasExistingFlow();

  // ============================================================================
  // 初期化処理（コンポーネントマウント時）
  // ============================================================================
  useEffect(() => {
    fetchUsers();
  }, []); // マウント時のみ実行

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get<User[]>('/api/users');
      setUsers(res.data);
    } catch (error) {
      console.error('ユーザーの取得に失敗しました:', error);
      alert('ユーザーの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 【最初の上程フェーズ】新規上程関連の処理
  // ============================================================================

  /**
   * 承認者のチェックボックスのトグル処理
   * チェックされた場合は追加、チェックが外れた場合は削除
   */
  const handleToggleApprover = (userId: number) => {
    const selectedUser = users.find((u) => u.id === userId);
    if (!selectedUser) return;

    // 上程者は選択不可
    if (selectedUser.name === currentUser?.name) {
      return;
    }

    setSelectedApprovers((prev) => {
      const isSelected = prev.some((a) => a.id === userId);
      if (isSelected) {
        // 既に選択されている場合は削除
        return prev.filter((a) => a.id !== userId);
      } else {
        // 選択されていない場合は追加（選択した順序を保持）
        return [...prev, selectedUser];
      }
    });
  };

  /**
   * 承認者が選択されているかどうかを判定
   */
  const isApproverSelected = (userId: number) => {
    return selectedApprovers.some((a) => a.id === userId);
  };

  /**
   * 承認者として選択可能なユーザーリスト（上程者を除外）
   */
  const getAvailableUsers = () => {
    return users.filter((user) => user.name !== currentUser?.name);
  };

  /**
   * 【最初の上程フェーズ】新規上程の送信処理
   * 
   * 処理フロー：
   * 1. 報告書Noの生成（新規上程の場合は新しいreportNoを生成）
   * 2. 新規上程APIを呼び出し
   * 3. フォームをリセットし、状態を更新
   * 
   * 注意：バリデーションはボタンのdisabled属性で制御しているため、
   * この関数が呼ばれる時点では既にバリデーションは通過している
   */
  const handleNewSubmission = async () => {
    // ボタンがdisabledになっているため、通常は呼ばれないが、型安全性のためチェック
    if (!currentUser) {
      return;
    }

    try {
      // PageCode=2（1レコード型）の場合はreportNo必須、PageCode=1（複数レコード型）の場合は空文字列
      const newReportNo = pageCode === 2 ? (reportNo || '') : '';

      const request: ApprovalRequest = {
        pageCode,
        reportNo: newReportNo,
        year,
        month,
        comment: comment.trim() || '', // 空欄の場合は空文字列（バックエンドでnullに変換）
        approverNames: selectedApprovers.map((a) => a.name),
        submitterName: currentUser.name,
      };

      // 【最初の上程フェーズ】新規上程APIを呼び出し
      await submitApproval(request);
      alert('上程が完了しました。');

      // フォームをリセット
      setComment('');
      setSelectedApprovers([]);
      await refresh();
      // 親コンポーネントの状態も更新
      onApprovalChange?.();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : '上程に失敗しました。');
    }
  };

  // ============================================================================
  // 【差し戻しフェーズ】差し戻し関連の処理
  // ============================================================================

  /**
   * 【差し戻しフェーズ】最新の差し戻しされた承認者を取得
   * 
   * 複数の差し戻しがある場合、最新（最大flowOrder）の差し戻しを取得
   * 再上程の判定や色付けロジックで使用される
   */
  const rejectedApprover = useMemo(() => {
    const rejectedApprovals = approvalStatus.filter((a) => a.status === 3);
    if (rejectedApprovals.length === 0) return undefined;
    // 最大flowOrderの差し戻しを取得（最新の差し戻し）
    return rejectedApprovals.reduce((latest, current) =>
      current.flowOrder > latest.flowOrder ? current : latest
    );
  }, [approvalStatus]);

  /**
   * 【最初の上程フェーズ / 再上程フェーズ】差し戻し処理
   * 
   * 承認待ちまたは承認スキップのレコードに対して差し戻しを実行
   * 差し戻し（Status=3）になると、その後の承認者は削除され、
   * 再上程フェーズが開始可能になる
   */
  const handleReject = async () => {
    const pendingApproval = getCurrentPendingApproval();
    if (!pendingApproval) {
      alert('承認対象が見つかりません。');
      return;
    }

    if (!approvalComment.trim()) {
      alert('差し戻し理由を入力してください。');
      return;
    }

    if (!window.confirm('差し戻しを実行しますか？')) {
      return;
    }

    try {
      await reject(pendingApproval.id, approvalComment.trim());
      alert('差し戻しが完了しました。');
      setApprovalComment('');
      await refresh();
      // 親コンポーネントの状態も更新
      onApprovalChange?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : '差し戻しに失敗しました。');
    }
  };

  // ============================================================================
  // 【再上程フェーズ】再上程関連の処理
  // ============================================================================

  /**
   * 【再上程フェーズ】差し戻し以降のフロー（再上程）を取得
   * 
   * 最新の差し戻しのFlowOrderより大きいFlowOrderのレコードを取得
   * 再上程の上程者と承認者を判定するために使用
   */
  const resubmissionFlow = useMemo(() => {
    // 差し戻し対象者レコード（Status=7）を取得
    const rejectionTarget = approvalStatus.find((a) => a.status === 7);
    if (!rejectionTarget) {
      // 差し戻し対象者レコードがない場合、差し戻し以降のレコードを取得（後方互換性のため）
      if (!rejectedApprover) return [];
      return approvalStatus
        .filter((a) => a.flowOrder > rejectedApprover.flowOrder)
        .sort((a, b) => a.flowOrder - b.flowOrder);
    }
    // 差し戻し対象者レコード以降のレコードを取得
    return approvalStatus
      .filter((a) => a.flowOrder >= rejectionTarget.flowOrder)
      .sort((a, b) => a.flowOrder - b.flowOrder);
  }, [approvalStatus, rejectedApprover]);

  /**
   * 【再上程フェーズ】再上程の上程者レコード
   * 
   * 差し戻しされた承認者の次のFlowOrderでStatus=0のもの
   * 再上程フォームの表示判定に使用
   */
  const resubmissionSubmitter = useMemo(() => {
    // 差し戻し対象者レコード（Status=7）を取得
    const rejectionTarget = approvalStatus.find((a) => a.status === 7);
    if (!rejectionTarget) {
      // 差し戻し対象者レコードがない場合、従来のロジックを使用（後方互換性のため）
      if (!rejectedApprover) return null;
      return resubmissionFlow.find((a) => a.flowOrder === rejectedApprover.flowOrder + 1 && a.status === 0) || null;
    }
    // 差し戻し対象者レコードが更新されてStatus=0になったレコードを取得
    return resubmissionFlow.find((a) => a.flowOrder === rejectionTarget.flowOrder && a.status === 0) || null;
  }, [resubmissionFlow, rejectedApprover, approvalStatus]);

  /**
   * 【再上程フェーズ】再上程の承認者レコード
   * 
   * 再上程の上程者より後のFlowOrderのレコード
   * 承認待ちの判定に使用
   */
  const resubmissionApprovers = useMemo(() => {
    return resubmissionFlow
      .filter((a) => a.flowOrder > (resubmissionSubmitter?.flowOrder || 0))
      .sort((a, b) => a.flowOrder - b.flowOrder);
  }, [resubmissionFlow, resubmissionSubmitter]);

  /**
   * 【再上程フェーズ】再上程フォームが表示されているかどうかを判定
   * 
   * 条件：
   * - 最新の差し戻しが存在する（差し戻しフェーズがある）
   * - 差し戻し以降に再上程がまだない（再上程フェーズがない）
   * 
   * 再上程フォームが表示されている場合、新規上程ではなく再上程として処理される
   */
  const showResubmissionForm = useMemo(() => {
    // 差し戻し対象者レコード（Status=7）を取得
    const rejectionTarget = approvalStatus.find((a) => a.status === 7);
    if (!rejectionTarget) return false;

    if (!rejectedApprover) return false;

    // 差し戻しした承認者本人は再上程フォームを表示しない
    if (rejectedApprover.userName === currentUser?.name) {
      return false;
    }

    // 差し戻し対象者レコード以降に再上程があるかチェック（Status=0のレコードが存在するか）
    const hasResubmission = approvalStatus.some(
      (a) => a.flowOrder > rejectionTarget.flowOrder && a.status === 0
    );
    return !hasResubmission;
  }, [rejectedApprover, approvalStatus, currentUser]);

  // 再上程フォームが表示されたら、選択済み承認者をリセット（初回のみ）
  const [hasResetResubmissionForm, setHasResetResubmissionForm] = useState(false);
  useEffect(() => {
    if (showResubmissionForm && !hasResetResubmissionForm) {
      setSelectedApprovers([]);
      setComment('');
      setHasResetResubmissionForm(true);
    } else if (!showResubmissionForm) {
      setHasResetResubmissionForm(false);
    }
  }, [showResubmissionForm, hasResetResubmissionForm]);

  /**
   * 【再上程フェーズ】再上程の送信処理
   * 
   * 処理フロー：
   * 1. 報告書Noの決定（既存のreportNoを使用）
   * 2. 再上程APIを呼び出し
   * 3. フォームをリセットし、状態を更新
   * 
   * 注意：バリデーションはボタンのdisabled属性で制御しているため、
   * この関数が呼ばれる時点では既にバリデーションは通過している
   */
  const handleResubmit = async () => {
    // ボタンがdisabledになっているため、通常は呼ばれないが、型安全性のためチェック
    if (!currentUser) {
      return;
    }

    try {
      // 既存のフローがある場合は、既存のreportNoを使用（すべてのレコードは同じreportNoを持つ）
      if (!existingFlow || approvalStatus.length === 0) {
        alert('再上程に失敗しました。既存のフローが見つかりません。');
        return;
      }

      // 既存のレコードからreportNoを取得（どのレコードでも同じ値）
      // PageCode=1（複数レコード型）の場合は空文字列、PageCode=2（1レコード型）の場合は既存のreportNoを使用
      const existingReportNo = pageCode === 1 ? '' : (approvalStatus[0].reportNo || '');

      const request: ApprovalRequest = {
        pageCode,
        reportNo: existingReportNo,
        year,
        month,
        comment: comment.trim() || '', // 空欄の場合は空文字列（バックエンドでnullに変換）
        approverNames: selectedApprovers.map((a) => a.name),
        submitterName: currentUser.name,
      };

      // 【再上程フェーズ】再上程APIを呼び出し
      await resubmit(request);
      alert('再上程が完了しました。');

      // フォームをリセット
      setComment('');
      setSelectedApprovers([]);
      await refresh();
      // 親コンポーネントの状態も更新
      onApprovalChange?.();
      // 再上程の場合はDrawerを閉じない（フローを確認できるように）
      if (!canResubmit() || resubmissionFlow.length > 0) {
        onClose();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '再上程に失敗しました。');
    }
  };

  // ============================================================================
  // 共通処理（最初の上程フェーズ / 再上程フェーズの両方で使用）
  // ============================================================================

  /**
   * フロー全体を表示用に整理（すべてのレコードをflowOrder順に並べる）
   * 
   * DBの状態をそのままFlowOrder順に表示する
   * フェーズの構成：
   * - 【最初の上程フェーズ】FlowOrder=0（上程者）から最初の差し戻しまでのレコード
   * - 【差し戻しフェーズ】Status=3のレコード（最新の差し戻し）
   * - 【再上程フェーズ】差し戻し以降のレコード（FlowOrder > rejectedApprover.flowOrder）
   */
  const allFlowRecords = useMemo(() => {
    return approvalStatus.sort((a, b) => a.flowOrder - b.flowOrder);
  }, [approvalStatus]);

  /**
   * 【最初の上程フェーズ / 再上程フェーズ】現在の承認待ちレコードを取得
   * 
   * 承認待ち（Status=1）または承認スキップ（Status=6）のレコードを対象とする
   * 優先順位：
   * 1. 【再上程フェーズ】再上程の承認待ちまたは承認スキップを優先
   * 2. 【最初の上程フェーズ】最初の上程フェーズの承認待ちまたは承認スキップ
   */
  const getCurrentPendingApproval = (): ApprovalStatus | undefined => {
    if (!currentUser || !existingFlow) return undefined;
    // 【再上程フェーズ】再上程の承認待ちまたは承認スキップを優先
    const resubmissionPending = resubmissionApprovers.find(
      (a) => (a.status === 1 || a.status === 6) && a.userName === currentUser.name
    );
    if (resubmissionPending) return resubmissionPending;
    // 【最初の上程フェーズ】最初の上程フェーズの承認待ちまたは承認スキップ
    return approvalStatus.find(
      (a) => (a.status === 1 || a.status === 6) && a.userName === currentUser.name
    );
  };

  /**
   * 【最初の上程フェーズ / 再上程フェーズ】承認処理
   * 
   * 承認待ちまたは承認スキップのレコードに対して承認を実行
   * 最後の承認者の場合は完了（Status=5）、それ以外は承認済み（Status=2）になる
   */
  const handleApprove = async () => {
    const pendingApproval = getCurrentPendingApproval();
    if (!pendingApproval) {
      alert('承認対象が見つかりません。');
      return;
    }

    try {
      await approve(pendingApproval.id, approvalComment.trim());
      alert('承認が完了しました。');
      setApprovalComment('');
      await refresh();
      // 親コンポーネントの状態も更新
      onApprovalChange?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : '承認に失敗しました。');
    }
  };

  // ============================================================================
  // ヘルパー関数
  // ============================================================================

  // 状態ラベルを取得
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return '上程';
      case 1:
        return '承認待ち';
      case 2:
        return '承認済み';
      case 3:
        return '差戻';
      case 4:
        return '取り戻し';
      case 5:
        return '完了';
      case 6:
        return '承認スキップ';
      case 7:
        return '差し戻し対象';
      default:
        return '不明';
    }
  };

  const handleClose = () => {
    if (!existingFlow) {
      setComment('');
      setSelectedApprovers([]);
    }
    setApprovalComment('');
    onClose();
  };

  // ============================================================================
  // UI レンダリング
  // ============================================================================

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-[600px] bg-white shadow-xl transition-transform duration-300 ease-in-out translate-x-0"
      >
        <div className="flex h-full flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-bold">上程</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* 【最初の上程フェーズ】上程ボタン（ヘッダー下、新規上程時のみ表示） */}
          {!existingFlow && (
            <div className="border-b p-4">
              <button
                onClick={handleNewSubmission}
                disabled={loading || approvalLoading || !currentUser || selectedApprovers.length === 0}
                className="w-full rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                上程
              </button>
            </div>
          )}

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading || approvalLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : (
              <>
                {existingFlow ? (
                  // 既存の上程フローを表示
                  <>
                    {/* 上程フロー表示 */}
                    <div className="mb-6">
                      <label className="mb-3 block text-sm font-medium text-gray-700">
                        承認フロー
                      </label>
                      <div className="space-y-3">
                        {/* 
                          DBの状態をFlowOrder順にそのまま表示
                          フェーズの構成：
                          1. 【最初の上程フェーズ】FlowOrder=0（上程者）から最初の差し戻しまでのレコード
                          2. 【差し戻しフェーズ】Status=3のレコード（最新の差し戻し）
                          3. 【再上程フェーズ】差し戻し以降のレコード（FlowOrder > rejectedApprover.flowOrder）
                        */}
                        {allFlowRecords.map((record, index) => {
                          const isRejected = record.status === 3;

                          // 下矢印を表示するかどうか
                          // 差し戻しの場合は常に表示、それ以外は次のレコードがある場合のみ表示
                          const showArrow = isRejected || index < allFlowRecords.length - 1;

                          // 現在の承認待ちレコードかどうかを判定
                          const currentPendingApproval = getCurrentPendingApproval();
                          const isCurrentPendingRecord = currentPendingApproval?.id === record.id;

                          // ユーザー名からメールアドレスを取得
                          const user = users.find((u) => u.name === record.userName);
                          const userEmail = user?.email;

                          // 取り戻し可能かどうかを判定
                          const recordCanRecall = canRecall(record);

                          // 取り戻しハンドラ
                          const handleRecall = async () => {
                            if (!window.confirm('取り戻しを実行しますか？')) {
                              return;
                            }

                            try {
                              await recall(record.id);
                              alert('取り戻しが完了しました。');
                              await refresh();
                              onApprovalChange?.();
                            } catch (error) {
                              alert(error instanceof Error ? error.message : '取り戻しに失敗しました。');
                            }
                          };

                          return (
                            <ApprovalFlowCard
                              key={`flow-${record.id}-${index}`}
                              record={record}
                              rejectedApprover={rejectedApprover}
                              resubmissionFlow={resubmissionFlow}
                              approvalStatus={approvalStatus}
                              showArrow={showArrow}
                              getStatusLabel={getStatusLabel}
                              isCurrentPendingRecord={isCurrentPendingRecord}
                              approvalComment={approvalComment}
                              onApprovalCommentChange={setApprovalComment}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onRecall={handleRecall}
                              canRecall={recordCanRecall}
                              userEmail={userEmail}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* 
                      【再上程フェーズ】最新の差し戻しがある場合、その下に再上程フォームを表示
                      条件：
                      - 差し戻しフェーズが存在する（rejectedApprover !== undefined）
                      - 再上程フェーズがまだ存在しない（showResubmissionForm === true）
                    */}
                    {showResubmissionForm && rejectedApprover && (
                      <>
                        {/* 再上程フォーム */}
                        <div className="mb-6 rounded-lg border-2 border-blue-500 bg-blue-50 p-4">
                          <div className="mb-3 text-sm font-bold text-blue-800">
                            再上程
                          </div>

                          {/* 上程者表示（ログインユーザー固定） */}
                          <div className="mb-4">
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                              上程者
                            </label>
                            <div className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                              {currentUser?.name || 'ログインが必要です'}
                            </div>
                            {currentUser?.email && (
                              <div className="mt-1 text-xs text-gray-600">
                                <span className="font-medium">メールアドレス:</span>{' '}
                                {currentUser.email}
                              </div>
                            )}
                          </div>

                          {/* コメント入力 */}
                          <div className="mb-4">
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                              コメント
                            </label>
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                              placeholder="コメントを入力してください"
                            />
                          </div>

                          {/* 承認フロー表示（選択した承認者） */}
                          {selectedApprovers.length > 0 && (
                            <div className="mb-4">
                              <label className="mb-2 block text-xs font-medium text-gray-700">
                                承認フロー
                              </label>
                              <div className="space-y-2">
                                {/* 上程者 */}
                                {currentUser && (
                                  <div className="flex flex-col items-center">
                                    <div className="rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-3 w-full">
                                      <div className="text-lg font-semibold text-gray-800">
                                        {currentUser.name}
                                      </div>
                                      {currentUser.email && (
                                        <div className="mt-1 text-base text-gray-600">
                                          {currentUser.email}
                                        </div>
                                      )}
                                    </div>
                                    {selectedApprovers.length > 0 && (
                                      <div className="my-1 text-xl text-gray-400">↓</div>
                                    )}
                                  </div>
                                )}

                                {/* 承認者 */}
                                {selectedApprovers.map((approver, index) => (
                                  <div
                                    key={`new-${approver.id}-${index}`}
                                    className="flex flex-col items-center"
                                  >
                                    <div className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 w-full">
                                      <div className="text-lg font-semibold text-gray-800">
                                        {approver.name}
                                      </div>
                                      {approver.email && (
                                        <div className="mt-1 text-base text-gray-600">
                                          {approver.email}
                                        </div>
                                      )}
                                    </div>
                                    {index < selectedApprovers.length - 1 && (
                                      <div className="my-1 text-xl text-gray-400">↓</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 承認者選択（チェックボックス） */}
                          <div className="mb-4">
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                              承認者を選択
                            </label>
                            <div className="max-h-48 overflow-y-auto rounded border border-gray-300 p-2">
                              {getAvailableUsers().map((user) => (
                                <label
                                  key={user.id}
                                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isApproverSelected(user.id)}
                                    onChange={() => handleToggleApprover(user.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-800">{user.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 再上程ボタン */}
                          <button
                            onClick={handleResubmit}
                            disabled={loading || approvalLoading || !currentUser || selectedApprovers.length === 0}
                            className="w-full rounded bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            再上程
                          </button>
                        </div>
                      </>
                    )}



                    {/* 完了状態の表示 */}
                    {isCompleted() && (
                      <div className="mb-4 rounded-lg border-2 border-green-600 bg-green-100 p-3">
                        <div className="text-sm font-bold text-green-800">
                          上程が完了しました
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // 【最初の上程フェーズ】新規上程フォーム
                  <>
                    {/* 上程者表示（ログインユーザー固定） */}
                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        上程者
                      </label>
                      <div className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2">
                        {currentUser?.name || 'ログインが必要です'}
                      </div>
                      {/* メールアドレス表示 */}
                      {currentUser?.email && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">メールアドレス:</span>{' '}
                          {currentUser.email}
                        </div>
                      )}
                    </div>

                    {/* コメント入力 */}
                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        コメント
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        placeholder="コメントを入力してください"
                      />
                    </div>

                    {/* 承認フロー表示 */}
                    {(currentUser || selectedApprovers.length > 0) && (
                      <div className="mb-6">
                        <label className="mb-3 block text-sm font-medium text-gray-700">
                          承認フロー
                        </label>
                        <div className="space-y-3">
                          {/* 上程者 */}
                          {currentUser && (
                            <div className="flex flex-col items-center">
                              <div className="rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-3 w-full">
                                <div className="text-lg font-semibold text-gray-800">
                                  {currentUser.name}
                                </div>
                                {currentUser.email && (
                                  <div className="mt-1 text-base text-gray-600">
                                    {currentUser.email}
                                  </div>
                                )}
                              </div>
                              {selectedApprovers.length > 0 && (
                                <div className="my-1 text-2xl text-gray-400">↓</div>
                              )}
                            </div>
                          )}

                          {/* 承認者 */}
                          {selectedApprovers.map((approver, index) => (
                            <div
                              key={`${approver.id}-${index}`}
                              className="flex flex-col items-center"
                            >
                              <div className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 w-full">
                                <div className="text-lg font-semibold text-gray-800">
                                  {approver.name}
                                </div>
                                {approver.email && (
                                  <div className="mt-1 text-base text-gray-600">
                                    {approver.email}
                                  </div>
                                )}
                              </div>
                              {index < selectedApprovers.length - 1 && (
                                <div className="my-1 text-2xl text-gray-400">↓</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 承認者選択（チェックボックス） */}
                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        承認者を選択
                      </label>
                      <div className="max-h-64 overflow-y-auto rounded border border-gray-300 p-3">
                        {getAvailableUsers().map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isApproverSelected(user.id)}
                              onChange={() => handleToggleApprover(user.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-800">{user.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* フッター */}
          <div className="border-t p-4">
            <button
              onClick={handleClose}
              className="w-full rounded bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ApprovalDrawer;


