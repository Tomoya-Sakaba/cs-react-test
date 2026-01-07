import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchReports } from '../api/reportApi';
import { format, isValid, parseISO } from 'date-fns';
import type { ReportSearchResult } from '../types/report';

const ReportManagementList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    status: undefined as string | undefined,
    createdUser: '',
    page: 1,
    limit: 20,
  });
  const [result, setResult] = useState<ReportSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const data = await searchReports(searchParams);
        setResult(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [searchParams.status, searchParams.createdUser, searchParams.page, searchParams.limit]);

  const refetch = () => {
    setSearchParams({ ...searchParams });
  };

  // 安全な日付フォーマット関数
  const formatDate = (dateString: string | Date) => {
    try {
      if (!dateString) return '-';
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      if (!isValid(date)) return '-';
      return format(date, 'yyyy/MM/dd HH:mm');
    } catch (error) {
      console.error('日付フォーマットエラー:', error, dateString);
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
            下書き
          </span>
        );
      case 'submitted':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            提出済み
          </span>
        );
      case 'approved':
        return (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
            承認済み
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {status}
          </span>
        );
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
        <h1 className="text-3xl font-bold text-gray-800">報告書一覧</h1>
        <button
          onClick={() => navigate('/report-system/templates')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors"
        >
          ＋ 新規作成
        </button>
      </div>

      {/* 検索フィルター */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={searchParams.status || ''}
              onChange={(e) =>
                setSearchParams({ ...searchParams, status: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">すべて</option>
              <option value="draft">下書き</option>
              <option value="submitted">提出済み</option>
              <option value="approved">承認済み</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作成者
            </label>
            <input
              type="text"
              value={searchParams.createdUser}
              onChange={(e) =>
                setSearchParams({ ...searchParams, createdUser: e.target.value })
              }
              placeholder="作成者名で検索"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              検索
            </button>
          </div>
        </div>
      </div>

      {/* 報告書一覧 */}
      {result && result.items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">報告書がありません</p>
          <button
            onClick={() => navigate('/report-system/templates')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            最初の報告書を作成
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  報告書No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  テンプレート
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作成者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作成日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {result?.items.map((report) => (
                <tr
                  key={report.reportId}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <button
                      onClick={() => navigate(`/report-system/reports/${report.reportId}`)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {report.reportNo}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {report.templateName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(report.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.createdUser}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(report.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => navigate(`/report-system/reports/${report.reportId}`)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      詳細
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('PDF生成機能は開発中です');
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ページネーション */}
          {result && result.total > result.limit && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                全 {result.total} 件中 {(result.page - 1) * result.limit + 1} -{' '}
                {Math.min(result.page * result.limit, result.total)} 件を表示
              </div>
              <div className="flex gap-2">
                <button
                  disabled={result.page === 1}
                  onClick={() =>
                    setSearchParams({ ...searchParams, page: result.page - 1 })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <button
                  disabled={result.page * result.limit >= result.total}
                  onClick={() =>
                    setSearchParams({ ...searchParams, page: result.page + 1 })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportManagementList;

