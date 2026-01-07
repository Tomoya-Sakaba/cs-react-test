import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { uploadTemplate } from '../api/reportApi';

const templateSchema = z.object({
  templateName: z.string().min(1, 'テンプレート名は必須です'),
  templateCode: z
    .string()
    .min(1, 'テンプレートコードは必須です')
    .regex(/^[a-zA-Z0-9_-]+$/, '半角英数字、ハイフン、アンダースコアのみ使用可能です'),
  description: z.string().optional(),
  createdUser: z.string().min(1, '作成者名は必須です'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

const TemplateUpload: React.FC = () => {
  const navigate = useNavigate();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      createdUser: 'admin', // デフォルト値
    },
  });

  const { 
    getRootProps, // ドラッグ&ドロップエリアのprops
    getInputProps, // ファイル選択用のinput要素のprops
    isDragActive // ドラッグ&ドロップエリアのアクティブ状態
  } = useDropzone({
    // Excel 2007以降の .xlsx ファイルのMIMEタイプ
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    // 1ファイルのみアップロード可能
    maxFiles: 1,
    // ファイルを選択(ドラック&ドロップ)したときの処理
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setExcelFile(acceptedFiles[0]);
        setUploadError('');
      }
    },
  });

  const [isUploading, setIsUploading] = useState(false);

  const onSubmit = async (data: TemplateFormData) => {
    if (!excelFile) {
      setUploadError('Excelファイルを選択してください');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');
      
      await uploadTemplate({
        ...data,
        excelFile: excelFile,
      });
      
      alert('テンプレートが正常にアップロードされました');
      navigate('/report-system/templates');
    } catch (error: any) {
      console.error('アップロードエラー詳細:', error);
      
      let message = 'アップロードに失敗しました';
      
      if (error.response) {
        const data = error.response.data;
        if (typeof data === 'string') {
          message = data;
        } else if (data?.message) {
          message = data.message;
        } else if (data?.Message) {
          message = data.Message;
        } else if (data?.ExceptionMessage) {
          message = data.ExceptionMessage;
        }
        
        console.error('サーバーエラー:', message);
        console.error('ステータス:', error.response.status);
      } else if (error.request) {
        message = 'サーバーに接続できませんでした';
        console.error('リクエストエラー:', error.request);
      } else {
        message = error.message || 'エラーが発生しました';
        console.error('その他のエラー:', error.message);
      }
      
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          テンプレートアップロード
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* テンプレート名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テンプレート名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('templateName')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: 作業報告書"
            />
            {errors.templateName && (
              <p className="mt-1 text-sm text-red-600">{errors.templateName.message}</p>
            )}
          </div>

          {/* テンプレートコード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テンプレートコード <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('templateCode')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: work_report_001"
            />
            <p className="mt-1 text-xs text-gray-500">
              半角英数字、ハイフン、アンダースコアのみ使用可能
            </p>
            {errors.templateCode && (
              <p className="mt-1 text-sm text-red-600">{errors.templateCode.message}</p>
            )}
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明（任意）
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="テンプレートの説明を入力"
            />
          </div>

          {/* 作成者 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作成者 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('createdUser')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="作成者名"
            />
            {errors.createdUser && (
              <p className="mt-1 text-sm text-red-600">{errors.createdUser.message}</p>
            )}
          </div>

          {/* ファイルアップロード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excelテンプレート <span className="text-red-500">*</span>
            </label>
            {/* ドラッグ&ドロップエリア */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {/* ファイル選択用のinput要素 */}
              <input {...getInputProps()} />
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {excelFile ? (
                <p className="mt-2 text-sm text-gray-600">
                  選択済み: <span className="font-medium">{excelFile.name}</span>
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-600">
                    ドラッグ＆ドロップ または クリックしてファイル選択
                  </p>
                  <p className="mt-1 text-xs text-gray-500">.xlsx形式のファイル</p>
                </>
              )}
            </div>
          </div>

          {/* エラーメッセージ */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isUploading ? 'アップロード中...' : 'アップロード'}
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

      {/* ヘルプセクション */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          📘 テンプレートの作成方法
        </h2>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Excelで好きなレイアウトの報告書を作成</li>
          <li>
            • 入力欄に <code className="bg-white px-1 rounded">{`{{フィールド名:型}}`}</code>{' '}
            を記入
          </li>
          <li>
            • 例: <code className="bg-white px-1 rounded">{`{{work_date:date}}`}</code>,{' '}
            <code className="bg-white px-1 rounded">{`{{worker_name:text}}`}</code>
          </li>
          <li>
            • サポートされている型: text, textarea, number, date, time, select, image
            など
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TemplateUpload;

