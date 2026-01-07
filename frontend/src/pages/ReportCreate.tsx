import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getTemplate, createReport } from '../api/reportApi';
import type { Template, TemplateField } from '../types/report';

const ReportCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');

  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // テンプレート取得
  useEffect(() => {
    if (!templateId) {
      setIsLoading(false);
      return;
    }

    const fetchTemplate = async () => {
      try {
        setIsLoading(true);
        const data = await getTemplate(Number(templateId));
        setTemplate(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template) return;

    try {
      setIsSubmitting(true);
      
      const result = await createReport({
        templateId: template.templateId,
        createdUser: 'admin', // TODO: 実際のユーザー情報を使用
        data: formData,
      });

      alert('報告書が作成されました');
      
      // 作成した報告書の詳細画面に遷移
      if (result.reportId) {
        navigate(`/report-system/reports/${result.reportId}`);
      } else {
        navigate('/report-system/reports');
      }
    } catch (error: any) {
      console.error('報告書作成エラー:', error);
      const message =
        error.response?.data?.message || 
        error.response?.data?.Message ||
        error.message || 
        '報告書の作成に失敗しました';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: TemplateField) => {
    const value = formData[field.fieldName] || '';

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <input
            type={field.fieldType}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );

      case 'select':
        const options = field.options?.split(',') || [];
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          >
            <option value="">選択してください</option>
            {options.map((option) => (
              <option key={option.trim()} value={option.trim()}>
                {option.trim()}
              </option>
            ))}
          </select>
        );

      case 'radio':
        const radioOptions = field.options?.split(',') || [];
        return (
          <div className="space-y-2">
            {radioOptions.map((option) => (
              <label key={option.trim()} className="flex items-center">
                <input
                  type="radio"
                  name={field.fieldName}
                  value={option.trim()}
                  checked={value === option.trim()}
                  onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
                  className="mr-2"
                  required={field.isRequired}
                />
                {option.trim()}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.checked)}
              className="mr-2"
            />
            確認
          </label>
        );

      case 'image':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">画像アップロード機能は開発中です</p>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.isRequired}
          />
        );
    }
  };

  if (!templateId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">テンプレートが指定されていません</p>
        </div>
      </div>
    );
  }

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{template.templateName}</h1>
          {template.description && (
            <p className="mt-2 text-gray-600">{template.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {template.fields?.map((field) => (
            <div key={field.fieldId}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.fieldLabel}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}

          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isSubmitting ? '作成中...' : '報告書を作成'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/report-system/templates')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportCreate;

