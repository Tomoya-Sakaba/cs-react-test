import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTemplate } from '../api/reportApi';
import { format, isValid, parseISO } from 'date-fns';
import type { Template } from '../types/report';

const TemplateDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        const data = await getTemplate(Number(id));
        setTemplate(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  const formatDate = (dateString: string | Date) => {
    try {
      if (!dateString) return '-';
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      if (!isValid(date)) return '-';
      return format(date, 'yyyy/MM/dd HH:mm');
    } catch (error) {
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

  if (error || !template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            テンプレートの取得に失敗しました: {(error as Error)?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/report-system/templates')}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          テンプレート一覧に戻る
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{template.templateName}</h1>
            <p className="text-sm text-gray-500 mt-2">
              コード: {template.templateCode}
            </p>
          </div>
          {template.isActive ? (
            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded">
              有効
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded">
              無効
            </span>
          )}
        </div>

        {template.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">説明</h2>
            <p className="text-gray-600">{template.description}</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">フィールド定義</h2>
          <div className="space-y-3">
            {template.fields && template.fields.length > 0 ? (
              template.fields.map((field) => (
                <div
                  key={field.fieldId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {field.fieldLabel}
                        {field.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        フィールド名: {field.fieldName}
                      </p>
                      {field.cellAddress && (
                        <p className="text-sm text-gray-500">
                          セル位置: {field.cellAddress}
                        </p>
                      )}
                      {field.options && (
                        <p className="text-sm text-gray-500">
                          選択肢: {field.options}
                        </p>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      {field.fieldType}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">フィールドが定義されていません</p>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">ファイル名:</span> {template.fileName}
            </div>
            <div>
              <span className="font-medium">作成者:</span> {template.createdUser}
            </div>
            <div>
              <span className="font-medium">作成日時:</span>{' '}
              {formatDate(template.createdAt)}
            </div>
            <div>
              <span className="font-medium">フィールド数:</span>{' '}
              {template.fields?.length || 0} 個
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() =>
              navigate(`/report-system/reports/create?template=${template.templateId}`)
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            このテンプレートで報告書作成
          </button>
          <button
            onClick={() => navigate('/report-system/templates')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetail;

