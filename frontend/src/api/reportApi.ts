// 報告書システムAPIクライアント

import axios from 'axios';
import type {
  Template,
  TemplateListItem,
  Report,
  ReportDetail,
  ReportSearchParams,
  ReportSearchResult,
  CreateReportRequest,
  UpdateReportRequest,
  TemplateUploadRequest,
} from '../types/report';

// 新しい報告書システムのAPIベースURL
// 古い報告書システム (/api/reports) と衝突しないように別のパスを使用
const API_BASE_URL = '/api/report-management';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========================================
// テンプレート関連API
// ========================================

/**
 * テンプレート一覧を取得
 */
export const getTemplates = async (): Promise<TemplateListItem[]> => {
  const response = await apiClient.get<TemplateListItem[]>('/templates');
  return response.data;
};

/**
 * テンプレート詳細を取得
 */
export const getTemplate = async (id: number): Promise<Template> => {
  const response = await apiClient.get<Template>(`/templates/${id}`);
  return response.data;
};

/**
 * テンプレートをアップロード
 */
export const uploadTemplate = async (request: TemplateUploadRequest): Promise<any> => {
  const formData = new FormData();
  formData.append('template_name', request.templateName);
  formData.append('template_code', request.templateCode);
  if (request.description) {
    formData.append('description', request.description);
  }
  formData.append('created_user', request.createdUser);
  formData.append('excel_file', request.excelFile);

  const response = await apiClient.post('/templates/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * テンプレートを更新
 */
export const updateTemplate = async (
  id: number,
  data: Partial<Template>
): Promise<any> => {
  const response = await apiClient.put(`/templates/${id}`, data);
  return response.data;
};

/**
 * テンプレートを削除
 */
export const deleteTemplate = async (id: number, deletedUser: string): Promise<any> => {
  const response = await apiClient.delete(`/templates/${id}`, {
    params: { deletedUser },
  });
  return response.data;
};

/**
 * フィールドタイプ一覧を取得
 */
export const getFieldTypes = async (): Promise<Record<string, string>> => {
  const response = await apiClient.get<Record<string, string>>('/templates/field-types');
  return response.data;
};

// ========================================
// 報告書関連API
// ========================================

/**
 * 報告書一覧を取得（検索機能付き）
 */
export const searchReports = async (
  params: ReportSearchParams
): Promise<ReportSearchResult> => {
  const response = await apiClient.get<ReportSearchResult>('', { params });
  return response.data;
};

/**
 * 報告書詳細を取得
 */
export const getReport = async (id: number): Promise<ReportDetail> => {
  const response = await apiClient.get<ReportDetail>(`/${id}`);
  return response.data;
};

/**
 * 報告書を作成
 */
export const createReport = async (request: CreateReportRequest): Promise<any> => {
  const response = await apiClient.post('', request);
  return response.data;
};

/**
 * 報告書を更新
 */
export const updateReport = async (
  id: number,
  request: UpdateReportRequest
): Promise<any> => {
  const response = await apiClient.put(`/${id}`, request);
  return response.data;
};

/**
 * 報告書を削除
 */
export const deleteReport = async (id: number): Promise<any> => {
  const response = await apiClient.delete(`/${id}`);
  return response.data;
};

/**
 * PDFをダウンロード
 */
export const downloadPdf = async (id: number): Promise<Blob> => {
  const response = await apiClient.get(`/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Excelをダウンロード
 */
export const downloadExcel = async (id: number): Promise<Blob> => {
  const response = await apiClient.get(`/${id}/excel`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * PDFプレビューURLを取得
 */
export const getPdfPreviewUrl = (id: number): string => {
  return `${API_BASE_URL}/${id}/preview`;
};

/**
 * ファイルダウンロードヘルパー
 */
export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default apiClient;

