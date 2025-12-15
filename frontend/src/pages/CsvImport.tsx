import React, { useState, useEffect } from 'react';
import { csvApi, type CsvImportResult, type ResultEntity } from '../api/csvApi';

type FileType = 'csv' | 'excel';
type ImportMethod = 'normal' | 'bulk' | 'bulkcopy' | 'excel';

export const CsvImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [results, setResults] = useState<ResultEntity[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [fileType, setFileType] = useState<FileType>('csv'); // ファイルタイプ（CSV or Excel）
  const [insertMode, setInsertMode] = useState<ImportMethod>('bulkcopy'); // デフォルトでSqlBulkCopy

  // 初回表示時にデータを読み込む
  useEffect(() => {
    loadResults();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null); // 前回の結果をクリア
    }
  };

  const handleFileTypeChange = (type: FileType) => {
    setFileType(type);
    setFile(null); // ファイル選択をクリア
    setResult(null);
    
    // ファイルタイプに応じてインポート方法を自動設定
    if (type === 'excel') {
      setInsertMode('excel');
    } else {
      setInsertMode('bulkcopy');
    }
    
    // ファイル入力をクリア
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert(`${fileType === 'csv' ? 'CSV' : 'Excel'}ファイルを選択してください。`);
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      let importResult: CsvImportResult;
      
      if (fileType === 'excel' || insertMode === 'excel') {
        console.log('Excel取り込み開始:', file.name);
        importResult = await csvApi.importResultsExcel(file);
        console.log('Excel取り込み成功:', importResult);
      } else {
        const modeLabel = insertMode === 'bulkcopy' ? 'SqlBulkCopy' : insertMode === 'bulk' ? 'バルク' : '通常';
        console.log('CSV取り込み開始:', file.name, `(${modeLabel})`);
        
        // 挿入モードを選択
        switch (insertMode) {
          case 'bulkcopy':
            importResult = await csvApi.importResultsCsvBulkCopy(file);
            break;
          case 'bulk':
            importResult = await csvApi.importResultsCsvBulk(file);
            break;
          default:
            importResult = await csvApi.importResultsCsv(file);
            break;
        }
        
        console.log('CSV取り込み成功:', importResult);
      }
      
      setResult(importResult);
      
      // エラーがなければリストを更新
      if (importResult.errors.length === 0) {
        await loadResults();
      }
      
      // ファイル選択をクリア
      setFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('ファイル取り込みエラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      alert(`エラー: ${errorMessage}`);
      setResult({
        errors: [errorMessage],
        message: 'ファイル取り込みに失敗しました'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const loadResults = async () => {
    setIsLoadingResults(true);
    try {
      console.log('データ取得開始');
      const data = await csvApi.getAllResults();
      console.log('取得したデータ:', data);
      setResults(data);
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`データ取得エラー: ${errorMessage}`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">CSV/Excel取り込み（t_results）</h1>

      {/* ファイルアップロード */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">ファイルアップロード</h2>
        <div className="space-y-4">
          {/* ファイルタイプ選択 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">ファイルタイプ:</p>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="fileType"
                value="csv"
                checked={fileType === 'csv'}
                onChange={() => handleFileTypeChange('csv')}
                className="w-4 h-4 text-blue-600"
                disabled={isUploading}
              />
              <span className="text-sm">
                <strong>CSV</strong> - カンマ区切りファイル（.csv）
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="fileType"
                value="excel"
                checked={fileType === 'excel'}
                onChange={() => handleFileTypeChange('excel')}
                className="w-4 h-4 text-blue-600"
                disabled={isUploading}
              />
              <span className="text-sm">
                <strong>Excel</strong> - Excelファイル（.xlsx、.xls）
              </span>
            </label>
          </div>

          {/* ファイル選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {fileType === 'csv' ? 'CSVファイル' : 'Excelファイル'}を選択
            </label>
            <input
              id="file-input"
              type="file"
              accept={fileType === 'csv' ? '.csv' : '.xlsx,.xls'}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={isUploading}
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                選択中: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* フォーマット説明 */}
          {fileType === 'csv' ? (
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">CSVフォーマット:</p>
              <code className="text-xs text-gray-600 block whitespace-pre">
{`ファイルヘッダー
(空行)
日付,,コンテンツタイプ,量,企業ID,企業名
2024-12-01,,1,100.50,1,株式会社サンプル`}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                ※ 1行目: ファイルヘッダー、2行目: 空行、3行目: データヘッダー、4行目以降: データ
              </p>
              <p className="text-xs text-gray-500">
                ※ 2列目は空カラムです（,,で表示）
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Excelフォーマット:</p>
              <div className="text-xs text-gray-600">
                <table className="border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1">A</th>
                      <th className="border border-gray-300 px-2 py-1">B</th>
                      <th className="border border-gray-300 px-2 py-1">C</th>
                      <th className="border border-gray-300 px-2 py-1">D</th>
                      <th className="border border-gray-300 px-2 py-1">E</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-2 py-1">日付</td>
                      <td className="border border-gray-300 px-2 py-1">コンテンツタイプ</td>
                      <td className="border border-gray-300 px-2 py-1">量</td>
                      <td className="border border-gray-300 px-2 py-1">企業ID</td>
                      <td className="border border-gray-300 px-2 py-1">企業名</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-2 py-1">2024-12-01</td>
                      <td className="border border-gray-300 px-2 py-1">1</td>
                      <td className="border border-gray-300 px-2 py-1">100.50</td>
                      <td className="border border-gray-300 px-2 py-1">1</td>
                      <td className="border border-gray-300 px-2 py-1">株式会社サンプル</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ※ 1行目: データヘッダー、2行目以降: データ
              </p>
              <p className="text-xs text-gray-500">
                ※ 最初のシートのみを読み込みます
              </p>
            </div>
          )}

          {/* 挿入モード（CSVのみ） */}
          {fileType === 'csv' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">挿入モード:</p>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="insertMode"
                  value="bulkcopy"
                  checked={insertMode === 'bulkcopy'}
                  onChange={(e) => setInsertMode(e.target.value as ImportMethod)}
                  className="w-4 h-4 text-blue-600"
                  disabled={isUploading}
                />
                <span className="text-sm">
                  <strong>SqlBulkCopy（推奨）</strong> - 最速！SQL Serverネイティブ機能（10万件以上に最適）
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="insertMode"
                  value="bulk"
                  checked={insertMode === 'bulk'}
                  onChange={(e) => setInsertMode(e.target.value as ImportMethod)}
                  className="w-4 h-4 text-blue-600"
                  disabled={isUploading}
                />
                <span className="text-sm">
                  <strong>トランザクションバルク</strong> - 高速（1000件〜10万件に適）
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="insertMode"
                  value="normal"
                  checked={insertMode === 'normal'}
                  onChange={(e) => setInsertMode(e.target.value as ImportMethod)}
                  className="w-4 h-4 text-blue-600"
                  disabled={isUploading}
                />
                <span className="text-sm">
                  <strong>通常</strong> - 1行ずつ（エラーがあっても成功分は保存）
                </span>
              </label>
            </div>
          )}

          {/* アップロードボタン */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={`px-6 py-2 rounded font-medium ${
              !file || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading 
              ? 'アップロード中...' 
              : fileType === 'excel'
                ? 'アップロード（Excel - BulkCopy）'
                : `アップロード（CSV - ${
                    insertMode === 'bulkcopy' ? 'BulkCopy' : 
                    insertMode === 'bulk' ? 'バルク' : 
                    '通常'
                  }）`
            }
          </button>
        </div>
      </div>

      {/* 取り込み結果 */}
      {result && (
        <div className={`shadow rounded-lg p-6 mb-6 ${
          result.errors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">取り込み結果</h2>
          <p className="mb-2">{result.message}</p>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-red-600 mb-2">エラー詳細:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700 max-h-40 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* データ一覧 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">取り込み済みデータ</h2>
          <button
            onClick={loadResults}
            disabled={isLoadingResults}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium disabled:opacity-50"
          >
            {isLoadingResults ? '読み込み中...' : '再読み込み'}
          </button>
        </div>

        {isLoadingResults ? (
          <p className="text-gray-500">データを読み込んでいます...</p>
        ) : results.length === 0 ? (
          <p className="text-gray-500">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">日付</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">コンテンツタイプID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">量</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">企業ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">企業名</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日時</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成者</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{item.id}</td>
                    <td className="px-3 py-2 text-sm">
                      {item.date ? new Date(item.date).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm">{item.time ?? '-'}</td>
                    <td className="px-3 py-2 text-sm">{item.contentTypeId ?? '-'}</td>
                    <td className="px-3 py-2 text-sm">{item.vol ?? '-'}</td>
                    <td className="px-3 py-2 text-sm">{item.companyId ?? '-'}</td>
                    <td className="px-3 py-2 text-sm">{item.companyName ?? '-'}</td>
                    <td className="px-3 py-2 text-sm">{item.createdAt ? new Date(item.createdAt).toLocaleString('ja-JP') : '-'}</td>
                    <td className="px-3 py-2 text-sm">{item.createdUser ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvImportPage;

