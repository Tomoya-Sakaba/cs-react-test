type ContentHeaderProps = {
  subtitle: string;
  title: string;
  userName?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  spreadActions?: {
    userId: string;
    onPreviewPdf: (userId: string) => void;
    onDownloadPdf: (userId: string) => void;
  };
};

const ContentHeader = ({
  subtitle,
  title,
  userName,
  filters,
  actions,
  spreadActions,
}: ContentHeaderProps) => {
  return (
    <div className="flex justify-between items-center p-4 flex-shrink-0">
      <div>
        <p className="text-lg font-bold px-3 text-[#023861]/30">{subtitle}</p>
        <h1 className="text-2xl font-bold px-3 text-[#023861]">
          {title}
        </h1>
      </div>
      <div className="flex gap-4 items-center">
        {/* ユーザー名 */}
        {userName && <span className="text-lg font-medium">{userName}</span>}

        {spreadActions && (
          <div className="flex gap-2">
            {/* PDFプレビューボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                spreadActions.onPreviewPdf(spreadActions.userId);
              }}
              className="relative group hover:bg-gray-300 px-2 py-2 rounded-full flex items-center justify-center"
            >
              <span className="i-material-symbols-preview text-xl text-gray-600" />
              <span className="opacity-0 w-20 invisible rounded text-[12px] font-bold text-white py-1 bg-slate-600 top-11 group-hover:visible group-hover:opacity-100 absolute transition-opacity duration-300 delay-500">
                プレビュー
              </span>
            </button>

            {/* PDFダウンロードボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                spreadActions.onDownloadPdf(spreadActions.userId);
              }}
              className="relative group hover:bg-gray-300 px-2 py-2 rounded-full flex items-center justify-center"
            >
              <span className="i-material-symbols-download text-xl text-gray-600" />
              <span className="opacity-0 w-24 invisible rounded text-[12px] font-bold text-white py-1 bg-slate-600 top-11 group-hover:visible group-hover:opacity-100 absolute transition-opacity duration-300 delay-500">
                ダウンロード
              </span>
            </button>
          </div>
        )}
        <div className="flex gap-1 items-center">
          {/* 年月フィルター */}
          {filters && <div className="flex gap-2">{filters}</div>}

          {/* 編集＆保存アクションボタン */}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
};

export default ContentHeader;
