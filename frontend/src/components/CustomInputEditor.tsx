import React, { useEffect, useRef, useState } from "react";
//import type { ICellEditorParams } from "ag-grid-community";
import type { CustomCellEditorProps } from "ag-grid-react";

type InputType = "number" | "string" | "time";

interface Props extends CustomCellEditorProps {
  type?: InputType;
}

const CustomInputEditor: React.FC<Props> = ({ value, onValueChange, type = "string" }) => {
  const [inputValue, setInputValue] = useState(value ?? "");
  const refInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refInput.current?.focus();
  }, []);

  const handleChange = (val: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedValue: any = val;

    switch (type) {
      case "number":
        parsedValue = val === "" ? 0 : Number(val);
        break;
      case "time":
        // 時間列の場合は hh:mm 形式で保持する例
        parsedValue = val;
        break;
      case "string":
      default:
        parsedValue = val;
    }

    setInputValue(val);
    onValueChange?.(parsedValue);
  };

  // inputのtype属性
  let inputType: string;
  switch (type) {
    case "number":
      inputType = "number";
      break;
    case "time":
      inputType = "time";
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
