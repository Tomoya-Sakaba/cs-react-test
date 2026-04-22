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

        [JsonProperty("scalars")]
        public List<GemBoxScalarMappingItem> Scalars { get; set; }

        [JsonProperty("tables")]
        public List<GemBoxTableMappingItem> Tables { get; set; }

        /// <summary>
        /// 画像差し込み定義。Excel テンプレ内の {{key}} を「画像」として扱い、ファイル名（またはパス）をソースから取得する。
        /// </summary>
        [JsonProperty("pictures")]
        public List<GemBoxPictureMappingItem> Pictures { get; set; }
    }

    public class GemBoxScalarMappingItem
    {
        /// <summary>Excel テンプレ内の {{...}} のキー名</summary>
        [JsonProperty("excelKey")]
        public string ExcelKey { get; set; }

        /// <summary>m_equipment のカラム名（snake_case）。source=entity のとき使用。</summary>
        [JsonProperty("dbColumn")]
        public string DbColumn { get; set; }

    }

    public class GemBoxTableMappingItem
    {
        /// <summary>{{table:tableKey}} の tableKey</summary>
        [JsonProperty("tableKey")]
        public string TableKey { get; set; }

        /// <summary>
        /// 明細列のマッピング定義（DB→Excel）。キーは {{tableKey.col}} の col 部分。
        /// </summary>
        [JsonProperty("columns")]
        public List<GemBoxTableColumnMappingItem> Columns { get; set; }
    }

    public class GemBoxTableColumnMappingItem
    {
        /// <summary>{{tableKey.col}} の col 部分</summary>
        [JsonProperty("field")]
        public string Field { get; set; }

        /// <summary>m_equipment のカラム名（snake_case）。source=entity のとき使用。</summary>
        [JsonProperty("dbColumn")]
        public string DbColumn { get; set; }

    }

    public class GemBoxPictureMappingItem
    {
        /// <summary>Excel テンプレ内の {{...}} のキー名（写真枠セルに置く）</summary>
        [JsonProperty("key")]
        public string Key { get; set; }

        /// <summary>ファイル名（またはパス）が入っているソース側のキー（<see cref="GemBoxPrintMappingEngine.BuildRequest"/> の pictureSource）</summary>
        [JsonProperty("dbColumn")]
        public string DbColumn { get; set; }
    }
}
