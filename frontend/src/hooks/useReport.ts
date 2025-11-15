import { useState, useCallback } from 'react';
import axios from 'axios';

export type Report = {
  id: number;
  reportNo: string;
  title: string;
  content: string;
  createdAt: string;
  createdUser: string;
  updatedAt: string;
  updatedUser: string;
};

export type CreateReportRequest = {
  title: string;
  content: string;
};

export type UpdateReportRequest = {
  reportNo: string;
  title: string;
  content: string;
};

type UseReportReturn = {
  reports: Report[];
  report: Report | null;
  loading: boolean;
  error: string | null;
  fetchReports: () => Promise<void>;
  fetchReportByReportNo: (reportNo: string) => Promise<void>;
  createReport: (request: CreateReportRequest) => Promise<Report>;
  updateReport: (request: UpdateReportRequest) => Promise<Report>;
  deleteReport: (reportNo: string) => Promise<void>;
};

export const useReport = (): UseReportReturn => {
  const [reports, setReports] = useState<Report[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * すべての報告書を取得
   */
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<Report[]>('/api/reports');
      setReports(res.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '報告書の取得に失敗しました。';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ReportNoで報告書を取得
   */
  const fetchReportByReportNo = useCallback(async (reportNo: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<Report>(`/api/reports/${reportNo}`);
      setReport(res.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '報告書の取得に失敗しました。';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 報告書を作成
   */
  const createReport = useCallback(
    async (request: CreateReportRequest): Promise<Report> => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.post<Report>('/api/reports', request);
        return res.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '報告書の作成に失敗しました。';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 報告書を更新
   */
  const updateReport = useCallback(
    async (request: UpdateReportRequest): Promise<Report> => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.put<Report>('/api/reports', request);
        return res.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '報告書の更新に失敗しました。';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 報告書を削除
   */
  const deleteReport = useCallback(async (reportNo: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`/api/reports/${reportNo}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '報告書の削除に失敗しました。';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reports,
    report,
    loading,
    error,
    fetchReports,
    fetchReportByReportNo,
    createReport,
    updateReport,
    deleteReport,
  };
};
