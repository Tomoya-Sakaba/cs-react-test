import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReport } from '../hooks/useReport';

const ReportList = () => {
  const navigate = useNavigate();
  const { reports, loading, error, fetchReports, deleteReport } = useReport();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleCreate = () => {
    navigate('/reports/new');
  };

  const handleEdit = (reportNo: string) => {
    navigate(`/reports/edit/${reportNo}`);
  };

  const handleDelete = async (reportNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('この報告書を削除しますか？')) {
      return;
    }

    try {
      setDeleteLoading(reportNo);
      await deleteReport(reportNo);
      await fetchReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました。');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">報告書一覧</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          新規作成
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">報告書がありません。</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  報告書No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
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
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEdit(report.reportNo)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {report.reportNo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {report.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(report.reportNo)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        編集
                      </button>
                      <button
                        onClick={(e) => handleDelete(report.reportNo, e)}
                        disabled={deleteLoading === report.reportNo}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleteLoading === report.reportNo ? '削除中...' : '削除'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportList;

