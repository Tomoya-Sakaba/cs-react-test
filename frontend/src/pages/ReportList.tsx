import { useNavigate } from 'react-router-dom';

const ReportList = () => {
  const navigate = useNavigate();

  // 古い報告書システムは新しいシステムに移行中です
  // 一時的にこのページを無効化しています

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">
                システム移行中
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p className="mb-3">
                  この報告書システムは新しいシステムに移行中です。
                </p>
                <p className="mb-4">
                  新しいシステムでは、Excelテンプレートを使用したカスタマイズ可能な報告書作成が可能です。
                </p>
                <button
                  onClick={() => navigate('/report-system/templates')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors"
                >
                  📋 新しい報告書システムへ
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportList;

