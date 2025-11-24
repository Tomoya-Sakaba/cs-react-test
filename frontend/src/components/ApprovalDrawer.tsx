import { useState, useEffect, useMemo, useRef } from 'react';
import { useAtom } from 'jotai';
import axios from 'axios';
import { currentUserAtom } from '../atoms/authAtom';
import { useApproval, type ApprovalStatus, type ApprovalRequest } from '../hooks/useApproval';
import ApprovalFlowCard from './ApprovalFlowCard';

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
  year: number;
  month: number;
  reportNo: string; // 必須
  onApprovalChange?: () => void; // 上程状態が変更された時に呼ばれるコールバック
};

const ApprovalDrawer = ({ onClose, year, month, reportNo, onApprovalChange }: ApprovalDrawerProps) => {
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
    year,
    month,
    reportNo,
    autoFetch: true,
  });

  const existingFlow = hasExistingFlow(); // useApproval: 既存の上程フローがあるか判定

  // ============================================================================
  // 初期化処理
  // ============================================================================
  useEffect(() => {
    fetchUsers();
  }, []);

  /**
   * ユーザー一覧を取得
   * 
   * 処理内容：
   * - APIから全ユーザー情報を取得
   * - 承認者選択時に使用するユーザー一覧を更新
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
  // 【最初の上程フェーズ】新規上程関連の処理
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
   * 
   * 処理内容：
   * 1. ログインユーザーの存在確認
   * 2. ReportNoの設定
   * 3. 上程リクエストを作成して送信
   * 4. 成功時：フォームをリセット、状態を更新、Drawerを閉じる
   * 5. 失敗時：エラーメッセージを表示
   */
  const handleNewSubmission = async () => {
    if (!currentUser) return;

    try {
      const request: ApprovalRequest = {
        reportNo,
        year,
        month,
        comment: comment.trim() || '',
        approverNames: selectedApprovers.map((a) => a.name),
        submitterName: currentUser.name,
      };

      await submitApproval(request); // useApproval: 新規上程処理
      alert('上程が完了しました。');

      setComment('');
      setSelectedApprovers([]);
      await refresh(); // useApproval: 上程状態を再取得
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
   * 差し戻しした承認者を取得
   * 
   * 判定内容：
   * - Status=3（差し戻し）のレコードを全て取得
   * - 複数ある場合は、FlowOrderが最大のもの（最後に差し戻しした承認者）を返す
   * - 差し戻しがない場合はundefinedを返す
   */
  const rejectedApprover = useMemo(() => {
    const rejectedApprovals = approvalStatus.filter((a) => a.status === 3);
    if (rejectedApprovals.length === 0) return undefined;
    return rejectedApprovals.reduce((latest, current) =>
      current.flowOrder > latest.flowOrder ? current : latest
    );
  }, [approvalStatus]);

  /**
   * 差し戻し処理
   * 
   * 処理内容：
   * 1. 現在の承認待ちレコードを取得
   * 2. 差し戻し理由（コメント）の入力確認
   * 3. 確認ダイアログで実行確認
   * 4. 差し戻しAPIを呼び出し
   * 5. 成功時：コメントをリセット、状態を更新
   * 6. 失敗時：エラーメッセージを表示
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
      await reject(pendingApproval.id, approvalComment.trim()); // useApproval: 差し戻し処理
      alert('差し戻しが完了しました。');
      setApprovalComment('');
      await refresh(); // useApproval: 上程状態を再取得
      onApprovalChange?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : '差し戻しに失敗しました。');
    }
  };

  // ============================================================================
  // 【再上程フェーズ】再上程関連の処理
  // ============================================================================
  /**
   * 再上程フローを取得
   * 
   * 判定内容：
   * 1. Status=7（差し戻し対象）のレコードを検索
   * 2. 差し戻し対象がある場合：
   *    - 差し戻し対象以降の全レコードを取得（FlowOrder >= rejectionTarget.flowOrder）
   * 3. 差し戻し対象がない場合：
   *    - 差し戻し承認者（Status=3）以降の全レコードを取得（FlowOrder > rejectedApprover.flowOrder）
   * 4. FlowOrder順にソートして返す
   */
  const resubmissionFlow = useMemo(() => {
    const rejectionTarget = approvalStatus.find((a) => a.status === 7);
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

  /**
   * 再上程フォームを表示するか判定
   * 
   * useApprovalのcanResubmit()を使用して判定
   */
  const showResubmissionForm = canResubmit(); // useApproval: 再上程可能かどうか判定

  /**
   * 再上程フォームの表示状態に応じてフォームをリセット
   * 
   * 処理内容：
   * - 再上程フォームが表示された時：承認者選択とコメントをリセット
   * - 再上程フォームが非表示になった時：リセットフラグをクリア
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
   * 再上程処理
   * 
   * 処理内容：
   * 1. ログインユーザーの存在確認
   * 2. 既存フローの存在確認
   * 3. ReportNoの設定（既存のReportNoを使用）
   * 4. 再上程リクエストを作成して送信
   * 5. 成功時：フォームをリセット、状態を更新
   * 6. 再上程できない状態または再上程フローがある場合はDrawerを閉じる
   * 7. 失敗時：エラーメッセージを表示
   */
  const handleResubmit = async () => {
    if (!currentUser) return;

    try {
      if (!existingFlow || approvalStatus.length === 0) {
        alert('再上程に失敗しました。既存のフローが見つかりません。');
        return;
      }

      // reportNoは必須
      const existingReportNo = approvalStatus[0].reportNo || reportNo;
      const request: ApprovalRequest = {
        reportNo: existingReportNo,
        year,
        month,
        comment: comment.trim() || '',
        approverNames: selectedApprovers.map((a) => a.name),
        submitterName: currentUser.name,
      };

      await resubmit(request); // useApproval: 再上程処理
      alert('再上程が完了しました。');

      setComment('');
      setSelectedApprovers([]);
      await refresh(); // useApproval: 上程状態を再取得
      onApprovalChange?.();
      if (!canResubmit() || resubmissionFlow.length > 0) { // useApproval: 再上程可能かどうか判定
        onClose();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '再上程に失敗しました。');
    }
  };

  // ============================================================================
  // 共通処理
  // ============================================================================
  /**
   * 全フローレコードをFlowOrder順にソートして取得
   * 
   * 処理内容：
   * - approvalStatusをFlowOrderの昇順でソート
   */
  const allFlowRecords = useMemo(() => {
    return approvalStatus.sort((a, b) => a.flowOrder - b.flowOrder);
  }, [approvalStatus]);

  /**
   * 現在の承認待ちレコードを取得（最小FlowOrderの承認者のみ）
   * 
   * 判定内容：
   * 1. ログインユーザーと既存フローの存在確認
   * 2. 承認待ち（Status=1）の承認者（FlowOrder > 0）の中で最小FlowOrderを取得
   * 3. その最小FlowOrderの承認者がログインユーザーである場合のみ返す
   * 4. 見つからない場合はundefinedを返す
   */
  const getCurrentPendingApproval = (): ApprovalStatus | undefined => {
    if (!currentUser || !existingFlow) return undefined;

    // 承認待ち（Status=1）の承認者（FlowOrder > 0）を取得
    const pendingApprovals = approvalStatus.filter(
      (a) => a.flowOrder > 0 && a.status === 1
    );

    if (pendingApprovals.length === 0) return undefined;

    // 最小FlowOrderを取得
    const minFlowOrder = Math.min(...pendingApprovals.map((a) => a.flowOrder));

    // 最小FlowOrderの承認者で、ログインユーザーであるものを取得
    const minPendingApproval = pendingApprovals.find(
      (a) => a.flowOrder === minFlowOrder && a.userName === currentUser.name
    );

    return minPendingApproval;
  };

  /**
   * 承認処理
   * 
   * 処理内容：
   * 1. 現在の承認待ちレコードを取得
   * 2. 承認対象が見つからない場合はエラーメッセージを表示
   * 3. 承認APIを呼び出し（コメントは任意）
   * 4. 成功時：コメントをリセット、状態を更新
   * 5. 失敗時：エラーメッセージを表示
   */
  const handleApprove = async () => {
    const pendingApproval = getCurrentPendingApproval();
    if (!pendingApproval) {
      alert('承認対象が見つかりません。');
      return;
    }

    try {
      await approve(pendingApproval.id, approvalComment.trim()); // useApproval: 承認処理
      alert('承認が完了しました。');
      setApprovalComment('');
      await refresh(); // useApproval: 上程状態を再取得
      onApprovalChange?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : '承認に失敗しました。');
    }
  };

  // ============================================================================
  // ヘルパー関数
  // ============================================================================
  /**
   * ステータス番号からラベル文字列を取得
   * 
   * 判定内容：
   * - 0: 上程
   * - 1: 承認待ち
   * - 2: 承認済み
   * - 3: 差戻
   * - 4: 取り戻し
   * - 5: 完了
   * - 7: 空文字（差し戻し対象は表示しない）
   * - その他: 不明
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
      case 7:
        return '';
      default:
        return '不明';
    }
  };

  /**
   * Drawerを閉じる処理
   * 
   * 処理内容：
   * - 既存フローがない場合（新規上程時）：コメントと承認者選択をリセット
   * - 承認コメントをリセット
   * - onCloseコールバックを呼び出し
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
  // UI状態の判定
  // ============================================================================
  /**
   * Drawerの表示状態を判定
   * 
   * レンダリング順序の問題を解決するため、以下のロジックを採用：
   * - 読み込み中は常に400px（既存フローの可能性を考慮）
   * - 読み込み完了後、既存フローがある場合は400px
   * - 読み込み完了後、既存フローがない場合は800px（新規上程）
   * - 再上程時は800px
   * 
   * 状態パターン：
   * 1. 【読み込み中】approvalLoading
   *    → 幅: 400px（1列レイアウト、既存フローの可能性を考慮して400pxで固定）
   * 
   * 2. 【既存フローのみ】existingFlow && !showResubmissionForm && !approvalLoading
   *    → 幅: 400px（1列レイアウト、承認フローのみ表示）
   * 
   * 3. 【再上程時】showResubmissionForm && !approvalLoading
   *    → 幅: 800px（2列レイアウト、左: 再上程フォーム、右: プレビュー、各400px）
   * 
   * 4. 【新規上程時】!existingFlow && !approvalLoading
   *    → 幅: 800px（2列レイアウト、左: 新規上程フォーム、右: プレビュー、各400px）
   *    注：読み込み完了後、既存フローがないことが確定した場合
   */
  const getDrawerWidth = () => {
    // 読み込み中は400pxで固定（既存フローの可能性を考慮）
    if (approvalLoading) {
      return 'w-[400px]'; // 読み込み中：1列レイアウト
    }
    // 既存フローのみは400px（再上程時を除く）
    if (existingFlow && !showResubmissionForm) {
      return 'w-[400px]'; // 既存フローのみ：1列レイアウト
    }
    // 再上程時は800px
    if (showResubmissionForm) {
      return 'w-[800px]'; // 再上程時：2列レイアウト（各400px）
    }
    // 新規上程時（既存フローがない場合）は800px
    // 注：読み込み完了後、既存フローがないことが確定した場合
    return 'w-[800px]'; // 新規上程時：2列レイアウト（各400px）
  };

  /**
   * 左側列の表示状態を判定
   * 
   * 判定内容：
   * - 再上程フォーム表示時：existingFlow && showResubmissionForm && rejectedApprover
   * - 新規上程フォーム表示時：!existingFlow
   * 
   * 戻り値：
   * - true: 左側列を表示する（上程/再上程フォームを表示）
   * - false: 左側列を非表示にする（既存フローのみ表示）
   */
  const shouldShowLeftColumn = () => {
    return (existingFlow && showResubmissionForm && rejectedApprover) || !existingFlow;
  };

  /**
   * 右側列の幅を判定
   * 
   * 判定内容：
   * - 新規上程/再上程時：w-[400px]（左側と同じ幅、2列で800pxを二等分）
   * - 既存フローのみ：flex-1（残りの幅を使用、1列で400px全体）
   * 
   * 戻り値：
   * - 'w-[400px]': 固定幅400px（2列レイアウト時）
   * - 'flex-1': 残りの幅を使用（1列レイアウト時）
   */
  const getRightColumnWidth = () => {
    return !existingFlow || showResubmissionForm ? 'w-[400px]' : 'flex-1';
  };

  /**
   * 右側列の表示内容を判定
   * 
   * 判定内容：
   * - 既存フローがあり、再上程フォームが表示されていない場合：既存の承認フローを表示
   * - それ以外（新規上程時 or 再上程時）：プレビューを表示
   * 
   * 戻り値：
   * - true: 既存の承認フローを表示
   * - false: プレビューを表示（新規上程プレビュー or 再上程プレビュー）
   */
  const shouldShowExistingFlow = () => {
    return existingFlow && !(showResubmissionForm && rejectedApprover);
  };

  // ============================================================================
  // 共通UIコンポーネント
  // ============================================================================
  /**
   * 上程フォームコンポーネント（上程者表示 + コメント入力 + 承認者選択を統合）
   */
  const renderApprovalForm = (title: string, commentRows: number = 4) => {
    return (
      <>
        {/* タイトル */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-blue-800 mb-3">{title}</h3>
        </div>

        {/* 上程者表示 */}
        <div className="mb-4">
          <div className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2">
            {currentUser?.name || 'ログインが必要です'}
          </div>
          {currentUser?.email && (
            <div className="mt-2 text-sm text-gray-600">
              {currentUser.email}
            </div>
          )}
        </div>

        {/* コメント入力 */}
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

        {/* 承認者選択 */}
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
   */
  const renderPreviewUserCard = (user: { name: string; email?: string }, color: 'blue' | 'green') => {
    const borderColor = color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50';

    return (
      <div className={`rounded-lg border-2 ${borderColor} px-4 py-3 w-full`}>
        <div className="text-lg font-semibold text-gray-800">{user.name}</div>
        {user.email && (
          <div className="mt-1 text-base text-gray-600">{user.email}</div>
        )}
      </div>
    );
  };

  // ============================================================================
  // UI レンダリング
  // ============================================================================
  const isLoading = loading || approvalLoading;
  const drawerWidth = getDrawerWidth();
  const showLeftColumn = shouldShowLeftColumn();
  const rightColumnWidth = getRightColumnWidth();
  const showExistingFlow = shouldShowExistingFlow();

  // ============================================================================
  // スクロール処理
  // ============================================================================
  /**
   * 承認フローまたはプレビューが表示されたときに、一番下までスクロール
   * 
   * 処理内容：
   * - 承認フローが表示された時（showExistingFlowがtrue）
   * - プレビューが表示された時（showExistingFlowがfalseで、コンテンツがある）
   * - レンダリング完了後に少し遅延を入れてスクロール（DOM更新を待つ）
   */
  useEffect(() => {
    if (isLoading) return; // 読み込み中はスクロールしない

    const scrollToBottom = () => {
      if (rightColumnScrollRef.current) {
        const scrollContainer = rightColumnScrollRef.current;
        // 一番下までスムーズにスクロール
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth',
        });
      }
    };

    // レンダリング完了を待つために少し遅延を入れる
    const timer = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timer);
  }, [isLoading, showExistingFlow, allFlowRecords.length, selectedApprovers.length, approvalStatus.length]);

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
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-bold">上程</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* コンテンツエリア */}
          <div className="flex flex-1 overflow-hidden">
            {/* ====================================================================
              左側列：上程/再上程フォーム
              ====================================================================
              表示条件：
              - 【再上程フォーム】existingFlow && showResubmissionForm && rejectedApprover
              - 【新規上程フォーム】!existingFlow
            */}
            {showLeftColumn && (
              <div className="w-[400px] border-r overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-gray-500">読み込み中...</p>
                  </div>
                ) : (
                  <>
                    {/* 上程フォーム（上程者 + コメント + 承認者選択） */}
                    {renderApprovalForm(
                      existingFlow ? '再上程' : '新規上程'
                    )}

                    {/* 送信ボタン */}
                    <button
                      onClick={existingFlow ? handleResubmit : handleNewSubmission}
                      disabled={isLoading || !currentUser || selectedApprovers.length === 0}
                      className="w-full rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {existingFlow ? '再上程' : '上程'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ====================================================================
                右側列：承認フロー表示 or プレビュー
                ====================================================================
                表示内容：
                - 【既存フローのみ】既存の承認フローを表示（ApprovalFlowCard）
                - 【プレビュー】新規上程/再上程時のプレビュー表示
            */}
            <div ref={rightColumnScrollRef} className={`overflow-y-auto p-4 ${rightColumnWidth}`}>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500">読み込み中...</p>
                </div>
              ) : (
                <>
                  {showExistingFlow ? (
                    /* ============================================================
                      状態：既存フローのみ表示
                      ============================================================
                      既存の承認フローをFlowOrder順に表示
                      各レコードに対して承認・差し戻し・取り戻し・再上程のアクションを提供
                    */
                    <>
                      {/* 固定ヘッダー：承認フロー */}
                      <div className="sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-gray-200">
                        <label className="block text-sm font-medium text-gray-700">
                          承認フロー
                        </label>
                      </div>
                      <div className="space-y-3">
                        {allFlowRecords.map((record, index) => {
                          const isRejected = record.status === 3;
                          const showArrow = isRejected || index < allFlowRecords.length - 1;
                          const currentPendingApproval = getCurrentPendingApproval();
                          const isCurrentPendingRecord = currentPendingApproval?.id === record.id;
                          const user = users.find((u) => u.name === record.userName);
                          const recordCanRecall = canRecall(record); // useApproval: 取り戻し可能かどうか判定

                          const handleRecall = async () => {
                            if (!window.confirm('取り戻しを実行しますか？')) return;
                            try {
                              await recall(record.id); // useApproval: 取り戻し処理
                              alert('取り戻しが完了しました。');
                              await refresh(); // useApproval: 上程状態を再取得
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
                              userEmail={user?.email}
                            />
                          );
                        })}
                      </div>

                      {isCompleted() && ( // useApproval: 完了しているか判定
                        <div className="mb-4 rounded-lg border-2 border-green-600 bg-green-100 p-3">
                          <div className="text-sm font-bold text-green-800">
                            上程が完了しました
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ============================================================
                      状態：プレビュー表示
                      ============================================================
                      新規上程時 or 再上程時の承認フロープレビューを表示
                      - 新規上程時：上程者 + 選択した承認者
                      - 再上程時：既存フロー（差し戻しまで） + 再上程者 + 選択した承認者
                    */
                    <>
                      {/* 固定ヘッダー：プレビュー */}
                      <div className="sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-gray-200">
                        <label className="block text-sm font-medium text-gray-700">
                          {existingFlow ? '再上程プレビュー' : '承認フロープレビュー'}
                        </label>
                      </div>

                      {existingFlow && showResubmissionForm ? (
                        /* ======================================================
                          状態：再上程プレビュー
                          ======================================================
                          既存の承認フロー（差し戻し対象まで）を表示し、
                          その後に再上程者（ログインユーザー）と選択した承認者を追加表示
                        */
                        <div className="space-y-3">
                          {/* 既存の上程フロー（差し戻し対象まで） */}
                          {allFlowRecords
                            .filter((record) => {
                              const rejectionTarget = approvalStatus.find((a) => a.status === 7);
                              if (!rejectionTarget) {
                                return rejectedApprover
                                  ? record.flowOrder <= rejectedApprover.flowOrder
                                  : true;
                              }
                              return record.flowOrder <= rejectionTarget.flowOrder;
                            })
                            .map((record, index, filteredRecords) => {
                              const isRejected = record.status === 3;
                              const isRejectionTarget = record.status === 7;
                              // 最後の差し戻しかどうかを判定
                              const isLastRejection = rejectedApprover && record.id === rejectedApprover.id;

                              // 矢印表示の判定
                              const showArrow =
                                isRejected ||
                                index < filteredRecords.length - 1 ||
                                selectedApprovers.length > 0;

                              const user = users.find((u) => u.name === record.userName);
                              const userEmail =
                                isRejectionTarget && currentUser
                                  ? currentUser.email
                                  : user?.email;

                              // プレビュー用のprops
                              const previewUserName =
                                isRejectionTarget && currentUser
                                  ? currentUser.name
                                  : undefined;
                              const previewStatusLabel = isRejectionTarget ? '再上程' : undefined;
                              const previewColor: 'red' | 'blue' | 'gray' = isLastRejection
                                ? 'red'
                                : isRejectionTarget
                                  ? 'blue'
                                  : 'gray';

                              return (
                                <ApprovalFlowCard
                                  key={`existing-${record.id}-${index}`}
                                  record={record}
                                  rejectedApprover={rejectedApprover}
                                  resubmissionFlow={resubmissionFlow}
                                  approvalStatus={approvalStatus}
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

                          {/* 選択した承認者 */}
                          {selectedApprovers.map((approver, index) => (
                            <div
                              key={`preview-${approver.id}-${index}`}
                              className="flex flex-col items-center"
                            >
                              {renderPreviewUserCard(approver, 'green')}
                              {index < selectedApprovers.length - 1 && (
                                <div className="my-1 text-2xl text-gray-400">↓</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* ======================================================
                          状態：新規上程プレビュー
                          ======================================================
                          上程者（ログインユーザー）と選択した承認者を表示
                        */
                        currentUser || selectedApprovers.length > 0 ? (
                          <div className="space-y-3">
                            {/* 上程者 */}
                            {currentUser && (
                              <div className="flex flex-col items-center">
                                {renderPreviewUserCard(currentUser, 'blue')}
                                {selectedApprovers.length > 0 && (
                                  <div className="my-1 text-2xl text-gray-400">↓</div>
                                )}
                              </div>
                            )}

                            {/* 承認者 */}
                            {selectedApprovers.map((approver, index) => (
                              <div
                                key={`preview-${approver.id}-${index}`}
                                className="flex flex-col items-center"
                              >
                                {renderPreviewUserCard(approver, 'green')}
                                {index < selectedApprovers.length - 1 && (
                                  <div className="my-1 text-2xl text-gray-400">↓</div>
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
