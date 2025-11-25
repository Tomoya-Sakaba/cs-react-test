import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReport, type CreateReportRequest, type UpdateReportRequest } from '../hooks/useReport';
import { useApproval } from '../hooks/useApproval';
import Toggle from '../components/Toggle';
import ApprovalDrawer from '../components/ApprovalDrawer';

const ReportForm = () => {
  const navigate = useNavigate();
  const { reportNo } = useParams<{ reportNo?: string }>();
  const isEditMode = !!reportNo;

  const { report, loading, error, fetchReportByReportNo, createReport, updateReport } = useReport();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  // 編集モードの切り替え（編集モードの場合のみ使用）
  const [isEditing, setIsEditing] = useState(false);

  const {
    approvalStatus,
    isDrawerOpen,
    setIsDrawerOpen,
    refresh: refreshApprovalStatus,
    getApprovalFlowDirection,
  } = useApproval({
    approvalId: '0201', // 報告書ページ固有のapprovalId（固定値）
    reportNo: report?.reportNo || '', // 報告書のReportNoを使用（存在しない場合は空文字列）
    autoFetch: !!report?.reportNo, // 報告書が存在する場合のみ自動取得
  });

  // 編集モードの場合、既存の報告書を取得
  useEffect(() => {
    if (isEditMode && reportNo) {
      fetchReportByReportNo(reportNo);
    }
  }, [isEditMode, reportNo, fetchReportByReportNo]);

  // 報告書データが取得できたらフォームに設定
  useEffect(() => {
    if (report) {
      setTitle(report.title);
      setContent(report.content);
      // 編集モードの場合は初期状態は読み取り専用
      setIsEditing(false);
    }
  }, [report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('タイトルを入力してください。');
      return;
    }

    try {
      setSubmitLoading(true);

      if (isEditMode && reportNo) {
        // 更新
        const request: UpdateReportRequest = {
          reportNo,
          title: title.trim(),
          content: content.trim(),
        };
        await updateReport(request);
        alert('報告書を更新しました。');
        // 上程状態も更新
        if (report?.reportNo) {
          await refreshApprovalStatus(); // useApproval: 上程状態を再取得
        }
      } else {
        // 作成
        const request: CreateReportRequest = {
          title: title.trim(),
          content: content.trim(),
        };
        const createdReport = await createReport(request);
        alert('報告書を作成しました。');
        navigate(`/reports/edit/${createdReport.reportNo}`);
        return;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && isEditing) {
      // 編集モードで編集中の場合、確認して読み取り専用に戻す
      if (window.confirm('編集中の内容が失われますが、よろしいですか？')) {
        // 元のデータに戻す
        if (report) {
          setTitle(report.title);
          setContent(report.content);
        }
        setIsEditing(false);
      }
    } else {
      // 新規作成モードまたは読み取り専用モードの場合、一覧に戻る
      navigate('/reports');
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // 編集モードから読み取り専用に戻す場合、確認
      if (window.confirm('編集中の内容が失われますが、よろしいですか？')) {
        // 元のデータに戻す
        if (report) {
          setTitle(report.title);
          setContent(report.content);
        }
        setIsEditing(false);
      }
    } else {
      // 読み取り専用から編集モードに切り替え
      setIsEditing(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">エラー: {error}</p>
      </div>
    );
  }

  // 編集可能かどうか（新規作成時は常にtrue、編集モード時はisEditingの値）
  const isEditable = !isEditMode || isEditing;


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? '報告書詳細' : '報告書作成'}
            </h1>
            {isEditMode && report && (
              <p className="text-sm text-gray-500 mt-1">報告書No: {report.reportNo}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* 上程状態表示（報告書が存在する場合のみ） */}
            {isEditMode && report && approvalStatus.length > 0 && (() => {
              const flowDirection = getApprovalFlowDirection();
              return (
                <div className="flex flex-col rounded-lg border-2 border-orange-500 bg-orange-50 px-3 py-2">
                  {flowDirection.action === '完了' ? (
                    <div className="text-sm font-bold text-green-700">
                      承認完了
                    </div>
                  ) : flowDirection.action === '差し戻し' ? (
                    <>
                      <div className="text-sm font-bold text-red-700">
                        {flowDirection.flow.join(' → ')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <span>差戻</span>
                        {flowDirection.actionDate && (
                          <span>
                            ({new Date(flowDirection.actionDate).toLocaleString('ja-JP')})
                          </span>
                        )}
                      </div>
                    </>
                  ) : flowDirection.flow.length > 0 ? (
                    <>
                      <div className="text-sm font-bold text-orange-700">
                        {flowDirection.flow.join(' → ')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-orange-600">
                        <span>上程中</span>
                        {flowDirection.actionDate && (
                          <span>
                            ({new Date(flowDirection.actionDate).toLocaleString('ja-JP')})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-bold text-orange-700">
                      上程中
                    </div>
                  )}
                </div>
              );
            })()}
            {/* 上程ボタン（報告書が存在する場合のみ） */}
            {isEditMode && report && (
              <button
                onClick={() => setIsDrawerOpen(true)} // useApproval: Drawerの開閉状態を設定
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                上程
              </button>
            )}
            {isEditMode && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">編集モード</span>
                <Toggle value={isEditing} onChange={handleToggleEdit} />
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タイトル <span className="text-red-500">*</span>
          </label>
          {isEditable ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="報告書のタイトルを入力してください"
              required
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900">
              {title || '-'}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容
          </label>
          {isEditable ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="報告書の内容を入力してください"
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900 whitespace-pre-wrap min-h-[300px]">
              {content || '-'}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {isEditMode && isEditing ? '編集をキャンセル' : '戻る'}
          </button>
          {isEditable && (
            <button
              type="submit"
              disabled={submitLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? '保存中...' : isEditMode ? '保存' : '作成'}
            </button>
          )}
        </div>
      </form>

      {/* 上程Drawer（開いている時のみレンダリング） */}
      {isEditMode && report && isDrawerOpen && ( // useApproval: Drawerの開閉状態を取得
        <ApprovalDrawer
          onClose={() => setIsDrawerOpen(false)} // useApproval: Drawerの開閉状態を設定
          approvalId="0201" // 報告書ページ固有のapprovalId（固定値）
          reportNo={report.reportNo}
          approvalStatus={approvalStatus} // useApproval: 承認状態
          loading={false} // useApproval: 読み込み状態（必要に応じて追加）
          onApprovalChange={refreshApprovalStatus} // useApproval: 上程状態を再取得
        />
      )}
    </div>
  );
};

export default ReportForm;

