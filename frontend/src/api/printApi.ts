import { httpClient } from "./httpClient";

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
  ): Promise<Blob> {
    if (args.equipmentId == null) {
      throw new Error("equipmentId is required");
    }
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
    return res.data;
  },

  /** GemBox デモ: Web.config のテンプレ名に対応する xlsx を backend-print で PDF 化 */
  async fetchDemoGemBoxPdf(): Promise<Blob> {
    const res = await httpClient.get("/api/print-gembox/demo/pdf", {
      responseType: "blob",
      timeout: 120_000,
      headers: { Accept: "application/pdf" },
    });
    return res.data;
  },
};

