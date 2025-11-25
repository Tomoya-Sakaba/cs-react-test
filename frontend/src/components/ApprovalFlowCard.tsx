import type { ApprovalStatus } from '../types/approval';

type ApprovalFlowCardProps = {
  record: ApprovalStatus;
  showArrow: boolean;
  getStatusLabel: (status: number) => string;
  // 承認・差し戻しフォーム用のprops（現在の承認待ちレコードの場合のみ使用）
  isCurrentPendingRecord?: boolean; // ログインユーザーが次にアクションが必要な場合（フォーム表示用）
  isNextPendingRecord?: boolean; // 次にアクションが必要なレコードかどうか（色付け用）
  approvalComment?: string; // 承認・差し戻し用のコメント
  onApprovalCommentChange?: (comment: string) => void; // コメント変更ハンドラ
  onApprove?: () => void; // 承認ハンドラ
  onReject?: () => void; // 差し戻しハンドラ
  onRecall?: () => void; // 取り戻しハンドラ
  canRecall?: boolean; // 取り戻し可能かどうか
  userEmail?: string; // ユーザーのメールアドレス
  // プレビュー用のprops
  previewMode?: boolean; // プレビューモードかどうか
  previewUserName?: string; // プレビュー時のユーザー名（再上程者の場合）
  previewStatusLabel?: string; // プレビュー時のステータスラベル（再上程者の場合）
  previewColor?: 'orange' | 'gray'; // プレビュー時の色（アクティブ、その他）
};

const ApprovalFlowCard = ({
  record,
  showArrow,
  getStatusLabel,
  isCurrentPendingRecord = false,
  isNextPendingRecord = false,
  approvalComment = '',
  onApprovalCommentChange,
  onApprove,
  onReject,
  onRecall,
  canRecall = false,
  userEmail,
  previewMode = false,
  previewUserName,
  previewStatusLabel,
  previewColor,
}: ApprovalFlowCardProps) => {
  const isPending = record.status === 1; // 承認待ち

  /**
   * カードの色付けロジック
   * オレンジ基調のUI：
   * - 次にアクションが必要なレコード（承認待ち）の場合のみオレンジ
   * - 差し戻し対象（Status=6）の場合もオレンジ
   * - それ以外はすべてグレー
   * - プレビューモードの場合も同様
   */
  const getCardColor = () => {
    // プレビューモードの場合
    if (previewMode && previewColor) {
      if (previewColor === 'orange') {
        return 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400';
      }
      return 'border-gray-300 bg-gray-50 text-gray-700';
    }

    // 通常モード：次にアクションが必要なレコード（承認待ち）の場合のみオレンジ
    if (isNextPendingRecord && isPending) {
      return 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400';
    }

    // 差し戻し対象（Status=6）の場合もオレンジ
    if (record.status === 6) {
      return 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400';
    }

    // それ以外はすべてグレー
    return 'border-gray-300 bg-gray-50 text-gray-700';
  };

  const cardColor = getCardColor();

  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-lg border-2 px-4 py-3 ${cardColor} w-full relative`}>
        {/* ユーザー名と状態を同じ行に配置 */}
        <div className="flex items-center justify-between">
          {/* ユーザー名 */}
          <div className="text-lg font-semibold">
            {previewMode && previewUserName ? previewUserName : record.userName}
          </div>
          {/* 状態を右上に表示 */}
          <div className="text-lg font-semibold">
            {previewMode && previewStatusLabel ? previewStatusLabel : getStatusLabel(record.status)}
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

        {/* プレビューモードの場合はフォームを表示しない */}
        {/* 現在の承認待ちレコードの場合、カード内に承認・差し戻しフォームを表示 */}
        {!previewMode && isCurrentPendingRecord && isPending && (
          <div className="mt-4 border-t border-orange-400 pt-3">
            <div className="mb-2 text-xs font-bold text-orange-800">
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
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="コメントを入力してください"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onApprove}
                className="flex-1 rounded bg-orange-500 px-3 py-2 text-xs font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                承認
              </button>
              <button
                onClick={onReject}
                className="flex-1 rounded bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                差し戻し
              </button>
            </div>
          </div>
        )}

        {/* プレビューモードの場合は取り戻しボタンを表示しない */}
        {/* 取り戻し可能なレコードの場合、取り戻しボタンを表示 */}
        {!previewMode && canRecall && onRecall && (
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
        <div className="my-1 text-2xl text-orange-300">↓</div>
      )}
    </div>
  );
};

export default ApprovalFlowCard;

