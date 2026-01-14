import axios from 'axios';
import type { HeaderDefinition, DailyPlan, Company } from '../pages/WasteSchedule';

const API_BASE_URL = '/api/waste-schedule';

/**
 * 廃棄物排出計画スケジュール用API
 */
export const wasteScheduleApi = {
  /**
   * ヘッダー定義を取得
   */
  fetchHeaderDefinition: async (
    year: number,
    month: number,
    isSpecialDay: boolean
  ): Promise<HeaderDefinition[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/header-definition/${year}/${month}`,
      {
        params: { isSpecialDay: isSpecialDay ? 1 : 0 },
      }
    );
    return response.data;
  },

  /**
   * 月次計画データを取得
   */
  fetchMonthlyPlan: async (
    year: number,
    month: number,
    version: number = 0
  ): Promise<DailyPlan[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/monthly/${year}/${month}`,
      {
        params: { version },
      }
    );
    return response.data;
  },

  /**
   * 月次計画データを保存
   */
  savePlan: async (data: SavePlanRequest[]): Promise<void> => {
    await axios.post(`${API_BASE_URL}/save`, data);
  },

  /**
   * バージョンを作成（スナップショット）
   */
  createVersion: async (year: number, month: number): Promise<number> => {
    const response = await axios.post(
      `${API_BASE_URL}/create-version/${year}/${month}`
    );
    return response.data.version;
  },

  /**
   * 利用可能なバージョンを取得
   */
  fetchAvailableVersions: async (
    year: number,
    month: number
  ): Promise<number[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/versions/${year}/${month}`
    );
    return response.data;
  },

  /**
   * 会社マスタを取得（既存のAPIを利用）
   */
  fetchCompanyList: async (): Promise<Company[]> => {
    const response = await axios.get('/api/test/company-list');
    return response.data;
  },

  /**
   * 利用可能な年月を取得（既存のAPIを利用）
   */
  fetchAvailableYearMonths: async (): Promise<
    { year: number; month: number }[]
  > => {
    const response = await axios.get('/api/test/available-year-months');
    return response.data;
  },

  /**
   * 計画と実績を突合
   */
  matchWithActual: async (
    year: number,
    month: number
  ): Promise<MatchedData[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/match-with-actual/${year}/${month}`
    );
    return response.data;
  },

  /**
   * ヘッダー定義を保存・更新
   */
  saveHeaderDefinition: async (
    year: number,
    month: number,
    isSpecialDay: boolean,
    headers: HeaderDefinitionRequest[]
  ): Promise<void> => {
    await axios.post(`${API_BASE_URL}/header-definition`, {
      year,
      month,
      isSpecialDay,
      headers,
    });
  },
};

/**
 * 保存リクエスト型
 */
export type SavePlanRequest = {
  year: number;
  month: number;
  date: string; // YYYY-MM-DD形式
  isSpecialDay: boolean;
  headerId: number;
  wasteType: string;
  typeSequence: number;
  companyId: number | null;
  vol: number | null;
  plannedTime: string | null; // HH:mm形式
  note: string;
};

/**
 * ヘッダー定義リクエスト型
 */
export type HeaderDefinitionRequest = {
  headerOrder: number;
  wasteType: string;
  typeSequence: number;
  displayName: string;
};

/**
 * 突合結果型
 */
export type MatchedData = {
  date: string;
  wasteType: string;
  typeSequence: number;
  headerName: string;
  planCompanyId: number | null;
  planVol: number | null;
  plannedTime: string | null;
  actualTime: string | null;
  actualCompanyId: number | null;
  actualVol: number | null;
  status: string; // '未実施', '計画通り', '遅延（許容範囲）', '大幅遅延'
  timeDiffMinutes: number | null;
};

