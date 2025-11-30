/* ----------------------------------------------------------------
 * UnlimitedApproverSelector.tsx
 * 承認者検索・選択コンポーネント
 * シンプルな検索機能のみを提供
 * ---------------------------------------------------------------- */

import { useState } from 'react';
import type { User } from './ApprovalDrawer';

type UnlimitedApproverSelectorProps = {
  /** 選択可能なユーザー一覧 */
  availableUsers: User[];
  /** ユーザーが選択された時のコールバック */
  onSelect: (userId: number) => void;
  /** オプションのラベル */
  label?: string;
  /** 検索プレースホルダー */
  placeholder?: string;
};

const UnlimitedApproverSelector = ({
  availableUsers,
  onSelect,
  label,
  placeholder = '承認者を検索...',
}: UnlimitedApproverSelectorProps) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 検索キーワードでフィルタリング（名前とメールアドレスのみ）
  const filteredUsers = searchKeyword
    ? availableUsers.filter((user) => {
      const keyword = searchKeyword.toLowerCase();
      return (
        user.name.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword)
      );
    })
    : availableUsers;

  const handleUserSelect = (userId: number) => {
    onSelect(userId);
    setSearchKeyword('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* ラベル */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      {/* 検索バー */}
      <div className="relative">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {/* ユーザーリスト（検索結果） */}
      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="relative z-20 max-h-64 overflow-y-auto rounded-lg border-2 border-gray-200 bg-white shadow-lg">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-orange-50 focus:bg-orange-50 focus:outline-none"
                >
                  {/* ユーザー情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {user.name}
                    </div>
                    {user.email && (
                      <div className="text-xs text-gray-600">{user.email}</div>
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
  );
};

export default UnlimitedApproverSelector;

