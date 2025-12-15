import axios from 'axios';

export interface CsvImportResult {
  errors: string[];
  message: string;
}

export interface ResultEntity {
  id: number;
  date: string;
  time: string | null;
  contentTypeId: number;
  vol: number | null;
  companyId: number | null;
  companyName: string | null;
  createdAt: string;
  createdUser: string;
}

export const csvApi = {
  /**
   * t_results用のCSVファイルをアップロード（通常版：1行ずつ挿入）
   */
  async importResultsCsv(file: File): Promise<CsvImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<CsvImportResult>(
        '/api/csv/import/results',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('CSV取り込みエラー:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  },

  /**
   * t_results用のCSVファイルをアップロード（バルクインサート版：一括挿入）
   * 大量データに適しているが、エラー時は全てロールバックされる
   */
  async importResultsCsvBulk(file: File): Promise<CsvImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<CsvImportResult>(
        '/api/csv/import/results/bulk',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('CSV取り込みエラー（バルク）:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  },

  /**
   * t_results用のCSVファイルをアップロード（SqlBulkCopy版：本物のBULK INSERT）
   * SQL ServerのネイティブBULK INSERT機能を使用。最も高速（10万件以上に最適）
   */
  async importResultsCsvBulkCopy(file: File): Promise<CsvImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<CsvImportResult>(
        '/api/csv/import/results/bulkcopy',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('CSV取り込みエラー（BulkCopy）:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  },

  /**
   * 全ての結果データを取得
   */
  async getAllResults(): Promise<ResultEntity[]> {
    try {
      const response = await axios.get<ResultEntity[]>('/api/csv/results');
      return response.data;
    } catch (error) {
      console.error('結果データ取得エラー:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  },

  /**
   * 全ての結果データを削除（テスト用）
   */
  async deleteAllResults(): Promise<void> {
    try {
      await axios.delete('/api/csv/results');
    } catch (error) {
      console.error('結果データ削除エラー:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  },

  /**
   * t_results用のExcelファイルをアップロード（SqlBulkCopy版）
   * SQL ServerのネイティブBULK INSERT機能を使用
   */
  async importResultsExcel(file: File): Promise<CsvImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<CsvImportResult>(
        '/api/excel/import/results',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Excel取り込みエラー:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
      throw error;
    }
  },
};

