namespace backend.Models.Config
{
    /// <summary>
    /// GemBox 帳票（<c>GET api/print-gembox/pdf?report=...</c>）の識別子。
    /// 追加時はここ・<see cref="Services.GemBoxPrintPayloadService.BuildGemBoxPdfRequest"/> の case・フロントの printApi を揃える。
    /// </summary>
    public static class GemBoxReportCodes
    {
        public const string EquipmentMaster = "equipment_master";
        public const string EquipmentDetailLists = "equipment_detail_lists";
        public const string EquipmentList = "equipment_list";
        public const string Demo = "demo";
    }
}
