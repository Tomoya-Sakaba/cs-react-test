using System.Collections.Generic;
using Newtonsoft.Json;

namespace backend.Models.DTOs
{
    /// <summary>
    /// backend-print <c>POST /api/print/gembox/sandwich-pdf</c> へそのまま転送するボディ。
    /// </summary>
    public class GemBoxPrintSandwichPdfRequestDto
    {
        /// <summary>中間PDFのフルパス（ローカル絶対パス）。backend-print 側で GemBoxSandwichAllowAbsoluteMiddlePdf=true が必要。</summary>
        [JsonProperty("middlePdfPath")]
        public string MiddlePdfPath { get; set; }

        [JsonProperty("templateFileName")]
        public string TemplateFileName { get; set; }

        [JsonProperty("firstSheetIndex")]
        public int? FirstSheetIndex { get; set; }

        [JsonProperty("secondSheetIndex")]
        public int? SecondSheetIndex { get; set; }

        [JsonProperty("data")]
        public Dictionary<string, object> Data { get; set; }

        [JsonProperty("tables")]
        public Dictionary<string, List<Dictionary<string, object>>> Tables { get; set; }

        [JsonProperty("pictures")]
        public Dictionary<string, string> Pictures { get; set; }
    }
}
