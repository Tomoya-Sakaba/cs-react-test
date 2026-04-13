using System.Collections.Generic;
using Newtonsoft.Json;

namespace backend.Models.DTOs
{
    /// <summary>
    /// backend-print へ送る汎用印刷リクエスト（JSON）。
    /// DB取得・業務ロジックは backend 側で行い、このDTOだけを渡す。
    /// </summary>
    public class GemBoxPrintRequestDto
    {
        [JsonProperty("templateFileName")]
        public string TemplateFileName { get; set; }

        /// <summary>単票の {{key}} 置換用</summary>
        [JsonProperty("data")]
        public Dictionary<string, object> Data { get; set; }

        /// <summary>明細の {{table:key}} / {{key.col}} 用（キー → 行の配列）</summary>
        [JsonProperty("tables")]
        public Dictionary<string, List<Dictionary<string, object>>> Tables { get; set; }

        /// <summary>画像の {{key}} 差し込み用（キー → ファイル名/パス）</summary>
        [JsonProperty("pictures")]
        public Dictionary<string, string> Pictures { get; set; }

        [JsonProperty("downloadFileName")]
        public string DownloadFileName { get; set; }
    }
}
