import { httpClient } from "./httpClient";
import { pdfAxiosResponseToResult, type PdfBlobResult } from "../utils/pdfUtils";

export type GeneratePdfRequest = {
  fileName?: string;
  data: Record<string, unknown>;
};

export const printApi = {
  async generatePdf(request: GeneratePdfRequest): Promise<Blob> {
    const res = await httpClient.post("/api/print/pdf", request, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
        "Content-Type": "application/json",
      },
    });
    return res.data;
  },

  async generatePdfByPage(
    pageCode: string,
    args: { fileName?: string; equipmentId?: number }
  ): Promise<Blob> {
    const query =
      args.equipmentId != null
        ? `?equipmentId=${encodeURIComponent(String(args.equipmentId))}`
        : "";
    const res = await httpClient.post(
      `/api/print/pages/${encodeURIComponent(pageCode)}/pdf${query}`,
      { fileName: args.fileName, data: {} },
      {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  },

  async generatePdfByPageGemBox(
    _pageCode: string,
    args: { fileName?: string; equipmentId?: number }
  ): Promise<PdfBlobResult> {
    if (args.equipmentId == null) {
      throw new Error("equipmentId is required");
    }
    const fallback =
      args.fileName?.trim() ||
      `equipment_gembox_${args.equipmentId}.pdf`;
    const res = await httpClient.get(
      `/api/print-gembox/equipment/${encodeURIComponent(String(args.equipmentId))}/pdf`,
      {
        responseType: "blob",
        timeout: 60000,
        headers: {
          Accept: "application/pdf",
        },
      }
    );
    return pdfAxiosResponseToResult(res, fallback);
  },

  /** 機器詳細＋部品(parts)＋関連機器(linked)。テンプレ equipment_master_detail.xlsx を backend-print に配置。 */
  async generateEquipmentDetailListsGemBox(
    equipmentId: number,
    fallbackFileName?: string
  ): Promise<PdfBlobResult> {
    const fallback =
      fallbackFileName?.trim() ||
      `equipment_detail_lists_${equipmentId}.pdf`;
    const res = await httpClient.get(
      `/api/print-gembox/equipment/${encodeURIComponent(String(equipmentId))}/detail-lists/pdf`,
      {
        responseType: "blob",
        timeout: 120_000,
        headers: { Accept: "application/pdf" },
      }
    );
    return pdfAxiosResponseToResult(res, fallback);
  },

  /** 機器マスタ一覧（全件）を GemBox テンプレで PDF 化。テンプレ equipment_list.xlsx を backend-print 側に配置。 */
  async generateEquipmentListPdfGemBox(
    fallbackFileName = "equipment_list_gembox.pdf"
  ): Promise<PdfBlobResult> {
    const res = await httpClient.get("/api/print-gembox/equipment-list/pdf", {
      responseType: "blob",
      timeout: 120_000,
      headers: { Accept: "application/pdf" },
    });
    return pdfAxiosResponseToResult(res, fallbackFileName);
  },

  /** GemBox デモ: Web.config のテンプレ名に対応する xlsx を backend-print で PDF 化 */
  async fetchDemoGemBoxPdf(
    fallbackFileName = "demo_gembox.pdf"
  ): Promise<PdfBlobResult> {
    const res = await httpClient.get("/api/print-gembox/demo/pdf", {
      responseType: "blob",
      timeout: 120_000,
      headers: { Accept: "application/pdf" },
    });
    return pdfAxiosResponseToResult(res, fallbackFileName);
  },
};

