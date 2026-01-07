import axios from 'axios';
import type { DailySchedule, Company, WasteTypeMaster } from '../pages/FlexibleSchedule';

const API_BASE_URL = '/api/flexible-schedule';

/**
 * 柔軟な計画スケジュール用API
 */
export const flexibleScheduleApi = {
  /**
   * 月次計画スケジュールを取得
   */
  fetchMonthlySchedule: async (
    year: number,
    month: number,
    version: number = 0
  ): Promise<DailySchedule[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/monthly/${year}/${month}`,
      {
        params: { version },
      }
    );
    return response.data;
  },

  /**
   * 月次計画スケジュールを保存
   */
  saveSchedule: async (data: SaveScheduleRequest[]): Promise<void> => {
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
    const response = await axios.get(`${API_BASE_URL}/versions/${year}/${month}`);
    return response.data;
  },

  /**
   * 月次設定を取得（その月の最大排出回数など）
   */
  fetchMonthlyConfig: async (
    year: number,
    month: number
  ): Promise<{ maxScheduleCount: number }> => {
    const response = await axios.get(`${API_BASE_URL}/config/${year}/${month}`);
    return response.data;
  },

  /**
   * 種別マスタを取得
   */
  fetchWasteTypes: async (): Promise<WasteTypeMaster[]> => {
    const response = await axios.get(`${API_BASE_URL}/waste-types`);
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
};

/**
 * 保存リクエスト型
 */
export type SaveScheduleRequest = {
  year: number;
  month: number;
  date: string; // YYYY-MM-DD形式
  scheduleOrder: number;
  wasteType: string;
  companyId: number | null;
  vol: number | null;
  plannedTime: string | null; // HH:mm形式
  note: string;
};

/**
 * 突合結果型
 */
export type MatchedData = {
  plan: {
    date: string;
    scheduleOrder: number;
    wasteType: string;
    companyId: number | null;
    vol: number | null;
    plannedTime: string | null;
  };
  actual: {
    date: string;
    actualTime: string;
    wasteType: string;
    companyId: number | null;
    vol: number | null;
  } | null;
};

