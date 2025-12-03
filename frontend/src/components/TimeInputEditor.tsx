import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CustomCellEditorProps } from "ag-grid-react";

/**
 * 時間入力エディタ - 使用方法
 * 
 * ■ 基本的な入力方法
 * 
 * 1. 数字のみで入力（自動フォーマット）
 *    - 1桁 : 1 → 確定すると "1:00"
 *    - 2桁 : 12 → 確定すると "12:00"
 *    - 3桁 : 123 → 確定すると "12:30" （末尾1桁を分の十の位として扱う）
 *    - 4桁 : 1234 → 確定すると "12:34"
 * 
 * 2. コロン（:）を使って入力
 *    - 9:30 → "9:30"
 *    - 9:3 → "9:30" （1桁の分は×10される）
 *    - 12:45 → "12:45"
 * 
 * ■ 入力制限
 * 
 *    - 使える文字: 数字（0-9）とコロン（:）のみ
 *    - コロン: 1つまで
 *    - 時（コロン前）: 2桁まで
 *    - 分（コロン後）: 2桁まで
 *    - コロンなしの場合: 4桁まで
 *    - 時間の上限: 23:59まで（それを超える値は無効）
 * 
 * ■ 入力例
 * 
 *    OK: 1, 9, 12, 23, 930, 1234, 9:30, 12:45, 9:3
 *    NG: 24:00（時が24以上）, 12:60（分が60以上）
 * 
 * ■ 確定方法
 * 
 *    - Enter キーを押す
 *    - Tab キーを押す
 *    - セルからフォーカスを外す
 */
interface Props extends CustomCellEditorProps {}

const TimeInputEditor: React.FC<Props> = ({ value, onValueChange, eventKey }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // inputのマウント時の処理（初回のみ）
  useEffect(() => {
    // フォーカスを当てる
    inputRef.current?.focus();
    // 編集開始時点の値も一度反映（1桁目のキー入力など）
    commitValue(initialValue);
  }, []);

  // 初期値を決定（生の入力文字列として保持）
  const initialValue = useMemo(() => {
    // Backspace / Delete で開始 → 空
    if (eventKey === "Backspace" || eventKey === "Delete") {
      return "";
    }
    // 数字キーで開始 → その数字から
    if (eventKey && /^[0-9]$/.test(eventKey)) {
      return eventKey;
    }
    // 既存値があればそのまま使う（"9:30" など）
    if (typeof value === "string" && value) {
      return value;
    }
    return "";
  }, [eventKey, value]);

   // 内部では「生の入力文字列」を持つ（数字とコロン、最大5文字 "23:59"）
   const [inputValue, setInputValue] = useState(initialValue);

   // 入力文字列を「h:mm」形式に変換して onValueChange へ反映
   const commitValue = (input: string) => {
     const formatted = parseTimeInput(input);
     // 空や不正な時間の場合は undefined を渡す
     onValueChange?.(formatted === null ? undefined : formatted);
   };
  
  // 入力文字列を「h:mm」形式に変換（23:59 までを許容／それ以外は null）
  const parseTimeInput = (input: string): string | null => {
    if (!input) return null;
    
    // コロンが含まれている場合: "9:30", "12:3" など
    const colonMatch = input.match(/^(\d{1,2}):(\d{1,2})$/);
    if (colonMatch) {
      const hour = parseInt(colonMatch[1], 10);
      const minute = parseInt(colonMatch[2], 10);
      
      if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
      
      // 23:59 までを許容
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }
      
      // 1桁の分は10倍 ("9:3" → "9:30")
      const actualMinute = colonMatch[2].length === 1 ? minute * 10 : minute;
      if (actualMinute > 59) return null;
      
      return `${hour}:${actualMinute.toString().padStart(2, "0")}`;
    }
    
    // コロンがない場合: 数字のみ → 桁数で解釈
    const onlyDigits = input.replace(/[^0-9]/g, "");
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
      // 4桁以上: 1234 → 12:34
      hour = parseInt(onlyDigits.slice(0, 2), 10);
      minute = parseInt(onlyDigits.slice(2, 4), 10);
    }

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

    // 23:59 までを許容
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    const hourStr = hour.toString(); // 先頭ゼロなし
    const minuteStr = minute.toString().padStart(2, "0");

    return `${hourStr}:${minuteStr}`;
  };

  const handleChange = (val: string) => {
    // 数字とコロンのみ許可
    let cleaned = val.replace(/[^0-9:]/g, "");
    
    // コロンは1つまで（2つ目以降は削除）
    const colonCount = (cleaned.match(/:/g) || []).length;
    if (colonCount > 1) {
      // 最初のコロン以降の全てのコロンを削除
      const firstColonIndex = cleaned.indexOf(':');
      const beforeColon = cleaned.slice(0, firstColonIndex + 1);
      const afterColon = cleaned.slice(firstColonIndex + 1).replace(/:/g, '');
      cleaned = beforeColon + afterColon;
    }
    
    // コロンがある場合の制限
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      const hour = parts[0].slice(0, 2);  // 時は2桁まで
      const minute = parts[1].slice(0, 2); // 分は2桁まで
      cleaned = minute ? `${hour}:${minute}` : `${hour}:`;
    } else {
      // コロンがない場合は4桁まで
      cleaned = cleaned.slice(0, 4);
    }
    
    setInputValue(cleaned);
    // 入力中も随時 Grid に通知（リアルタイム更新）
    commitValue(cleaned);
  };

  const handleBlur = () => {
    // 編集終了時（フォーカスアウト）に確定処理を行う
    commitValue(inputValue);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="custom-editor-input w-full h-full"
      value={inputValue}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Tab") {
          // Enter / Tab で最終確定してから次のセルへ
          commitValue(inputValue);
        }
      }}
      onBlur={handleBlur}
    />
  );
};

export default TimeInputEditor;
