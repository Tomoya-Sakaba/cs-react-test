import { type ApprovalStatus } from '../hooks/useApproval';
import { type CurrentUser } from '../atoms/authAtom';

type ApprovalFlowCardProps = {
  record: ApprovalStatus;
  currentUser: CurrentUser | null;
  isSubmitter: boolean;
  isResubmissionSubmitter: boolean;
  rejectedApprover: ApprovalStatus | undefined;
  resubmissionFlow: ApprovalStatus[];
  approvalStatus: ApprovalStatus[]; // 承認待ちの判定に使用
  showArrow: boolean;
  getStatusLabel: (status: number) => string;
};

const ApprovalFlowCard = ({
  record,
  currentUser,
  isSubmitter,
  isResubmissionSubmitter,
  rejectedApprover,
  resubmissionFlow,
  approvalStatus,
  showArrow,
  getStatusLabel,
}: ApprovalFlowCardProps) => {
  // 自分の番かどうかを判定
  const isCurrentUser = record.userName === currentUser?.name;
  const isRejected = record.status === 3;
  const isPending = record.status === 1 || record.status === 6; // 承認待ちまたは承認スキップ
  const isCompleted = record.status === 5;

  /**
   * カードの色付けロジック
   * 
   * 基本方針：
   * - 基本はすべて灰色で表示
   * - 現在のフェーズでアクティブな部分のみ色付け
   * 
   * 色付けの優先順位：
   * 1. 完了状態の場合：完了のカードのみ緑色、それ以外はすべて灰色
   * 2. 最新の差し戻し：赤色（自分の番でなくても表示）
   * 3. 再上程フェーズの場合：
   *    - 再上程の上程者：青色
   *    - 再上程の承認者（自分の番・承認待ち/承認スキップ）：黄色
   *    - それ以外（一回目の上程など）：灰色
   * 4. 通常フェーズの場合：
   *    - 自分の番（承認待ち/承認スキップ）：黄色
   *    - 自分の番（承認済み）：緑色
   *    - 自分の番（上程済み）で承認待ちがある場合：青色
   *    - 上程者（自分の番でない）で承認待ちがある場合：青色
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

    // 最新の差し戻しの場合のみ色付け（自分の番でなくても）
    if (rejectedApprover && isRejected && record.flowOrder === rejectedApprover.flowOrder) {
      baseColor = 'border-red-500 bg-red-50 text-red-700';
      return baseColor;
    }

    // 再上程のフェーズかどうかを判定（差し戻し以降に再上程がある場合）
    const isResubmissionPhase = rejectedApprover && resubmissionFlow.length > 0;

    if (isResubmissionPhase) {
      // 再上程のフェーズの場合
      // 再上程の上程者と承認者（承認待ち/承認スキップ）のみ色付け
      if (isResubmissionSubmitter) {
        // 再上程の上程者：青色
        baseColor = 'border-blue-500 bg-blue-50 text-blue-700';
      } else if (isCurrentUser && isPending && record.flowOrder > (rejectedApprover?.flowOrder || 0)) {
        // 再上程の承認者で自分の番の場合：黄色
        baseColor = 'border-yellow-500 bg-yellow-50 text-yellow-700 ring-2 ring-yellow-400';
      }
      // それ以外（一回目の上程など）は灰色のまま
    } else {
      // 通常のフェーズの場合
      // 自分の番の場合のみ色付け
      if (isCurrentUser) {
        if (isPending) {
          // 承認待ちまたは承認スキップの場合：黄色
          baseColor = 'border-yellow-500 bg-yellow-50 text-yellow-700 ring-2 ring-yellow-400';
        } else if (record.status === 2) {
          // 承認済みの場合：緑色
          baseColor = 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-400';
        } else if (record.status === 0) {
          // 上程済みの場合：青色（承認待ちがある場合のみ）
          const hasPendingApproval = approvalStatus.some((a) => (a.status === 1 || a.status === 6) && a.flowOrder > 0);
          if (hasPendingApproval) {
            baseColor = 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-400';
          }
        }
      } else if (isSubmitter) {
        // 上程者で自分の番でない場合、承認待ちがある場合のみ色付け
        const hasPendingApproval = approvalStatus.some((a) => (a.status === 1 || a.status === 6) && a.flowOrder > 0);
        if (hasPendingApproval && !isRejected) {
          baseColor = 'border-blue-500 bg-blue-50 text-blue-700';
        }
      }
    }

    return baseColor;
  };

  const cardColor = getCardColor();

  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-lg border-2 px-4 py-2 ${cardColor}`}>
        <div className="text-sm font-medium">
          {isSubmitter ? '上程者' : isResubmissionSubmitter ? '上程者（再上程）' : `承認者 ${record.flowOrder}`} -{' '}
          {getStatusLabel(record.status)}
        </div>
        <div className="text-sm font-semibold">
          {record.userName}
        </div>
        {record.comment && (
          <div className="mt-1 text-xs text-gray-600">
            {isRejected ? (
              <div>
                <div className="font-semibold text-red-700">
                  差し戻し理由:
                </div>
                <div className="mt-1 whitespace-pre-wrap text-red-800">
                  {record.comment}
                </div>
              </div>
            ) : (
              <div>コメント: {record.comment}</div>
            )}
          </div>
        )}
        {record.actionDate && (
          <div className="mt-1 text-xs text-gray-500">
            {new Date(record.actionDate).toLocaleString('ja-JP')}
          </div>
        )}
      </div>
      {/* 下矢印を表示 */}
      {showArrow && (
        <div className="my-1 text-2xl text-gray-400">↓</div>
      )}
    </div>
  );
};

export default ApprovalFlowCard;

