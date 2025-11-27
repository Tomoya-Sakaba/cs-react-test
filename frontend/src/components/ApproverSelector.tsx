/* ----------------------------------------------------------------
 * ApproverSelector.tsx
 * 承認者選択コンポーネント（固定数対応）
 * モダンなカード型UIで承認者を選択
 * ---------------------------------------------------------------- */

import type { User } from './ApprovalDrawer';

type ApproverSelectorProps = {
  label?: string;
  selectedApprover: User | undefined;
  availableUsers: User[];
  searchKeyword: string;
  isOpen: boolean;
  onSelect: (userId: number | null) => void;
  onSearchChange: (keyword: string) => void;
  onOpenChange: (isOpen: boolean) => void;
};

const ApproverSelector = ({
  label,
  selectedApprover,
  availableUsers,
  searchKeyword,
  isOpen,
  onSelect,
  onSearchChange,
  onOpenChange,
}: ApproverSelectorProps) => {
  return (
    <div className="relative">
      {/* ラベル */}
      {label && (
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      {/* 選択済みユーザーカード */}
      {selectedApprover ? (
        <div className="group relative">
          <div className="flex items-center gap-3 rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 transition-all hover:border-orange-400 hover:shadow-md">
            {/* ユーザー情報 */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">
                {selectedApprover.name}
              </div>
              {selectedApprover.email && (
                <div className="text-xs text-gray-600">
                  {selectedApprover.email}
                </div>
              )}
            </div>
            {/* 削除ボタン */}
            <button
              onClick={() => {
                onSelect(null);
                onSearchChange('');
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
              title="選択を解除"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* 未選択時の検索・選択UI */
        <div className="relative">
          {/* 検索バー */}
          <div className="relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => onOpenChange(true)}
              placeholder="承認者を検索..."
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {/* ユーザーリスト（検索結果） */}
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => onOpenChange(false)}
              />
              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border-2 border-gray-200 bg-white shadow-lg">
                {availableUsers.length > 0 ? (
                  availableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSelect(user.id);
                        onSearchChange('');
                        onOpenChange(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-orange-50 focus:bg-orange-50 focus:outline-none"
                    >
                      {/* ユーザー情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {user.name}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-600">
                            {user.email}
                          </div>
                        )}
                      </div>
                      {/* 選択アイコン */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 transition-all group-hover:border-orange-400 group-hover:text-orange-500">
                        +
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    該当する承認者が見つかりません
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ApproverSelector;

