/* ----------------------------------------------------------------
 * ApprovalDrawer.tsx
 * 承認Drawerコンポーネント
 * 新規上程、承認、差し戻し、再上程、取り戻しの機能を提供
 * ---------------------------------------------------------------- */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import axios from 'axios';
import { currentUserAtom } from '../atoms/authAtom';
import type { ApprovalStatus, ApprovalRequest } from '../types/approval';
import {
  approveApproval,
  rejectApproval,
  recallApproval,
  createApproval,
  resubmitApproval,
} from '../api/approvalApi';
import ApprovalFlowCard from './ApprovalFlowCard';

// ============================================================================
// 型定義
// ============================================================================
export type User = {
  id: number;
  name: string;
  email?: string;
  department?: string;
  position?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApprovalDrawerProps = {
  onClose: () => void;
  approvalId: string; // 必須（4桁の文字列、例："0101"）
  reportNo: string; // 必須
  approvalStatus: ApprovalStatus[]; // 承認状態（親コンポーネントから受け取る）
  loading?: boolean; // 読み込み状態
  onApprovalChange: () => void; // 上程状態が変更された時に呼ばれるコールバック（必須）
};

// ============================================================================
// コンポーネント
// ============================================================================
const ApprovalDrawer = ({
  onClose,
  approvalId,
  reportNo,
  approvalStatus,
  loading: approvalLoading = false,
  onApprovalChange,
}: ApprovalDrawerProps) => {
  // ============================================================================
  // 状態管理
  // ============================================================================
  const [currentUser] = useAtom(currentUserAtom);
  const [users, setUsers] = useState<User[]>([]);
  const [comment, setComment] = useState('');
  const [selectedApprovers, setSelectedApprovers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [hasResetResubmissionForm, setHasResetResubmissionForm] = useState(false);

  // 右側列のスクロールコンテナへの参照
  const rightColumnScrollRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // 初期化処理
  // ============================================================================
  useEffect(() => {
    fetchUsers();
  }, []);

  /**
   * ユーザー一覧を取得
   */
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
  // 判定関数
  // ============================================================================
  // 既存の上程フローがあるか判定
  const existingFlow = approvalStatus.length > 0;

  // 完了しているか判定
  const isCompleted = useMemo((): boolean => {
    return approvalStatus.some((a) => a.status === 5);
  }, [approvalStatus]);

  // 再上程可能か（差し戻し対象者のみ再上程可能）
  const canResubmit = useMemo((): boolean => {
    if (!currentUser) return false;
    const rejectionTarget = approvalStatus.find((a) => a.status === 6);
    if (!rejectionTarget) return false;
    return rejectionTarget.userName === currentUser.name;
  }, [currentUser, approvalStatus]);

  // 再上程フォームを表示するか判定
  const showResubmissionForm = canResubmit;

  // 取り戻し可能かどうかを判定
  const canRecall = useCallback(
    (record: ApprovalStatus): boolean => {
      if (!currentUser) return false;
      if (record.userName !== currentUser.name) return false;
      if (record.status !== 0) return false;

      const hasRejectionTarget = approvalStatus.some((a) => a.status === 6);
      if (hasRejectionTarget) return false;

      const statusZeroRecords = approvalStatus.filter((a) => a.status === 0);
      if (statusZeroRecords.length === 0) return false;

      const maxFlowOrder = Math.max(...statusZeroRecords.map((a) => a.flowOrder));
      return record.flowOrder === maxFlowOrder;
    },
    [currentUser, approvalStatus]
  );

  // 差し戻しした承認者を取得
  const rejectedApprover = useMemo(() => {
    const rejectedApprovals = approvalStatus.filter((a) => a.status === 3);
    if (rejectedApprovals.length === 0) return undefined;
    return rejectedApprovals.reduce((latest, current) =>
      current.flowOrder > latest.flowOrder ? current : latest
    );
  }, [approvalStatus]);

  // 再上程フローを取得
  const resubmissionFlow = useMemo(() => {
    const rejectionTarget = approvalStatus.find((a) => a.status === 6);
    if (!rejectionTarget) {
      if (!rejectedApprover) return [];
      return approvalStatus
        .filter((a) => a.flowOrder > rejectedApprover.flowOrder)
        .sort((a, b) => a.flowOrder - b.flowOrder);
    }
    return approvalStatus
      .filter((a) => a.flowOrder >= rejectionTarget.flowOrder)
      .sort((a, b) => a.flowOrder - b.flowOrder);
  }, [approvalStatus, rejectedApprover]);

  // 全フローレコードをFlowOrder順にソートして取得
  const allFlowRecords = useMemo(() => {
    return approvalStatus.sort((a, b) => a.flowOrder - b.flowOrder);
  }, [approvalStatus]);

  // 次にアクションが必要な承認待ちレコードを取得（最小FlowOrderの承認待ちレコード）
  const getNextPendingApproval = (): ApprovalStatus | undefined => {
    if (!existingFlow) return undefined;

    const pendingApprovals = approvalStatus.filter(
      (a) => a.flowOrder > 0 && a.status === 1
    );
    if (pendingApprovals.length === 0) return undefined;

    const minFlowOrder = Math.min(...pendingApprovals.map((a) => a.flowOrder));
    return pendingApprovals.find((a) => a.flowOrder === minFlowOrder);
  };

  // 現在の承認待ちレコードを取得（ログインユーザーが次にアクションが必要な場合のみ）
  const getCurrentPendingApproval = (): ApprovalStatus | undefined => {
    if (!currentUser) return undefined;
    const nextPending = getNextPendingApproval();
    if (!nextPending) return undefined;
    return nextPending.userName === currentUser.name ? nextPending : undefined;
  };

  // ============================================================================
  // イベントハンドラ
  // ============================================================================
  // 承認者の選択/解除を切り替え処理
  const handleToggleApprover = (userId: number) => {
    const selectedUser = users.find((u) => u.id === userId);
    if (!selectedUser || selectedUser.name === currentUser?.name) return;

    setSelectedApprovers((prev) => {
      const isSelected = prev.some((a) => a.id === userId);
      return isSelected ? prev.filter((a) => a.id !== userId) : [...prev, selectedUser];
    });
  };

  // チェックボックスの選択状態を判定
  const isApproverSelected = (userId: number) => {
    return selectedApprovers.some((a) => a.id === userId);
  };

  // 承認者として選択可能なユーザー一覧を取得
  const getAvailableUsers = () => {
    return users.filter((user) => user.name !== currentUser?.name);
  };

  /**
   * 新規上程処理
   */
  const handleNewSubmission = async () => {
    if (!currentUser) return;

    try {
      const request: ApprovalRequest = {
        reportNo,
        approvalId,
        comment: comment.trim() || '',
        approverNames: selectedApprovers.map((a) => a.name),
        submitterName: currentUser.name,
      };

      await createApproval(request);
      alert('上程が完了しました。');

      setComment('');
      setSelectedApprovers([]);
      onApprovalChange();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : '上程に失敗しました。');
    }
  };

  /**
   * 承認処理
   */
  const handleApprove = async () => {
    const pendingApproval = getCurrentPendingApproval();
    if (!pendingApproval) {
      alert('承認対象が見つかりません。');
      return;
    }

    if (!currentUser) {
      alert('ログインが必要です。');
      return;
    }

    try {
      setLoading(true);
      await approveApproval({
        approvalId: pendingApproval.approvalId,
        reportNo: pendingApproval.reportNo,
        flowOrder: pendingApproval.flowOrder,
        userName: currentUser.name,
        comment: approvalComment.trim(),
      });
      alert('承認が完了しました。');
      setApprovalComment('');
      onApprovalChange();
    } catch (error) {
      alert(error instanceof Error ? error.message : '承認に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 差し戻し処理
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

    if (!currentUser) {
      alert('ログインが必要です。');
      return;
    }

    try {
      setLoading(true);
      await rejectApproval({
        approvalId: pendingApproval.approvalId,
        reportNo: pendingApproval.reportNo,
        flowOrder: pendingApproval.flowOrder,
        userName: currentUser.name,
        comment: approvalComment.trim(),
      });
      alert('差し戻しが完了しました。');
      setApprovalComment('');
      onApprovalChange();
    } catch (error) {
      alert(error instanceof Error ? error.message : '差し戻しに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 再上程処理
   */
  const handleResubmit = async () => {
    if (!currentUser) return;

    try {
      if (!existingFlow || approvalStatus.length === 0) {
        alert('再上程に失敗しました。既存のフローが見つかりません。');
        return;
      }

      const existingReportNo = approvalStatus[0].reportNo || reportNo;
      const existingApprovalId = approvalStatus[0]?.approvalId || approvalId;
      const request: ApprovalRequest = {
        reportNo: existingReportNo,
        approvalId: existingApprovalId,
        comment: comment.trim() || '',
        approverNames: selectedApprovers.map((a) => a.name),
        submitterName: currentUser.name,
      };

      await resubmitApproval(request);
      alert('再上程が完了しました。');

      setComment('');
      setSelectedApprovers([]);
      onApprovalChange();
      if (!canResubmit || resubmissionFlow.length > 0) {
        onClose();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '再上程に失敗しました。');
    }
  };

  /**
   * 取り戻し処理
   */
  const handleRecall = async (record: ApprovalStatus) => {
    if (!window.confirm('取り戻しを実行しますか？')) return;

    if (!currentUser) {
      alert('ログインが必要です。');
      return;
    }

    if (!canRecall(record)) {
      alert('取り戻しできない状態です。');
      return;
    }

    try {
      setLoading(true);
      await recallApproval({
        approvalId: record.approvalId,
        reportNo: record.reportNo,
        flowOrder: record.flowOrder,
        userName: currentUser.name,
      });
      alert('取り戻しが完了しました。');
      onApprovalChange();
    } catch (error) {
      alert(error instanceof Error ? error.message : '取り戻しに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Drawerを閉じる処理
   */
  const handleClose = () => {
    if (!existingFlow) {
      setComment('');
      setSelectedApprovers([]);
    }
    setApprovalComment('');
    onClose();
  };

  // ============================================================================
  // ヘルパー関数
  // ============================================================================
  /**
   * ステータス番号からラベル文字列を取得
   */
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
        return '';
      default:
        return '不明';
    }
  };

  // ============================================================================
  // UI状態の判定
  // ============================================================================
  /**
   * Drawerの表示状態を判定
   */
  const getDrawerWidth = () => {
    if (approvalLoading) {
      return 'w-[400px]';
    }
    if (existingFlow && !showResubmissionForm) {
      return 'w-[400px]';
    }
    if (showResubmissionForm) {
      return 'w-[800px]';
    }
    return 'w-[800px]';
  };

  /**
   * 左側列の表示状態を判定
   */
  const shouldShowLeftColumn = () => {
    return (existingFlow && showResubmissionForm && rejectedApprover) || !existingFlow;
  };

  /**
   * 右側列の幅を判定
   */
  const getRightColumnWidth = () => {
    return !existingFlow || showResubmissionForm ? 'w-[400px]' : 'flex-1';
  };

  /**
   * 右側列の表示内容を判定
   */
  const shouldShowExistingFlow = () => {
    return existingFlow && !(showResubmissionForm && rejectedApprover);
  };

  // ============================================================================
  // 副作用処理
  // ============================================================================
  /**
   * 再上程フォームの表示状態に応じてフォームをリセット
   */
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
   * 承認フローまたはプレビューが表示されたときに、一番下までスクロール
   */
  useEffect(() => {
    if (loading || approvalLoading) return;

    const scrollToBottom = () => {
      if (rightColumnScrollRef.current) {
        const scrollContainer = rightColumnScrollRef.current;
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth',
        });
      }
    };

    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [loading, approvalLoading, shouldShowExistingFlow(), allFlowRecords.length, selectedApprovers.length, approvalStatus.length]);

  // ============================================================================
  // UI レンダリング
  // ============================================================================
  const isLoading = loading || approvalLoading;
  const drawerWidth = getDrawerWidth();
  const showLeftColumn = shouldShowLeftColumn();
  const rightColumnWidth = getRightColumnWidth();
  const showExistingFlow = shouldShowExistingFlow();

  /**
   * 上程フォームコンポーネント（上程者表示 + コメント入力 + 承認者選択を統合）
   */
  const renderApprovalForm = (title: string, commentRows: number = 4) => {
    return (
      <>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-blue-800 mb-3">{title}</h3>
        </div>

        <div className="mb-4">
          <div className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2">
            {currentUser?.name || 'ログインが必要です'}
          </div>
          {currentUser?.email && (
            <div className="mt-2 text-sm text-gray-600">{currentUser.email}</div>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            コメント
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={commentRows}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="コメントを入力してください"
          />
        </div>

        <div className="mb-4">
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
    );
  };

  /**
   * プレビュー用のユーザーカードコンポーネント
   * @param user ユーザー情報
   * @param cardType カードのタイプ: 'submitter'（上程者・オレンジ）, 'approver'（承認者・薄緑）, 'other'（その他・グレー）
   */
  const renderPreviewUserCard = (
    user: { name: string; email?: string },
    cardType: 'submitter' | 'approver' | 'other' = 'other'
  ) => {
    let borderColor: string;
    if (cardType === 'submitter') {
      borderColor = 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400';
    } else if (cardType === 'approver') {
      borderColor = 'border-green-300 bg-green-50 text-green-700';
    } else {
      borderColor = 'border-gray-300 bg-gray-50 text-gray-700';
    }

    return (
      <div className={`rounded-lg border-2 ${borderColor} px-4 py-3 w-full`}>
        <div className="text-lg font-semibold">{user.name}</div>
        {user.email && (
          <div className="mt-1 text-sm text-gray-600">{user.email}</div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full bg-white shadow-xl transition-all duration-300 ease-in-out translate-x-0 ${drawerWidth}`}
      >
        <div className="flex h-full flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-orange-200 bg-orange-50 p-4">
            <h2 className="text-xl font-bold text-orange-800">上程</h2>
            <button
              onClick={handleClose}
              className="text-orange-600 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
            >
              ✕
            </button>
          </div>

          {/* コンテンツエリア */}
          <div className="flex flex-1 overflow-hidden">
            {/* 左側列：上程/再上程フォーム */}
            {showLeftColumn && (
              <div className="w-[400px] border-r overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-gray-500">読み込み中...</p>
                  </div>
                ) : (
                  <>
                    {renderApprovalForm(existingFlow ? '再上程' : '新規上程')}
                    <button
                      onClick={existingFlow ? handleResubmit : handleNewSubmission}
                      disabled={isLoading || !currentUser || selectedApprovers.length === 0}
                      className="w-full rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {existingFlow ? '再上程' : '上程'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 右側列：承認フロー表示 or プレビュー */}
            <div ref={rightColumnScrollRef} className={`overflow-y-auto px-4 pb-16 ${rightColumnWidth}`}>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500">読み込み中...</p>
                </div>
              ) : (
                <>
                  {showExistingFlow ? (
                    <>
                      {/* 固定ヘッダー：承認フロー */}
                      <div className="sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-orange-200 -mx-4 px-4 pt-2">
                        <label className="block text-sm font-medium text-orange-800">
                          承認フロー
                        </label>
                      </div>
                      <div className="space-y-3">
                        {allFlowRecords.map((record, index) => {
                          const isRejected = record.status === 3;
                          const showArrow = isRejected || index < allFlowRecords.length - 1;
                          const nextPendingApproval = getNextPendingApproval();
                          const isNextPendingRecord =
                            nextPendingApproval?.approvalId === record.approvalId &&
                            nextPendingApproval?.reportNo === record.reportNo &&
                            nextPendingApproval?.flowOrder === record.flowOrder;
                          const currentPendingApproval = getCurrentPendingApproval();
                          const isCurrentPendingRecord =
                            currentPendingApproval?.approvalId === record.approvalId &&
                            currentPendingApproval?.reportNo === record.reportNo &&
                            currentPendingApproval?.flowOrder === record.flowOrder;
                          const user = users.find((u) => u.name === record.userName);
                          const recordCanRecall = canRecall(record);

                          return (
                            <ApprovalFlowCard
                              key={`flow-${record.approvalId}-${record.reportNo}-${record.flowOrder}-${index}`}
                              record={record}
                              showArrow={showArrow}
                              getStatusLabel={getStatusLabel}
                              isCurrentPendingRecord={isCurrentPendingRecord}
                              isNextPendingRecord={isNextPendingRecord}
                              approvalComment={approvalComment}
                              onApprovalCommentChange={setApprovalComment}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onRecall={() => handleRecall(record)}
                              canRecall={recordCanRecall}
                              userEmail={user?.email}
                            />
                          );
                        })}
                      </div>

                      {isCompleted && (
                        <div className="mb-4 rounded-lg border-2 border-orange-500 bg-orange-50 p-3 ring-2 ring-orange-400">
                          <div className="text-sm font-bold text-orange-800">
                            上程が完了しました
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* 固定ヘッダー：プレビュー */}
                      <div className="sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-orange-200 -mx-4 px-4 pt-2">
                        <label className="block text-sm font-medium text-orange-800">
                          {existingFlow ? '再上程プレビュー' : '承認フロープレビュー'}
                        </label>
                      </div>

                      {existingFlow && showResubmissionForm ? (
                        <div className="space-y-3">
                          {/* 既存の上程フロー（差し戻し対象まで） */}
                          {allFlowRecords
                            .filter((record) => {
                              const rejectionTarget = approvalStatus.find((a) => a.status === 6);
                              if (!rejectionTarget) {
                                return rejectedApprover
                                  ? record.flowOrder <= rejectedApprover.flowOrder
                                  : true;
                              }
                              return record.flowOrder <= rejectionTarget.flowOrder;
                            })
                            .map((record, index, filteredRecords) => {
                              const isRejectionTarget = record.status === 6;

                              const showArrow =
                                record.status === 3 ||
                                index < filteredRecords.length - 1 ||
                                selectedApprovers.length > 0;

                              const user = users.find((u) => u.name === record.userName);
                              const userEmail =
                                isRejectionTarget && currentUser
                                  ? currentUser.email
                                  : user?.email;

                              const previewUserName =
                                isRejectionTarget && currentUser
                                  ? currentUser.name
                                  : undefined;
                              const previewStatusLabel = isRejectionTarget ? '再上程' : undefined;
                              const previewColor: 'orange' | 'gray' = isRejectionTarget
                                ? 'orange'
                                : 'gray';

                              return (
                                <ApprovalFlowCard
                                  key={`existing-${record.approvalId}-${record.reportNo}-${record.flowOrder}-${index}`}
                                  record={record}
                                  showArrow={showArrow}
                                  getStatusLabel={getStatusLabel}
                                  userEmail={userEmail}
                                  previewMode={true}
                                  previewUserName={previewUserName}
                                  previewStatusLabel={previewStatusLabel}
                                  previewColor={previewColor}
                                />
                              );
                            })}

                          {/* 選択した承認者（すべて薄緑） */}
                          {selectedApprovers.map((approver, index) => (
                            <div
                              key={`preview-${approver.id}-${index}`}
                              className="flex flex-col items-center"
                            >
                              {renderPreviewUserCard(approver, 'approver')}
                              {index < selectedApprovers.length - 1 && (
                                <div className="my-1 text-2xl text-orange-300">↓</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        currentUser || selectedApprovers.length > 0 ? (
                          <div className="space-y-3">
                            {/* 上程者（オレンジ） */}
                            {currentUser && (
                              <div className="flex flex-col items-center">
                                {renderPreviewUserCard(currentUser, 'submitter')}
                                {selectedApprovers.length > 0 && (
                                  <div className="my-1 text-2xl text-orange-300">↓</div>
                                )}
                              </div>
                            )}

                            {/* 承認者（すべて薄緑） */}
                            {selectedApprovers.map((approver, index) => (
                              <div
                                key={`preview-${approver.id}-${index}`}
                                className="flex flex-col items-center"
                              >
                                {renderPreviewUserCard(approver, 'approver')}
                                {index < selectedApprovers.length - 1 && (
                                  <div className="my-1 text-2xl text-orange-300">↓</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-8 rounded border-2 border-dashed border-gray-300">
                            <p className="text-gray-400">左側で承認者を選択してください</p>
                          </div>
                        )
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ApprovalDrawer;
