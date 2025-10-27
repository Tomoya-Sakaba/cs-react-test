/* ----------------------------------------------------------------
 * UserAttendanceItem.tsx
 * ユーザーの勤怠状況を表示するコンポーネント
 * ユーザー名、クライアント名、出勤日数、実働時間、残業時間、
 * PDFプレビューとダウンロードボタンを表示する
 * ---------------------------------------------------------------- */

import { Link, useSearchParams } from "react-router-dom";

type UserAttendanceItemProps = {
  userId: string;
  userName: string;
  onPreviewPdf: (userId: string) => void;
  onDownloadPdf: (userId: string) => void;
};

const UserAttendanceItem = ({
  userId,
  userName,
  onPreviewPdf,
  onDownloadPdf,
}: UserAttendanceItemProps) => {
  const [searchParams] = useSearchParams();

  // 現在のクエリパラメータを保持したままLinkを生成
  const linkTo = {
    pathname: `/attendance/record/${userId}`,
    search: searchParams.toString(),
  };

  return (
    <>
      <Link to={linkTo} className="block">
        <li className="bg-gray-100 hover:bg-gray-200 p-2 rounded-md border border-gray-300">
          <div className="flex justify-between items-center">
            <div className="flex gap-9 items-center">
              <span className="text-lg font-medium">{userName}</span>
              <span className="text-sm text-gray-500">クライアント名</span>
              <span className="text-sm text-gray-500">出勤：〇〇日</span>
              <span className="text-sm text-gray-500">実働：〇〇時間</span>
              <span className="text-sm text-gray-500">残業：〇〇時間</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onPreviewPdf(userId);
                }}
                className="relative group hover:bg-gray-300 px-2 py-2 rounded-full flex items-center justify-center"
              >
                <span className="i-material-symbols-preview text-xl text-gray-600" />
                <span className="opacity-0 w-20 invisible rounded text-[12px] font-bold text-white py-1 bg-slate-600 -top-7 group-hover:visible group-hover:opacity-100 absolute transition-opacity duration-300 delay-500">
                  プレビュー
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDownloadPdf(userId);
                }}
                className="relative group hover:bg-gray-300 px-2 py-2 rounded-full flex items-center justify-center"
              >
                <span className="i-material-symbols-download text-xl text-gray-600" />
                <span className="opacity-0 w-24 invisible rounded text-[12px] font-bold text-white py-1 bg-slate-600 -top-7 group-hover:visible group-hover:opacity-100 absolute transition-opacity duration-300 delay-500">
                  ダウンロード
                </span>
              </button>
            </div>
          </div>
        </li>
      </Link>
    </>
  );
};

export default UserAttendanceItem;
