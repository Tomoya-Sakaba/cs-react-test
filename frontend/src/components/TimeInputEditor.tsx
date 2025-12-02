import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CustomCellEditorProps } from "ag-grid-react";

// - セル選択状態で数字キーを押すと、その数字から編集開始（1文字目もきちんと使われる）
// - 入力中は自由に「1」「10」「12:3」「1234」などを入力可能
// - フォーカスアウト時（Enter・Tab 等で編集終了時）に「h:mm」形式へ正規化して onValueChange に渡す
interface Props extends CustomCellEditorProps {}

const TimeInputEditor: React.FC<Props> = ({ value, onValueChange, eventKey }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // 初期の「数字4桁まで」を決定
  const initialDigits = useMemo(() => {
    // Backspace / Delete で開始 → 空
    if (eventKey === "Backspace" || eventKey === "Delete") {
      return "";
    }
    // 数字キーで開始 → その数字から
    if (eventKey && /^[0-9]$/.test(eventKey)) {
      return eventKey;
    }
    // 既存値があれば "h:mm" / "hh:mm" などから数字だけ取り出し（最大4桁）
    if (typeof value === "string") {
      return value.replace(/[^0-9]/g, "").slice(0, 4);
    }
    return "";
  }, [eventKey, value]);

  // 内部では「数字のみ最大4桁」を持つ
  const [digits, setDigits] = useState(initialDigits);

  // 数字列を「h:mm」形式に変換
  const digitsToTimeString = (d: string): string | null => {
    if (!d) return null;
    const onlyDigits = d.replace(/[^0-9]/g, "").slice(0, 4);
    if (!onlyDigits) return null;

    let hour: number;
    let minute: number;

    if (onlyDigits.length === 1) {
      // 1桁: 1 → 1:00
      hour = parseInt(onlyDigits, 10);
      minute = 0;
    } else if (onlyDigits.length === 2) {
      // 2桁: 10 → 10:00
      hour = parseInt(onlyDigits, 10);
      minute = 0;
    } else if (onlyDigits.length === 3) {
      // 3桁: 123 → 12:30 （末尾1桁を「十の位の分」とみなす）
      hour = parseInt(onlyDigits.slice(0, 2), 10);
      minute = parseInt(onlyDigits.slice(2), 10) * 10;
    } else {
      // 4桁: 1234 → 12:34
      hour = parseInt(onlyDigits.slice(0, 2), 10);
      minute = parseInt(onlyDigits.slice(2, 4), 10);
    }

    if (Number.isNaN(hour)) return null;
    if (Number.isNaN(minute)) minute = 0;

    const hourStr = hour.toString(); // 先頭ゼロなし
    const minuteStr = minute.toString().padStart(2, "0");

    return `${hourStr}:${minuteStr}`;
  };

  // onValueChange へ反映
  const commitDigits = (d: string) => {
    const formatted = digitsToTimeString(d);
    // 空などで有効な時間が作れない場合は undefined を渡す
    onValueChange?.(formatted === null ? undefined : formatted);
  };

  const handleChange = (val: string) => {
    // 入力された文字列から数字だけを最大4桁取り出す
    const onlyDigits = val.replace(/[^0-9]/g, "").slice(0, 4);
    setDigits(onlyDigits);
    commitDigits(onlyDigits);
  };

  useEffect(() => {
    // フォーカスを当てる
    inputRef.current?.focus();
    // 編集開始時点の値も一度反映（1桁目のキー入力など）
    commitDigits(initialDigits);
    // initialDigits / commitDigits はマウント時だけ使う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBlur = () => {
    // 編集終了時（フォーカスアウト）に確定処理を行う
    commitDigits(digits);
  };

  // 表示用文字列（3桁以上で自動的にコロンを挿入）
  const displayValue = useMemo(() => {
    const d = digits.replace(/[^0-9]/g, "").slice(0, 4);
    if (d.length <= 2) return d;
    // 3桁: 123 → "12:3"
    // 4桁: 1234 → "12:34"
    return `${d.slice(0, 2)}:${d.slice(2)}`;
  }, [digits]);

  return (
    <input
      ref={inputRef}
      type="text"
      className="custom-editor-input w-full h-full"
      value={displayValue}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Tab") {
          // Enter / Tab で最終確定してから次のセルへ
          commitDigits(digits);
        }
      }}
      onBlur={handleBlur}
    />
  );
};

export default TimeInputEditor;
