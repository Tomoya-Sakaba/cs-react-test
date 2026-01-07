import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates } from '../api/reportApi';
import { format, isValid, parseISO } from 'date-fns';
import type { TemplateListItem } from '../types/report';

const TemplateList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  //********************************************************************
  // 初回レンダリング
  //********************************************************************
  useEffect(() => {
    fetchTemplates();
  }, []);

  /**
   * テンプレート一覧を取得
   */
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await getTemplates();
      setTemplates(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // 安全な日付フォーマット関数
  const formatDate = (dateString: string | Date) => {
    try {
      if (!dateString) return '-';
      
      // 文字列の場合はparseISOを使用
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      
      // 有効な日付かチェック
      if (!isValid(date)) return '-';
      
      return format(date, 'yyyy/MM/dd');
    } catch (error) {
      console.error('日付フォーマットエラー:', error, dateString);
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">
          エラーが発生しました: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">テンプレート管理</h1>
        <button
          onClick={() => navigate('/report-system/templates/upload')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors"
        >
          ＋ 新規テンプレート
        </button>
      </div>

      {templates && templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            テンプレートが登録されていません
          </p>
          <button
            onClick={() => navigate('/report-system/templates/upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            最初のテンプレートを登録
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates?.map((template) => (
            <div
              key={template.templateId}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/report-system/templates/${template.templateId}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {template.templateName}
                  </h2>
                  {template.isActive ? (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      有効
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      無効
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  コード: {template.templateCode}
                </p>

                {template.description && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {template.fieldCount} フィールド
                  </div>
                  <div>
                    {formatDate(template.createdAt)}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/report-system/reports/create?template=${template.templateId}`);
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    このテンプレートで報告書作成
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;

