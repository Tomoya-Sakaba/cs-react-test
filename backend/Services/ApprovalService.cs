using backend.Models.DTOs;
using backend.Models.Entity;
using backend.Models.Repository;
using System;
using System.Collections.Generic;
using System.Linq;

namespace backend.Services
{
    public class ApprovalService
    {
        private readonly ApprovalRepository _repository = new ApprovalRepository();

        //---------------------------------------------------------------------
        // 上程データを作成
        // 
        // 処理内容：
        // 1. 上程者のレコードを作成（FlowOrder=0, Status=0）
        // 2. 選択した承認者のレコードを作成（FlowOrder=1,2,3..., Status=1）
        // 3. 最初の承認者が承認待ちの状態になる
        //---------------------------------------------------------------------
        public void CreateApproval(CreateApprovalRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.ReportNo))
            {
                throw new ArgumentException("報告書Noが必要です。");
            }

            if (request.ApproverNames == null || request.ApproverNames.Length == 0)
            {
                throw new ArgumentException("承認者を1人以上選択してください。");
            }

            // 上程者のレコードを作成（FlowOrder=0, Status=0）
            var submitterApproval = new ApprovalEntity
            {
                ReportNo = request.ReportNo,
                Year = request.Year,
                Month = request.Month,
                UserName = request.SubmitterName,
                FlowOrder = 0,
                Status = 0, // 上程済み
                Comment = request.Comment,
                ActionDate = DateTime.Now
            };
            _repository.AddApproval(submitterApproval);

