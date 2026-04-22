import { axiosClientBlob, httpClient } from './httpClient';
import type { AxiosResponse } from 'axios';

export type GeneratePdfRequest = {
  fileName?: string;
  data: Record<string, unknown>;
};

export const printApi = {
  async generatePdf(request: GeneratePdfRequest): Promise<Blob> {
    const res = await httpClient.post('/api/print/pdf', request, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf',
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  },

  async generatePdfByPage(
    pageCode: string,
    args: { fileName?: string; reportNo?: number },
  ): Promise<Blob> {
    const query =
      args.reportNo != null
        ? `?reportNo=${encodeURIComponent(String(args.reportNo))}`
        : '';
    const res = await httpClient.post(
      `/api/print/pages/${encodeURIComponent(pageCode)}/pdf${query}`,
      { fileName: args.fileName, data: {} },
      {
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
          'Content-Type': 'application/json',
        },
      },
    );
    return res.data;
  },

  /**
   * GemBox 帳票PDF（または 200 JSON エラー）を取得する共通API。
   * GET /api/print-gembox/pdf?report=...&reportNo=...（reportNo は任意）
   * report は backend の GemBoxPrintPayloadService が解釈する帳票識別子（例: equipment_master, demo）を渡す。
   */
  async fetchGemBoxPdf(args: {
    report: string;
    reportNo?: number;
    timeoutMs?: number;
  }): Promise<AxiosResponse<Blob>> {
    const q = new URLSearchParams({ report: args.report });
    if (args.reportNo != null) q.set('reportNo', String(args.reportNo));
    return axiosClientBlob.get(`/api/print-gembox/pdf?${q.toString()}`, {
      timeout: args.timeoutMs ?? 120_000,
    });
  },
};
