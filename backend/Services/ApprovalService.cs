using backend.Models.DTOs;
using backend.Models.Entity;
using backend.Models.Repository;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace backend.Services
{
    public class ApprovalService
    {
        private readonly ApprovalRepository _repository = new ApprovalRepository();
        
        // メールログファイルのパス（backend/Mail/approval_mail_log.txt）
        private readonly string _mailLogPath = Path.Combine(
            Path.GetDirectoryName(Path.GetDirectoryName(AppDomain.CurrentDomain.BaseDirectory)), 
            "Mail", 
            "approval_mail_log.txt"
        );

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
            if (request == null)
            {
                throw new ArgumentException("リクエストが無効です。");
            }

            // ReportNoは必須
            if (string.IsNullOrEmpty(request.ReportNo))
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
                Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment,
                ActionDate = DateTime.Now
            };
            _repository.AddApproval(submitterApproval);

            // 承認者のレコードを作成（すべてStatus=1: 承認待ち）
            // 承認フローを順番通りに進めるため、最小FlowOrderの承認者のみが承認可能
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

            // 最初の承認者（最小FlowOrder）にメールを送信
            if (request.ApproverNames.Length > 0)
            {
                WriteMailLog(
                    request.SubmitterName, // 送信者：上程者
                    new[] { request.ApproverNames[0] }, // 宛先：最初の承認者
                    request.Comment, // コメント
                    "新規上程"
                );
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
        // 1. 承認待ち（Status=1）の場合のみ承認可能（順番通りに承認する必要がある）
        // 2. 最後の承認者の場合、Status=5（完了）に変更
        // 3. それ以外の場合、Status=2（承認済み）に変更
        // 4. 次の承認者（FlowOrderが1つ大きい）をStatus=1（承認待ち）に変更し、メールを送信
        // 
        // 差し戻し処理：
        // 1. 承認待ち（Status=1）の場合のみ差し戻し可能（順番通りに承認する必要がある）
        // 2. 差し戻しした承認者のStatusを3（差し戻し）に変更
        // 3. 差し戻しした承認者より後の承認待ち（Status=1）を削除
        //---------------------------------------------------------------------
        public void ProcessApprovalAction(ApprovalActionRequest request)
        {
            if (request == null)
            {
                throw new ArgumentException("リクエストが無効です。");
            }

            // ReportNoは必須
            if (string.IsNullOrEmpty(request.ReportNo))
            {
                throw new ArgumentException("報告書Noが必要です。");
            }

            // 現在の承認レコードを取得（reportNo、year、monthで取得）
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

            // 承認待ち（Status=1）の場合のみ承認可能
            if (currentApproval.Status != 1)
            {
                throw new InvalidOperationException("承認待ちの状態ではありません。");
            }

            // 順番通りに承認する必要がある：最小FlowOrderの承認待ち（Status=1）の承認者のみ承認可能
            var minPendingFlowOrder = allApprovals
                .Where(a => a.FlowOrder > 0 && a.Status == 1)
                .Select(a => a.FlowOrder)
                .DefaultIfEmpty(int.MaxValue)
                .Min();

            if (currentApproval.FlowOrder != minPendingFlowOrder)
            {
                throw new InvalidOperationException("順番通りに承認してください。先に前の承認者の承認が必要です。");
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

                currentApproval.Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment;
                currentApproval.ActionDate = DateTime.Now;
                _repository.UpdateApproval(currentApproval);

                // 最後の承認者でない場合、次の承認者（FlowOrderが1つ大きい）にメールを送信
                // 次の承認者は既にStatus=1（承認待ち）で作成されているため、Status変更は不要
                if (!isLastApprover)
                {
                    var nextApprover = allApprovals
                        .FirstOrDefault(a => a.FlowOrder == currentApproval.FlowOrder + 1);
                    
                    if (nextApprover != null)
                    {
                        // 次の承認者にメールを送信
                        WriteMailLog(
                            request.UserName, // 送信者：承認した承認者
                            new[] { nextApprover.UserName }, // 宛先：次の承認者
                            request.Comment, // コメント
                            "承認"
                        );
                    }
                }
            }
            else if (request.Action == "reject")
            {
                // 差し戻し処理
                currentApproval.Status = 3; // 差し戻し
                currentApproval.Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment;
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

                // 差し戻し対象者（上程者、FlowOrder=0）のレコードを取得
                var submitterApproval = allApprovals.FirstOrDefault(a => a.FlowOrder == 0);
                if (submitterApproval != null)
                {
                    // 差し戻し対象者のレコードを作成（FlowOrder = 差し戻しした承認者のFlowOrder + 1）
                    var rejectionTargetApproval = new ApprovalEntity
                    {
                        ReportNo = submitterApproval.ReportNo,
                        Year = submitterApproval.Year,
                        Month = submitterApproval.Month,
                        UserName = submitterApproval.UserName, // 元の上程者
                        FlowOrder = currentApproval.FlowOrder + 1,
                        Status = 7, // 差し戻し対象
                        Comment = null, // 差し戻し理由は差し戻しした人のコメントにあるため不要
                        ActionDate = DateTime.Now
                    };
                    _repository.AddApproval(rejectionTargetApproval);

                    // メールログを記録（差し戻しした承認者から上程者へ）
                    WriteMailLog(
                        request.UserName, // 送信者：差し戻しした承認者
                        new[] { submitterApproval.UserName }, // 宛先：上程者
                        request.Comment, // 差し戻し理由
                        "差し戻し"
                    );
                }
            }
            else
            {
                throw new ArgumentException("無効なアクションです。");
            }
        }

        //---------------------------------------------------------------------
        // 取り戻し処理
        // 
        // 処理内容：
        // 1. 上程者（FlowOrder=0, Status=0）：全レコードを削除（上程を取り消し）
        // 2. 再上程者（FlowOrder > 0, Status=0）：Status=7（差し戻し対象）に戻す、その後のレコードを削除
        // 注意：取り戻しができるのは上程者と再上程者のみ（承認者の取り戻しは不可）
        //---------------------------------------------------------------------
        public void RecallApproval(int approvalId, string userName)
        {
            // 対象のレコードを取得
            var targetApproval = _repository.GetApprovalById(approvalId);
            if (targetApproval == null)
            {
                throw new ArgumentException("対象のレコードが見つかりません。");
            }

            var allApprovals = _repository.GetApprovalsByReport(
                targetApproval.ReportNo,
                targetApproval.Year,
                targetApproval.Month
            );

            // 操作権限チェック（本人のみ取り戻し可能）
            if (targetApproval.UserName != userName)
            {
                throw new UnauthorizedAccessException("取り戻し権限がありません。");
            }

            // 上程者（FlowOrder=0, Status=0）の場合：全レコードを削除
            if (targetApproval.FlowOrder == 0 && targetApproval.Status == 0)
            {
                _repository.DeleteApprovalsByReport(
                    targetApproval.ReportNo,
                    targetApproval.Year,
                    targetApproval.Month
                );
                return;
            }

            // 再上程者（Status=0で、FlowOrder > 0）の場合
            if (targetApproval.FlowOrder > 0 && targetApproval.Status == 0)
            {
                // 再上程レコードをStatus=7（差し戻し対象）に戻す
                targetApproval.Status = 7;
                targetApproval.Comment = null;
                targetApproval.ActionDate = null;
                _repository.UpdateApproval(targetApproval);

                // その後のレコード（再上程以降）を削除
                var subsequentApprovals = allApprovals
                    .Where(a => a.FlowOrder > targetApproval.FlowOrder)
                    .ToList();

                foreach (var subsequentApproval in subsequentApprovals)
                {
                    _repository.DeleteApproval(subsequentApproval.Id);
                }
                return;
            }

            // それ以外（承認者、差し戻しなど）は取り戻し不可
            throw new InvalidOperationException("取り戻しできない状態です。");
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
            if (request == null)
            {
                throw new ArgumentException("リクエストが無効です。");
            }

            // ReportNoは必須
            if (string.IsNullOrEmpty(request.ReportNo))
            {
                throw new ArgumentException("報告書Noが必要です。");
            }

            // ReportNoを使用
            string reportNo = request.ReportNo;

            // 既存の上程データを取得
            var existingApprovals = _repository.GetApprovalsByReport(reportNo, request.Year, request.Month);
            
            if (existingApprovals.Count == 0)
            {
                throw new ArgumentException("既存の上程データが見つかりません。");
            }

            // 差し戻し対象者レコード（Status=7）を取得
            var rejectionTargetApproval = existingApprovals.FirstOrDefault(a => a.Status == 7);
            if (rejectionTargetApproval == null)
            {
                throw new InvalidOperationException("差し戻し対象者レコードが見つかりません。再上程できません。");
            }

            // 差し戻し対象者レコード以降に既に再上程があるかチェック
            // 既に再上程がある場合は、そのレコードを削除してから新しい再上程を作成
            var existingResubmissions = existingApprovals
                .Where(a => a.FlowOrder > rejectionTargetApproval.FlowOrder)
                .ToList();

            if (existingResubmissions.Any())
            {
                // 既存の再上程レコードを削除
                foreach (var resubmission in existingResubmissions)
                {
                    _repository.DeleteApproval(resubmission.Id);
                }
            }

            // 差し戻し対象者レコードを更新（再上程者に変更）
            rejectionTargetApproval.UserName = request.SubmitterName; // 再上程者
            rejectionTargetApproval.Status = 0; // 上程済み
            rejectionTargetApproval.Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment;
            rejectionTargetApproval.ActionDate = DateTime.Now;
            _repository.UpdateApproval(rejectionTargetApproval);

            // 新しい承認者を追加（すべてStatus=1: 承認待ち）
            // 承認フローを順番通りに進めるため、最小FlowOrderの承認者のみが承認可能
            int startApproverFlowOrder = rejectionTargetApproval.FlowOrder + 1;
            for (int i = 0; i < request.ApproverNames.Length; i++)
            {
                var approverApproval = new ApprovalEntity
                {
                    ReportNo = reportNo,
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

            // 最初の承認者（最小FlowOrder）にメールを送信
            if (request.ApproverNames.Length > 0)
            {
                WriteMailLog(
                    request.SubmitterName, // 送信者：再上程者
                    new[] { request.ApproverNames[0] }, // 宛先：最初の承認者
                    request.Comment, // コメント
                    "再上程"
                );
            }

            // 差し戻しまでのフローは履歴としてそのまま保持（変更なし）
        }

        //---------------------------------------------------------------------
        // メールログをファイルに書き込む
        // 
        // 処理内容：
        // 1. logsフォルダが存在しない場合は作成
        // 2. メールログファイルに追記（日時、送信者、宛先、コメントを記録）
        //---------------------------------------------------------------------
        private void WriteMailLog(string fromUser, string[] toUsers, string comment, string actionType)
        {
            try
            {
                // logsフォルダが存在しない場合は作成
                string logDirectory = Path.GetDirectoryName(_mailLogPath);
                if (!Directory.Exists(logDirectory))
                {
                    Directory.CreateDirectory(logDirectory);
                }

                // メールログの内容を構築
                var logContent = new StringBuilder();
                logContent.AppendLine("========================================");
                logContent.AppendLine($"日時: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
                logContent.AppendLine($"アクション: {actionType}");
                logContent.AppendLine($"送信者: {fromUser}");
                logContent.AppendLine($"宛先: {string.Join(", ", toUsers)}");
                logContent.AppendLine($"コメント: {comment ?? "(コメントなし)"}");
                logContent.AppendLine("========================================");
                logContent.AppendLine();

                // ファイルに追記
                File.AppendAllText(_mailLogPath, logContent.ToString(), Encoding.UTF8);
            }
            catch (Exception ex)
            {
                // ログの書き込みに失敗しても処理は続行（エラーログに記録することを推奨）
                // 本番環境では適切なログライブラリ（NLog、Serilogなど）を使用することを推奨
                System.Diagnostics.Debug.WriteLine($"メールログの書き込みに失敗しました: {ex.Message}");
            }
        }
    }
}

