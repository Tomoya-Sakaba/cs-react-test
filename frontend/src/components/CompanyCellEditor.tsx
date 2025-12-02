import React, { useEffect, useRef, useState } from 'react';
import type { CustomCellEditorProps } from 'ag-grid-react';
import type { Company } from '../pages/AgTest';

interface Props extends CustomCellEditorProps {
  companies: Company[];
  // Grid側から渡される「編集終了要求」コールバック
  onRequestStopEditing?: () => void;
}

const CompanyCellEditor: React.FC<Props> = ({
  value,
  onValueChange,
  companies,
  onRequestStopEditing,
}) => {
  // 選択肢の ID リスト（先頭は「未選択」＝undefined）
  const optionIds: (number | undefined)[] = [
    undefined,
    ...companies.map((c) => c.companyId),
  ];

  const initialId = typeof value === 'number' ? value : undefined;

  // 現在選択されている companyId（確定値）
  const [, setSelectedId] = useState<number | undefined>(initialId);
  // キーボード操作でハイライトされているインデックス
  const [highlightIndex, setHighlightIndex] = useState(() => {
    const idx = optionIds.findIndex((id) => id === initialId);
    return idx >= 0 ? idx : 0;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleSelect = (id: number | undefined) => {
    setSelectedId(id);
    onValueChange?.(id);
    // 値選択と同時に編集を確定してポップアップを閉じる
    onRequestStopEditing?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key;

    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter') {
      // Grid のデフォルトナビゲーションを止める
      e.preventDefault();
      e.stopPropagation();
    }

    if (key === 'ArrowDown') {
      setHighlightIndex((prev) => (prev + 1) % optionIds.length);
    } else if (key === 'ArrowUp') {
      setHighlightIndex((prev) =>
        prev === 0 ? optionIds.length - 1 : prev - 1
      );
    } else if (key === 'Enter') {
      const id = optionIds[highlightIndex];
      handleSelect(id);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="w-56 max-h-64 overflow-y-auto rounded border border-gray-300 bg-white text-xs shadow-lg"
      // capture フェーズで処理して、Grid に届く前に Enter / Arrow キーを止める
      onKeyDownCapture={handleKeyDown}
    >
      {/* 未選択 */}
      <button
        type="button"
        className={`flex w-full items-center px-2 py-1 text-left hover:bg-blue-50 ${
          highlightIndex === 0 ? 'bg-blue-100 font-semibold' : ''
        }`}
        onClick={() => handleSelect(undefined)}
      >
        <span className="h-3 w-3 rounded-full bg-gray-300" />
        <span className="ml-2">未選択</span>
      </button>

      {/* 会社一覧 */}
      {companies.map((c, index) => (
        <button
          key={c.companyId}
          type="button"
          className={`flex w-full items-center px-2 py-1 text-left hover:bg-blue-50 ${
            highlightIndex === index + 1 ? 'bg-blue-100 font-semibold' : ''
          }`}
          onClick={() => handleSelect(c.companyId)}
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: c.bgColor }}
          />
          <span className="ml-2">{c.companyName}</span>
        </button>
      ))}
    </div>
  );
};

export default CompanyCellEditor;

