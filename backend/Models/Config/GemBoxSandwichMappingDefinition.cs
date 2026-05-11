using Newtonsoft.Json;

namespace backend.Models.Config
{
    /// <summary>
    /// common/print-mappings 配下のサンドイッチ用マッピングJSONのルート（パス解決は <see cref="GemBoxPrintMappingEngine.LoadDefinition"/> と共通）。
    /// <see cref="GemBoxPrintMappingDefinition"/> と同一の scalars / pictures / tables に加え、
    /// サンドイッチ用のシートindexを持つ。中間PDFパスは <see cref="GemBoxSandwichPrintPayloadService"/> 側で指定。
    /// </summary>
    public class GemBoxSandwichMappingDefinition : GemBoxPrintMappingDefinition
    {
        [JsonProperty("firstSheetIndex")]
        public int? FirstSheetIndex { get; set; }

        [JsonProperty("secondSheetIndex")]
        public int? SecondSheetIndex { get; set; }
    }
}
