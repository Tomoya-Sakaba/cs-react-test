import { axiosClientBlob, httpClient } from './httpClient';
import type { AxiosResponse } from 'axios';

function gemBoxUnifiedPdfUrl(report: string, reportNo?: number): string {
  const q = new URLSearchParams({ report });
  if (reportNo != null) q.set('reportNo', String(reportNo));
  return `/api/print-gembox/pdf?${q.toString()}`;
}

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
   * report は backend の GemBoxReportCodes と同じ値を呼び出し側で渡す。
   */
  async fetchGemBoxPdf(args: {
    report: string;
    reportNo?: number;
    timeoutMs?: number;
  }): Promise<AxiosResponse<Blob>> {
    return await axiosClientBlob.get(gemBoxUnifiedPdfUrl(args.report, args.reportNo), {
      timeout: args.timeoutMs ?? 120_000,
    });
  },
};
