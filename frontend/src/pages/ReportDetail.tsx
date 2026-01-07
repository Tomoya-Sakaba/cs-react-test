import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getReport, downloadPdf } from '../api/reportApi';
import { format, isValid, parseISO } from 'date-fns';
import type { ReportDetail as ReportDetailType } from '../types/report';

const ReportDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const data = await getReport(Number(id));
        setReport(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded">
            下書き
          </span>
        );
      case 'submitted':
        return (
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">
            提出済み
          </span>
        );
      case 'approved':
        return (
          <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded">
            承認済み
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded">
            {status}
          </span>
        );
    }
  };

  const handleDownloadPdf = async () => {
    try {
      alert('PDF生成機能は開発中です');
      // const blob = await downloadPdf(Number(id));
      // const url = URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `${report?.reportNo}.pdf`;
      // document.body.appendChild(a);
      // a.click();
      // document.body.removeChild(a);
      // URL.revokeObjectURL(url);
    } catch (error) {
      alert('PDF生成に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            報告書の取得に失敗しました: {(error as Error)?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/report-system/reports')}
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
          報告書一覧に戻る
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-start mb-6 pb-6 border-b">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{report.templateName}</h1>
            <p className="text-sm text-gray-500 mt-2">報告書No: {report.reportNo}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(report.status)}
          </div>
        </div>

        {/* メタ情報 */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b text-sm">
          <div>
            <span className="text-gray-600 font-medium">作成者:</span>
            <span className="ml-2 text-gray-900">{report.createdUser}</span>
          </div>
          <div>
            <span className="text-gray-600 font-medium">作成日時:</span>
            <span className="ml-2 text-gray-900">{formatDate(report.createdAt)}</span>
          </div>
        </div>

        {/* 報告書データ */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">報告内容</h2>
          <div className="space-y-4">
            {report.data && Object.entries(report.data).map(([key, value]) => (
              <div key={key} className="border-b border-gray-200 pb-3">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  {key}
                </div>
                <div className="text-gray-900">
                  {typeof value === 'boolean' 
                    ? (value ? '✓ はい' : '✗ いいえ')
                    : value?.toString() || '-'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 画像（未実装） */}
        {report.images && report.images.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">添付画像</h2>
            <div className="grid grid-cols-2 gap-4">
              {report.images.map((image) => (
                <div key={image.imageId} className="border rounded-lg p-4">
                  <img
                    src={image.filePath}
                    alt={image.fileName}
                    className="w-full h-48 object-cover rounded"
                  />
                  {image.caption && (
                    <p className="mt-2 text-sm text-gray-600">{image.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-4 pt-6 border-t">
          <button
            onClick={handleDownloadPdf}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            PDFダウンロード
          </button>
          
          <button
            onClick={() => navigate(`/report-system/reports/edit/${report.reportId}`)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            編集
          </button>

          <button
            onClick={() => navigate('/report-system/reports')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            戻る
          </button>
        </div>
      </div>

      {/* データ構造の詳細（デバッグ用） */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium text-gray-700">
            データ構造を表示（開発用）
          </summary>
          <pre className="mt-2 text-xs bg-white p-4 rounded overflow-auto">
            {JSON.stringify(report, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default ReportDetail;

