import { type ApprovalStatus } from '../hooks/useApproval';

type ApprovalFlowCardProps = {
  record: ApprovalStatus;
  rejectedApprover: ApprovalStatus | undefined;
  resubmissionFlow: ApprovalStatus[];
  approvalStatus: ApprovalStatus[]; // 承認待ちの判定に使用
  showArrow: boolean;
  getStatusLabel: (status: number) => string;
  // 承認・差し戻しフォーム用のprops（現在の承認待ちレコードの場合のみ使用）
  isCurrentPendingRecord?: boolean; // 現在の承認待ちレコードかどうか
  approvalComment?: string; // 承認・差し戻し用のコメント
  onApprovalCommentChange?: (comment: string) => void; // コメント変更ハンドラ
  onApprove?: () => void; // 承認ハンドラ
  onReject?: () => void; // 差し戻しハンドラ
  onRecall?: () => void; // 取り戻しハンドラ
  canRecall?: boolean; // 取り戻し可能かどうか
  userEmail?: string; // ユーザーのメールアドレス
};

const ApprovalFlowCard = ({
  record,
  rejectedApprover,
  resubmissionFlow,
  approvalStatus,
  showArrow,
  getStatusLabel,
  isCurrentPendingRecord = false,
  approvalComment = '',
  onApprovalCommentChange,
  onApprove,
  onReject,
  onRecall,
  canRecall = false,
  userEmail,
}: ApprovalFlowCardProps) => {
  const isRejected = record.status === 3;
  const isRejectionTarget = record.status === 7; // 差し戻し対象
  const isPending = record.status === 1 || record.status === 6; // 承認待ちまたは承認スキップ
  const isCompleted = record.status === 5;

  /**
   * カードの色付けロジック
   * 
   * 基本方針：
   * - 現在のアクティブフェーズ（再上程がある場合は再上程フェーズ、ない場合は最初の上程フェーズ）のみ色付け
   * - アクティブフェーズ外はすべて灰色
   * - 差し戻しと差し戻し対象は特別扱い（常に色付け）
   * 
   * 色付けの優先順位：
   * 1. 完了状態の場合：完了のカードのみ緑色、それ以外はすべて灰色
   * 2. 最新の差し戻し：赤色（常に表示）
   * 3. 差し戻し対象：オレンジ色（常に表示）
   * 4. アクティブフェーズ内のレコード：
   *    - 承認待ち（Status=1または6）：黄色
   *    - 承認済み（Status=2）：緑色
   *    - 上程済み（Status=0）で承認待ちがある場合：青色
   * 5. アクティブフェーズ外：すべて灰色
   */
  const getCardColor = () => {
    // 基本は灰色
    let baseColor = 'border-gray-300 bg-gray-50 text-gray-700';

    // 完了状態かどうかを判定
    const isCompletedPhase = approvalStatus.some((a) => a.status === 5);

    if (isCompletedPhase) {
      // 完了状態の場合、完了のカードのみ色付け、それ以外はすべて灰色
      if (isCompleted) {
        baseColor = 'border-green-600 bg-green-100 text-green-800 ring-2 ring-green-400';
      }
      return baseColor;
    }

    // 最新の差し戻しの場合のみ色付け（常に表示）
    if (rejectedApprover && isRejected && record.flowOrder === rejectedApprover.flowOrder) {
      baseColor = 'border-red-500 bg-red-50 text-red-700';
      return baseColor;
    }

    // 差し戻し対象者の場合：オレンジ色で表示（常に表示）
    if (isRejectionTarget) {
      baseColor = 'border-orange-500 bg-orange-50 text-orange-700';
      return baseColor;
    }

    // 現在のアクティブフェーズを判定
    // 再上程がある場合：再上程フェーズがアクティブ
    // 再上程がない場合：最初の上程フェーズがアクティブ
    const isResubmissionPhase = rejectedApprover && resubmissionFlow.length > 0;
    const activePhaseStartFlowOrder = isResubmissionPhase && resubmissionFlow.length > 0
      ? resubmissionFlow[0].flowOrder // 再上程フェーズの開始FlowOrder
      : 0; // 最初の上程フェーズの開始FlowOrder

    // このレコードがアクティブフェーズ内かどうかを判定
    const isInActivePhase = record.flowOrder >= activePhaseStartFlowOrder;

    // アクティブフェーズ外はすべて灰色
    if (!isInActivePhase) {
      return baseColor;
    }

    // アクティブフェーズ内のレコードのみ色付け
    if (isPending) {
      // 承認待ちまたは承認スキップ：黄色
      baseColor = 'border-yellow-500 bg-yellow-50 text-yellow-700 ring-2 ring-yellow-400';
    } else if (record.status === 2) {
      // 承認済み：緑色
      baseColor = 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-400';
    } else if (record.status === 0) {
      // 上程済み：青色（承認待ちがある場合のみ）
      const hasPendingApproval = approvalStatus.some((a) =>
        (a.status === 1 || a.status === 6) &&
        a.flowOrder >= activePhaseStartFlowOrder
      );
      if (hasPendingApproval) {
        baseColor = 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-400';
      }
    }

    return baseColor;
  };

  const cardColor = getCardColor();

  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-lg border-2 px-4 py-3 ${cardColor} w-full relative`}>
        {/* ユーザー名と状態を同じ行に配置 */}
        <div className="flex items-center justify-between">
          {/* ユーザー名 */}
          <div className="text-lg font-semibold">
            {record.userName}
          </div>
          {/* 状態を右上に表示 */}
          <div className="text-lg font-semibold">
            {getStatusLabel(record.status)}
          </div>
        </div>

        {/* メールアドレス */}
        {userEmail && (
          <div className="mt-1 text-sm text-gray-600">
            {userEmail}
          </div>
        )}

        {/* コメント（枠内に表示） */}
        {record.comment && (
          <div className="mt-3 rounded border border-gray-300 bg-white p-3">
            <div className="text-sm text-black whitespace-pre-wrap">
              {record.comment}
            </div>
          </div>
        )}

        {/* アクション日時 */}
        {record.actionDate && (
          <div className="mt-2 text-xs text-gray-500">
            {new Date(record.actionDate).toLocaleString('ja-JP')}
          </div>
        )}

        {/* 現在の承認待ちレコードの場合、カード内に承認・差し戻しフォームを表示 */}
        {isCurrentPendingRecord && isPending && (
          <div className="mt-4 border-t border-yellow-400 pt-3">
            <div className="mb-2 text-xs font-bold text-yellow-800">
              あなたの承認待ちです
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                コメント（承認・差し戻し理由）
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => onApprovalCommentChange?.(e.target.value)}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none"
                placeholder="コメントを入力してください"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onApprove}
                className="flex-1 rounded bg-green-500 px-3 py-2 text-xs font-medium text-white hover:bg-green-600"
              >
                承認
              </button>
              <button
                onClick={onReject}
                className="flex-1 rounded bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
              >
                差し戻し
              </button>
            </div>
          </div>
        )}

        {/* 取り戻し可能なレコードの場合、取り戻しボタンを表示 */}
        {canRecall && onRecall && (
          <div className="mt-3">
            <button
              onClick={onRecall}
              className="w-full rounded bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              取り戻し
            </button>
          </div>
        )}
      </div>
      {/* 下矢印を表示（カードの下、フォームの下ではない） */}
      {showArrow && (
        <div className="my-1 text-2xl text-gray-400">↓</div>
      )}
    </div>
  );
};

export default ApprovalFlowCard;

