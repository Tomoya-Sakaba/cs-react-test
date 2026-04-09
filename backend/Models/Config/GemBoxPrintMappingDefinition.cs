using System.Collections.Generic;
using Newtonsoft.Json;

namespace backend.Models.Config
{
    /// <summary>
    /// common/print-mappings/*.json のルート。
    /// Excelの {{excelKey}} と DBカラム（entity）・固定値・現在日時の対応をJSONで運用する。
    /// </summary>
    public class GemBoxPrintMappingDefinition
    {
        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("templateFileName")]
        public string TemplateFileName { get; set; }

        /// <summary>
        /// ダウンロードファイル名。{equipment_code} など excelKey を {...} で参照可能。
        /// </summary>
        [JsonProperty("downloadFileNamePattern")]
        public string DownloadFileNamePattern { get; set; }

        [JsonProperty("scalars")]
        public List<GemBoxScalarMappingItem> Scalars { get; set; }

        [JsonProperty("tables")]
        public List<GemBoxTableMappingItem> Tables { get; set; }
    }

    public class GemBoxScalarMappingItem
    {
        /// <summary>Excel テンプレ内の {{...}} のキー名</summary>
        [JsonProperty("excelKey")]
        public string ExcelKey { get; set; }

        /// <summary>entity | now | literal</summary>
        [JsonProperty("source")]
        public string Source { get; set; }

        /// <summary>m_equipment のカラム名（snake_case）。source=entity のとき使用。</summary>
        [JsonProperty("dbColumn")]
        public string DbColumn { get; set; }

        /// <summary>source=literal のときの固定文字列</summary>
        [JsonProperty("value")]
        public string Value { get; set; }

        /// <summary>日付の表示形式（source=now または entity の DateTime フィールド）</summary>
        [JsonProperty("format")]
        public string Format { get; set; }
    }

    public class GemBoxTableMappingItem
    {
        /// <summary>{{table:tableKey}} の tableKey</summary>
        [JsonProperty("tableKey")]
        public string TableKey { get; set; }

        /// <summary>明細行。キーは {{tableKey.col}} の col 部分。</summary>
        [JsonProperty("rows")]
        public List<Dictionary<string, object>> Rows { get; set; }
    }
}
