import axios from "axios";

export type GeneratePdfRequest = {
  fileName?: string;
  data: Record<string, unknown>;
};

export const printApi = {
  async generatePdf(request: GeneratePdfRequest): Promise<Blob> {
    const res = await axios.post("/api/print/pdf", request, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
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
    const res = await axios.post(
      `/api/print/pages/${encodeURIComponent(pageCode)}/pdf${query}`,
      { fileName: args.fileName, data: {} },
      {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      }
    );
    return res.data;
  },
};