            // 承認者のレコードを作成（FlowOrder=1,2,3..., Status=1）
            for (int i = 0; i < request.ApproverNames.Length; i++)
            {
                var approverApproval = new ApprovalEntity
                {
                    ReportNo = request.ReportNo,
                    Year = request.Year,
                    Month = request.Month,
                    UserName = request.ApproverNames[i],
                    FlowOrder = i + 1,
                    Status = 1, // 承認待ち
                    Comment = null,
                    ActionDate = null
                };
                _repository.AddApproval(approverApproval);
            }
        }

        //---------------------------------------------------------------------
        // 報告書No、年、月で上程データを取得
        //---------------------------------------------------------------------
        public List<ApprovalDto> GetApprovalsByReport(string reportNo, int year, int month)
        {
            var entities = _repository.GetApprovalsByReport(reportNo, year, month);
            return entities.Select(e => new ApprovalDto
            {
                Id = e.Id,
                ReportNo = e.ReportNo,
                Year = e.Year,
                Month = e.Month,
                UserName = e.UserName,
                FlowOrder = e.FlowOrder,
                Status = e.Status,
                Comment = e.Comment,
                ActionDate = e.ActionDate,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            }).ToList();
        }

        //---------------------------------------------------------------------
        // ユーザー名で承認待ちの上程データを取得
        //---------------------------------------------------------------------
        public List<ApprovalDto> GetPendingApprovalsByUser(string userName)
        {
            var entities = _repository.GetPendingApprovalsByUser(userName);
            return entities.Select(e => new ApprovalDto
            {
                Id = e.Id,
                ReportNo = e.ReportNo,
                Year = e.Year,
                Month = e.Month,
                UserName = e.UserName,
                FlowOrder = e.FlowOrder,
                Status = e.Status,
                Comment = e.Comment,
                ActionDate = e.ActionDate,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            }).ToList();
        }

        //---------------------------------------------------------------------
        // 承認アクション（承認または差し戻し）
        // 
        // 承認処理：
        // 1. 承認待ち（Status=1）または承認スキップ（Status=6）の場合のみ承認可能
        // 2. 最後の承認者の場合、Status=5（完了）に変更
        // 3. それ以外の場合、Status=2（承認済み）に変更
        // 4. 承認した承認者より前の承認待ち（Status=1）を承認スキップ（Status=6）に変更
        // 
        // 差し戻し処理：
        // 1. 承認待ち（Status=1）または承認スキップ（Status=6）の場合のみ差し戻し可能
        // 2. 差し戻しした承認者のStatusを3（差し戻し）に変更
        // 3. 差し戻しした承認者より後の承認待ち（Status=1）を削除
        // 4. 差し戻しした承認者より前の承認待ち（Status=1）を承認スキップ（Status=6）に変更
        //---------------------------------------------------------------------
        public void ProcessApprovalAction(ApprovalActionRequest request)
        {
            if (request == null)
            {
                throw new ArgumentException("リクエストが無効です。");
            }

            // 現在の承認レコードを取得
            var allApprovals = _repository.GetApprovalsByReport(request.ReportNo, request.Year, request.Month);
            var currentApproval = allApprovals.FirstOrDefault(a => a.Id == request.Id);

            if (currentApproval == null)
            {
                throw new ArgumentException("承認レコードが見つかりません。");
            }

            if (currentApproval.UserName != request.UserName)
            {
                throw new UnauthorizedAccessException("この承認はあなたのものではありません。");
            }

            // 承認待ち（Status=1）または承認スキップ（Status=6）の場合のみ承認可能
            if (currentApproval.Status != 1 && currentApproval.Status != 6)
            {
                throw new InvalidOperationException("承認待ちまたは承認スキップの状態ではありません。");
            }

            if (request.Action == "approve")
            {
                // 次の承認者がいるかチェック（現在の承認者の次のFlowOrderを確認）
                var maxFlowOrder = allApprovals.Max(a => a.FlowOrder);
                var isLastApprover = currentApproval.FlowOrder >= maxFlowOrder;

                if (isLastApprover)
                {
                    // 最後の承認者だった場合、完了フラグを立てる（Status=5: 完了）
                    currentApproval.Status = 5; // 完了
                }
                else
                {
                    // 最後の承認者でない場合、承認済み（Status=2）
                    currentApproval.Status = 2; // 承認済み
                }

                currentApproval.Comment = request.Comment;
                currentApproval.ActionDate = DateTime.Now;
                _repository.UpdateApproval(currentApproval);

                // 承認した承認者より前の承認待ち（Status=1）の承認者を承認スキップ（Status=6）に変更
                // これにより、後続の承認者が承認したため、前の承認待ちがスキップされたことを明確にする
                var pendingApprovalsBeforeApproval = allApprovals
                    .Where(a => a.FlowOrder > 0 && 
                                a.FlowOrder < currentApproval.FlowOrder && 
                                a.Status == 1) // 承認待ちのみ
                    .ToList();

                foreach (var pendingApproval in pendingApprovalsBeforeApproval)
                {
                    pendingApproval.Status = 6; // 承認スキップ
                    _repository.UpdateApproval(pendingApproval);
                }
            }
            else if (request.Action == "reject")
            {
                // 差し戻し処理
                currentApproval.Status = 3; // 差し戻し
                currentApproval.Comment = request.Comment;
                currentApproval.ActionDate = DateTime.Now;
                _repository.UpdateApproval(currentApproval);

                // 差し戻しの場合、以降の承認者（まだ承認待ちの状態）を削除
                // これにより、フローの最後が差し戻しのレコードになり、再上程が可能になる
                var subsequentApprovals = allApprovals
                    .Where(a => a.FlowOrder > currentApproval.FlowOrder)
                    .ToList();

                foreach (var subsequentApproval in subsequentApprovals)
                {
                    _repository.DeleteApproval(subsequentApproval.Id);
                }

                // 差し戻しした承認者より前の承認待ち（Status=1）の承認者を承認スキップ（Status=6）に変更
                // これにより、後続の承認者が差し戻ししたため、前の承認待ちがスキップされたことを明確にする
                var pendingApprovalsBeforeRejection = allApprovals
                    .Where(a => a.FlowOrder > 0 && 
                                a.FlowOrder < currentApproval.FlowOrder && 
                                a.Status == 1) // 承認待ちのみ
                    .ToList();

                foreach (var pendingApproval in pendingApprovalsBeforeRejection)
                {
                    pendingApproval.Status = 6; // 承認スキップ
                    _repository.UpdateApproval(pendingApproval);
                }
            }
            else
            {
                throw new ArgumentException("無効なアクションです。");
            }
        }

        //---------------------------------------------------------------------
        // 再上程処理（差し戻し後の再提出）
        // 
        // 処理内容：
        // 1. 最新の差し戻し（最大FlowOrderのStatus=3）を取得
        // 2. 既存の再上程がある場合、削除してから新しい再上程を作成
        // 3. 最新の差し戻しのFlowOrderの次のFlowOrderに、新しい上程者のレコードを作成（Status=0）
        // 4. 選択した承認者のレコードを作成（Status=1）
        // 
        // 注意：
        // - 差し戻しまでのフローは履歴として保持（変更なし）
        // - 再上程の上程者は、ログインユーザーが自動的に設定される
        //---------------------------------------------------------------------
        public void ResubmitApproval(CreateApprovalRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.ReportNo))
            {
                throw new ArgumentException("報告書Noが必要です。");
            }

            // 既存の上程データを取得
            var existingApprovals = _repository.GetApprovalsByReport(request.ReportNo, request.Year, request.Month);
            
            if (existingApprovals.Count == 0)
            {
                throw new ArgumentException("既存の上程データが見つかりません。");
            }

            // 差し戻しが発生しているかチェック（最新の差し戻しを取得：最大FlowOrder）
            var rejectedApprovals = existingApprovals.Where(a => a.Status == 3).ToList();
            if (rejectedApprovals.Count == 0)
            {
                throw new InvalidOperationException("差し戻しが発生していないため、再上程できません。");
            }

            // 最新の差し戻し（最大FlowOrder）を取得
            var rejectedApproval = rejectedApprovals.OrderByDescending(a => a.FlowOrder).First();
            
            // 差し戻しされた承認者のFlowOrderを取得（これが現在の最大FlowOrder）
            int rejectedFlowOrder = rejectedApproval.FlowOrder;

            // 差し戻しされた承認者以降に既に再上程があるかチェック
            // 既に再上程がある場合は、そのレコードを削除してから新しい再上程を作成
            var existingResubmissions = existingApprovals
                .Where(a => a.FlowOrder > rejectedFlowOrder)
                .ToList();

            if (existingResubmissions.Any())
            {
                // 既存の再上程レコードを削除
                foreach (var resubmission in existingResubmissions)
                {
                    _repository.DeleteApproval(resubmission.Id);
                }
            }

            // 新しい上程者を追加（最新の差し戻しの次のFlowOrder）
            int newSubmitterFlowOrder = rejectedFlowOrder + 1;
            var newSubmitterApproval = new ApprovalEntity
            {
                ReportNo = request.ReportNo,
                Year = request.Year,
                Month = request.Month,
                UserName = request.SubmitterName,
                FlowOrder = newSubmitterFlowOrder,
                Status = 0, // 上程済み
                Comment = request.Comment,
                ActionDate = DateTime.Now
            };
            _repository.AddApproval(newSubmitterApproval);

            // 新しい承認者を追加
            int startApproverFlowOrder = newSubmitterFlowOrder + 1;
            for (int i = 0; i < request.ApproverNames.Length; i++)
            {
                var approverApproval = new ApprovalEntity
                {
                    ReportNo = request.ReportNo,
                    Year = request.Year,
                    Month = request.Month,
                    UserName = request.ApproverNames[i],
                    FlowOrder = startApproverFlowOrder + i,
                    Status = 1, // 承認待ち
                    Comment = null,
                    ActionDate = null
                };
                _repository.AddApproval(approverApproval);
            }

            // 差し戻しまでのフローは履歴としてそのまま保持（変更なし）
        }
    }
}

