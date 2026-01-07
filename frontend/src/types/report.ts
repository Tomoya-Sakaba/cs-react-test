// 報告書システムの型定義

export interface Template {
  templateId: number;
  templateName: string;
  templateCode: string;
  description?: string;
  fileName: string;
  filePath: string;
  isActive: boolean;
  createdAt: string;
  createdUser: string;
  fields?: TemplateField[];
}

export interface TemplateField {
  fieldId: number;
  templateId: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  cellAddress?: string;
  rowNumber?: number;
  columnNumber?: number;
  options?: string;
  isRequired: boolean;
  validationRule?: string;
  defaultValue?: string;
  displayOrder: number;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'email'
  | 'tel'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'image';

export interface TemplateListItem {
  templateId: number;
  templateName: string;
  templateCode: string;
  description?: string;
  fieldCount: number;
  isActive: boolean;
  createdAt: string;
  createdUser: string;
}

export interface Report {
  reportId: number;
  templateId: number;
  reportNo: string;
  reportData: string; // JSON string
  status: ReportStatus;
  createdAt: string;
  createdUser: string;
  updatedAt?: string;
  updatedUser?: string;
}

export type ReportStatus = 'draft' | 'submitted' | 'approved';

export interface ReportDetail {
  reportId: number;
  reportNo: string;
  templateId: number;
  templateName: string;
  data: Record<string, any>;
  status: ReportStatus;
  images: ReportImage[];
  createdAt: string;
  createdUser: string;
}

export interface ReportListItem {
  reportId: number;
  reportNo: string;
  templateId: number;
  templateName: string;
  status: ReportStatus;
  createdAt: string;
  createdUser: string;
}

export interface ReportImage {
  imageId: number;
  reportId: number;
  fileName: string;
  filePath: string;
  caption?: string;
  displayOrder: number;
  annotations?: ImageAnnotation[];
}

export interface ImageAnnotation {
  annotationId: number;
  imageId: number;
  annotationType: 'line' | 'arrow' | 'circle' | 'rect' | 'text';
  annotationData: string; // JSON string
}

export interface CreateReportRequest {
  templateId: number;
  createdUser: string;
  data: Record<string, any>;
}

export interface UpdateReportRequest {
  status?: ReportStatus;
  updatedUser: string;
  data: Record<string, any>;
}

export interface ReportSearchParams {
  status?: ReportStatus;
  createdUser?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ReportSearchResult {
  total: number;
  page: number;
  limit: number;
  items: ReportListItem[];
}

export interface TemplateUploadRequest {
  templateName: string;
  templateCode: string;
  description?: string;
  createdUser: string;
  excelFile: File;
}

