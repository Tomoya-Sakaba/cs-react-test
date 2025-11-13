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
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  reportNo?: string; // 特定の報告書Noで取得する場合
};

const ApprovalDrawer = ({ isOpen, onClose, year, month, reportNo }: ApprovalDrawerProps) => {
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
    submitterRecord,
    approverRecords,
    isApprovalTarget,
    canResubmit,
    isCompleted,
    submitApproval,
    approve,
    reject,
    resubmit,
    refresh,
  } = useApproval({
    year,
    month,
    reportNo,
    autoFetch: isOpen, // Drawerが開いている時のみ自動取得
  });

  // 既存の上程状態がある場合、それを表示用に設定
  const existingFlow = approvalStatus.length > 0;

  /**
   * 最新の差し戻しされた承認者を取得
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

  // approverRecordsのIDとstatusの組み合わせで判定（依存配列用）
  const approverRecordsKey = useMemo(() => {
    return approverRecords.map(a => `${a.id}-${a.status}`).join(',');
  }, [approverRecords]);

  /**
   * 差し戻し以降のフロー（再上程）を取得
   * 
   * 最新の差し戻しのFlowOrderより大きいFlowOrderのレコードを取得
   * 再上程の上程者と承認者を判定するために使用
   */
  const resubmissionFlow = useMemo(() => {
    if (!rejectedApprover) return [];
    return approvalStatus
      .filter((a) => a.flowOrder > rejectedApprover.flowOrder)
      .sort((a, b) => a.flowOrder - b.flowOrder);
  }, [approvalStatus, rejectedApprover]);

  // フロー全体を表示用に整理（すべてのレコードをflowOrder順に並べる）
  const allFlowRecords = useMemo(() => {
    return approvalStatus.sort((a, b) => a.flowOrder - b.flowOrder);
  }, [approvalStatus]);

  // 再上程の上程者レコード（差し戻しされた承認者の次のFlowOrderでStatus=0のもの）
  const resubmissionSubmitter = useMemo(() => {
    if (!rejectedApprover) return null;
    return resubmissionFlow.find((a) => a.flowOrder === rejectedApprover.flowOrder + 1 && a.status === 0) || null;
  }, [resubmissionFlow, rejectedApprover]);

  // 再上程の承認者レコード（useMemoでメモ化）
  const resubmissionApprovers = useMemo(() => {
    return resubmissionFlow
      .filter((a) => a.flowOrder > (resubmissionSubmitter?.flowOrder || 0))
      .sort((a, b) => a.flowOrder - b.flowOrder);
  }, [resubmissionFlow, resubmissionSubmitter]);

  // 差し戻しがあるかどうか（useMemoでメモ化）
  const hasRejection = useMemo(() => {
    return rejectedApprover !== undefined;
  }, [rejectedApprover]);

  /**
   * 再上程フォームが表示されているかどうかを判定
   * 
   * 条件：
   * - 最新の差し戻しが存在する
   * - 差し戻し以降に再上程がまだない
   * 
   * 再上程フォームが表示されている場合、新規上程ではなく再上程として処理される
   */
  const showResubmissionForm = useMemo(() => {
    if (!rejectedApprover) return false;
    // 差し戻し以降に再上程があるかチェック
    const hasResubmission = approvalStatus.some(
      (a) => a.flowOrder > rejectedApprover.flowOrder
    );
    return !hasResubmission;
  }, [rejectedApprover, approvalStatus]);

  // 既存のフローがある場合、承認者を設定（再上程フォームが表示されている場合は設定しない）
  useEffect(() => {
    // 再上程フォームが表示されている場合は何もしない（ユーザーが手動で選択できるように）
    if (showResubmissionForm) {
      return;
    }

    if (!existingFlow || users.length === 0) {
      return;
    }

    // 再上程がある場合は、再上程の承認者を設定
    if (resubmissionFlow.length > 0 && resubmissionApprovers.length > 0) {
      const approverUsers = resubmissionApprovers
        .map((record) => users.find((u) => u.name === record.userName))
        .filter((u): u is User => u !== undefined);
      // 既に同じ承認者が設定されている場合はスキップ
      setSelectedApprovers((prev) => {
        const currentApproverIds = prev.map(a => a.id).sort().join(',');
        const newApproverIds = approverUsers.map(a => a.id).sort().join(',');
        if (currentApproverIds !== newApproverIds) {
          return approverUsers;
        }
        return prev;
      });
      setComment((prev) => {
        if (resubmissionSubmitter?.comment && prev !== resubmissionSubmitter.comment) {
          return resubmissionSubmitter.comment;
        }
        return prev;
      });
    } else if (approverRecords.length > 0 && !hasRejection) {
      // 再上程がなく、差し戻しもない場合は、既存の承認者を設定
      const approverUsers = approverRecords
        .map((record) => users.find((u) => u.name === record.userName))
        .filter((u): u is User => u !== undefined);
      // 既に同じ承認者が設定されている場合はスキップ
      setSelectedApprovers((prev) => {
        const currentApproverIds = prev.map(a => a.id).sort().join(',');
        const newApproverIds = approverUsers.map(a => a.id).sort().join(',');
        if (currentApproverIds !== newApproverIds) {
          return approverUsers;
        }
        return prev;
      });
      setComment((prev) => {
        if (submitterRecord?.comment && prev !== submitterRecord.comment) {
          return submitterRecord.comment;
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingFlow, users.length, approverRecordsKey, submitterRecord?.comment, showResubmissionForm, resubmissionFlow.length, resubmissionApprovers.length]);

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

  // ユーザー一覧を取得
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

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

  // 承認者を追加
  const handleAddApprover = (index: number, userId: number) => {
    const selectedUser = users.find((u) => u.id === userId);
    if (!selectedUser) return;

    // 既に選択されているユーザーや上程者は選択不可
    if (
      selectedUser.name === currentUser?.name ||
      selectedApprovers.some((a) => a.id === userId)
    ) {
      return;
    }

    setSelectedApprovers((prev) => {
      const newApprovers = [...prev];
      if (index < newApprovers.length) {
        // 既存の位置を更新
        newApprovers[index] = selectedUser;
      } else {
        // 新しい承認者を追加
        newApprovers.push(selectedUser);
      }
      return newApprovers;
    });
  };

  // 承認者を削除
  const handleRemoveApprover = (index: number) => {
    setSelectedApprovers((prev) => prev.filter((_, i) => i !== index));
  };

  // 次の承認者を選択できるユーザーリスト（既に選択されたユーザーと上程者を除外）
  const getAvailableUsers = (currentIndex: number) => {
    return users.filter(
      (user) =>
        user.name !== currentUser?.name &&
        !selectedApprovers.some((a, idx) => idx !== currentIndex && a.id === user.id)
    );
  };

  /**
   * 上程・再上程の送信処理
   * 
   * 処理フロー：
   * 1. バリデーション（ログインチェック、承認者選択、コメント入力）
   * 2. 報告書Noの決定
   *    - 既存のフローがある場合：既存のreportNoを使用（再上程の場合も同じreportNo）
   *    - 新規上程の場合：新しいreportNoを生成
   * 3. 再上程フォームが表示されている場合は再上程、それ以外は新規上程
   * 4. フォームをリセットし、状態を更新
   */
  const handleSubmit = async () => {
    if (!currentUser) {
      alert('ログインが必要です。');
      return;
    }
    if (selectedApprovers.length === 0) {
      alert('承認者を1人以上選択してください。');
      return;
    }
    if (!comment.trim()) {
      alert('コメントを入力してください。');
      return;
    }

    try {
      // 報告書Noを決定
      // 既存のフローがある場合は、既存のreportNoを使用（すべてのレコードは同じreportNoを持つ）
      // 再上程の場合は、必ず既存のreportNoを使用する必要がある
      let newReportNo: string;
      if (existingFlow && approvalStatus.length > 0) {
        // 既存のレコードからreportNoを取得（どのレコードでも同じ値）
        newReportNo = approvalStatus[0].reportNo;
      } else {
        // 新規上程の場合は新しいreportNoを生成
        newReportNo = `RPT-${year}-${String(month).padStart(2, '0')}-${Date.now()}`;
      }

      const request: ApprovalRequest = {
        reportNo: newReportNo,
        year,
        month,
        comment: comment.trim(),
        approverNames: selectedApprovers.map((a) => a.name),
        submitterName: currentUser.name,
      };

      // 再上程の判定：再上程フォームが表示されている場合は再上程
      if (showResubmissionForm) {
        // 再上程
        await resubmit(request);
        alert('再上程が完了しました。');
      } else {
        // 新規上程
        await submitApproval(request);
        alert('上程が完了しました。');
      }

      // フォームをリセット
      setComment('');
      setSelectedApprovers([]);
      await refresh();
      // 再上程の場合はDrawerを閉じない（フローを確認できるように）
      if (!canResubmit() || resubmissionFlow.length > 0) {
        onClose();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '上程に失敗しました。');
    }
  };

  /**
   * 現在の承認待ちレコードを取得
   * 
   * 履歴と再上程の両方をチェックし、再上程の承認待ちを優先して取得
   * 承認待ち（Status=1）または承認スキップ（Status=6）のレコードを対象とする
   */
  const getCurrentPendingApproval = (): ApprovalStatus | undefined => {
    if (!currentUser || !existingFlow) return undefined;
    // 再上程の承認待ちまたは承認スキップを優先
    const resubmissionPending = resubmissionApprovers.find(
      (a) => (a.status === 1 || a.status === 6) && a.userName === currentUser.name
    );
    if (resubmissionPending) return resubmissionPending;
    // 履歴の承認待ちまたは承認スキップ
    return approvalStatus.find(
      (a) => (a.status === 1 || a.status === 6) && a.userName === currentUser.name
    );
  };

  // 承認処理
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
    } catch (error) {
      alert(error instanceof Error ? error.message : '承認に失敗しました。');
    }
  };

  // 差し戻し処理
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
    } catch (error) {
      alert(error instanceof Error ? error.message : '差し戻しに失敗しました。');
    }
  };

  // 状態ラベルを取得
  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return '上程済み';
      case 1:
        return '承認待ち';
      case 2:
        return '承認済み';
      case 3:
        return '差し戻し';
      case 4:
        return '取り戻し';
      case 5:
        return '完了';
      case 6:
        return '承認スキップ';
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

  if (!isOpen) return null;

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-96 bg-white shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
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

          {/* 上程ボタン（ヘッダー下、新規上程時のみ表示） */}
          {!existingFlow && (
            <div className="border-b p-4">
              <button
                onClick={handleSubmit}
                disabled={loading || approvalLoading}
                className="w-full rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-400"
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
                        {/* フロー全体を表示（差し戻しごとに再上程を表示） */}
                        {allFlowRecords.map((record, index) => {
                          const isSubmitter = record.flowOrder === 0;
                          const isRejected = record.status === 3;

                          // 再上程者かどうかを判定（差し戻しの次のFlowOrderでStatus=0のもの）
                          const isResubmissionSubmitter = rejectedApprover !== undefined &&
                            record.flowOrder === rejectedApprover.flowOrder + 1 &&
                            record.status === 0;

                          // 下矢印を表示するかどうか
                          // 差し戻しの場合は常に表示、それ以外は次のレコードがある場合のみ表示
                          const showArrow = isRejected || index < allFlowRecords.length - 1;

                          return (
                            <ApprovalFlowCard
                              key={`flow-${record.id}-${index}`}
                              record={record}
                              currentUser={currentUser}
                              isSubmitter={isSubmitter}
                              isResubmissionSubmitter={isResubmissionSubmitter}
                              rejectedApprover={rejectedApprover}
                              resubmissionFlow={resubmissionFlow}
                              approvalStatus={approvalStatus}
                              showArrow={showArrow}
                              getStatusLabel={getStatusLabel}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* 最新の差し戻しがある場合、その下に新規上程フォームを表示 */}
                    {showResubmissionForm && rejectedApprover && (
                      <>
                        {/* 新規上程フォーム */}
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
                                    <div className="rounded-lg border-2 border-blue-500 bg-blue-50 px-3 py-1.5">
                                      <div className="text-xs font-medium text-blue-700">
                                        上程者
                                      </div>
                                      <div className="text-xs text-gray-800">
                                        {currentUser.name}
                                      </div>
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
                                    <div className="flex items-center gap-2">
                                      <div className="rounded-lg border-2 border-green-500 bg-green-50 px-3 py-1.5">
                                        <div className="text-xs font-medium text-green-700">
                                          承認者 {index + 1}
                                        </div>
                                        <div className="text-xs text-gray-800">
                                          {approver.name}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveApprover(index)}
                                        className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                                      >
                                        削除
                                      </button>
                                    </div>
                                    {index < selectedApprovers.length - 1 && (
                                      <div className="my-1 text-xl text-gray-400">↓</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 承認者選択 */}
                          <div className="mb-4">
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                              承認者 {selectedApprovers.length + 1} を選択
                            </label>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddApprover(
                                    selectedApprovers.length,
                                    Number(e.target.value)
                                  );
                                  e.target.value = '';
                                }
                              }}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">選択してください</option>
                              {getAvailableUsers(selectedApprovers.length).map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 再上程ボタン */}
                          <button
                            onClick={handleSubmit}
                            disabled={loading || approvalLoading || selectedApprovers.length === 0 || !comment.trim()}
                            className="w-full rounded bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 disabled:bg-gray-400"
                          >
                            再上程
                          </button>
                        </div>
                      </>
                    )}

                    {/* 承認対象ユーザーの場合、承認・差し戻しフォーム */}
                    {/* 再上程の承認者も対象に含める（承認待ちまたは承認スキップ） */}
                    {(isApprovalTarget() ||
                      resubmissionApprovers.some((a) => (a.status === 1 || a.status === 6) && a.userName === currentUser?.name)) && (
                        <div className="mb-6 rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4">
                          <div className="mb-2 text-sm font-bold text-yellow-800">
                            あなたの承認待ちです
                          </div>
                          <div className="mb-3">
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                              コメント（承認・差し戻し理由）
                            </label>
                            <textarea
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              rows={3}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="コメントを入力してください"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleApprove}
                              className="flex-1 rounded bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                            >
                              承認
                            </button>
                            <button
                              onClick={handleReject}
                              className="flex-1 rounded bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
                            >
                              差し戻し
                            </button>
                          </div>
                        </div>
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
                  // 新規上程フォームまたは再上程フォーム
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
                              <div className="rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2">
                                <div className="text-sm font-medium text-blue-700">
                                  上程者
                                </div>
                                <div className="text-sm text-gray-800">
                                  {currentUser.name}
                                </div>
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
                              <div className="flex items-center gap-2">
                                <div className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-2">
                                  <div className="text-sm font-medium text-green-700">
                                    承認者 {index + 1}
                                  </div>
                                  <div className="text-sm text-gray-800">
                                    {approver.name}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveApprover(index)}
                                  className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                                >
                                  削除
                                </button>
                              </div>
                              {index < selectedApprovers.length - 1 && (
                                <div className="my-1 text-2xl text-gray-400">↓</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 承認者選択 */}
                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        承認者 {selectedApprovers.length + 1} を選択
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddApprover(
                              selectedApprovers.length,
                              Number(e.target.value)
                            );
                            e.target.value = '';
                          }
                        }}
                        className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">選択してください</option>
                        {getAvailableUsers(selectedApprovers.length).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
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

