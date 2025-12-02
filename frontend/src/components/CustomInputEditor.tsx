import React, { useEffect, useRef, useState, useMemo } from "react";
//import type { ICellEditorParams } from "ag-grid-community";
import type { CustomCellEditorProps } from "ag-grid-react";

type InputType = "number" | "string" | "time";

interface Props extends CustomCellEditorProps {
  type?: InputType;
}

const CustomInputEditor: React.FC<Props> = ({ value, onValueChange, eventKey, type = "string" }) => {
  // 初期値を決定
  const initialValue = useMemo(() => {
    if (eventKey === "Backspace" || eventKey === "Delete") {
      return "";
    } else if (eventKey && eventKey.length === 1) {
      return eventKey;
    }
    return value ?? "";
  }, [eventKey, value]);

  const [inputValue, setInputValue] = useState(initialValue);
  const refInput = useRef<HTMLInputElement>(null);

  const handleChange = (val: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedValue: any = val;

    switch (type) {
      case "number":
        // 空文字のときは「値なし」として undefined を返す
        parsedValue = val === "" ? undefined : Number(val);
        break;
      case "string":
      default:
        parsedValue = val;
    }

    setInputValue(val);
    onValueChange?.(parsedValue);
  };

  useEffect(() => {
    refInput.current?.focus();

    // キー入力で編集が開始された場合、その値を通知しておく
    if (eventKey && (eventKey.length === 1 || eventKey === "Backspace" || eventKey === "Delete")) {
      handleChange(initialValue);
    }
  }, []);

  // inputのtype属性
  let inputType: string;
  switch (type) {
    case "number":
      inputType = "number";
      break;
    case "string":
    default:
      inputType = "text";
  }

  return (
    <input
      ref={refInput}
      type={inputType}
      value={inputValue}
      onChange={(e) => handleChange(e.target.value)}
      className="custom-editor-input"
    />
  );
};

export default CustomInputEditor;
