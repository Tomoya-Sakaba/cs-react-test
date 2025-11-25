/* ----------------------------------------------------------------
 * approvalApi.ts
 * 承認機能に関するAPI呼び出し
 * ---------------------------------------------------------------- */

import axios from 'axios';
import type {
  ApprovalStatus,
  ApprovalRequest,
  ApproveRequest,
  RejectRequest,
  RecallRequest,
} from '../types/approval';

// ============================================================================
// データ取得
// ============================================================================
/**
 * 承認状態を取得
 */
export const getApprovalStatus = async (
  approvalId: string,
  reportNo: string
): Promise<ApprovalStatus[]> => {
  const res = await axios.get<ApprovalStatus[]>('/api/approval', {
    params: {
      approvalId,
      reportNo,
    },
  });
  return res.data;
};

// ============================================================================
// アクション
// ============================================================================
/**
 * 新規上程
 */
export const createApproval = async (
  request: ApprovalRequest
): Promise<void> => {
  await axios.post('/api/approval', request);
};

/**
 * 承認
 */
export const approveApproval = async (
  request: ApproveRequest
): Promise<void> => {
  await axios.post('/api/approval/approve', request);
};

/**
 * 差し戻し
 */
export const rejectApproval = async (request: RejectRequest): Promise<void> => {
  await axios.post('/api/approval/reject', request);
};

/**
 * 再上程
 */
export const resubmitApproval = async (
  request: ApprovalRequest
): Promise<void> => {
  await axios.post('/api/approval/resubmit', request);
};

/**
 * 取り戻し
 */
export const recallApproval = async (request: RecallRequest): Promise<void> => {
  await axios.post('/api/approval/recall', request);
};
