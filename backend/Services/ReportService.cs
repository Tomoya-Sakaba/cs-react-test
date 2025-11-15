using backend.Models.DTOs;
using backend.Models.Entity;
using backend.Models.Repository;
using System;
using System.Collections.Generic;
using System.Linq;

namespace backend.Services
{
    public class ReportService
    {
        private readonly ReportRepository _repository = new ReportRepository();

        //---------------------------------------------------------------------
        // 報告書を作成
        //---------------------------------------------------------------------
        public ReportDto CreateReport(CreateReportRequest request, string createdUser)
        {
            if (request == null)
            {
                throw new ArgumentException("リクエストが無効です。");
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new ArgumentException("タイトルは必須です。");
            }

            // ReportNoを生成（RPT-YYYYMMDD-XXXX形式）
            string reportNo = GenerateReportNo();

            var report = new ReportEntity
            {
                ReportNo = reportNo,
                Title = request.Title,
                Content = request.Content ?? string.Empty,
                CreatedUser = createdUser,
                UpdatedUser = createdUser
            };

            _repository.AddReport(report);

            return ConvertToDto(_repository.GetReportByReportNo(reportNo));
        }

        //---------------------------------------------------------------------
        // 報告書を更新
        //---------------------------------------------------------------------
        public ReportDto UpdateReport(UpdateReportRequest request, string updatedUser)
        {
            if (request == null)
            {
                throw new ArgumentException("リクエストが無効です。");
            }

            if (string.IsNullOrWhiteSpace(request.ReportNo))
            {
                throw new ArgumentException("報告書Noが必要です。");
            }

            var existingReport = _repository.GetReportByReportNo(request.ReportNo);
            if (existingReport == null)
            {
                throw new InvalidOperationException("報告書が見つかりません。");
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                throw new ArgumentException("タイトルは必須です。");
            }

            existingReport.Title = request.Title;
            existingReport.Content = request.Content ?? string.Empty;
            existingReport.UpdatedUser = updatedUser;

            _repository.UpdateReport(existingReport);

            return ConvertToDto(_repository.GetReportByReportNo(request.ReportNo));
        }

        //---------------------------------------------------------------------
        // ReportNoで報告書を取得
        //---------------------------------------------------------------------
        public ReportDto GetReportByReportNo(string reportNo)
        {
            if (string.IsNullOrWhiteSpace(reportNo))
            {
                throw new ArgumentException("報告書Noが必要です。");
            }

            var report = _repository.GetReportByReportNo(reportNo);
            if (report == null)
            {
                throw new InvalidOperationException("報告書が見つかりません。");
            }

            return ConvertToDto(report);
        }

        //---------------------------------------------------------------------
        // すべての報告書を取得（一覧用）
        //---------------------------------------------------------------------
        public List<ReportDto> GetAllReports()
        {
            var reports = _repository.GetAllReports();
            return reports.Select(r => ConvertToDto(r)).ToList();
        }

        //---------------------------------------------------------------------
        // 報告書を削除
        //---------------------------------------------------------------------
        public void DeleteReport(string reportNo)
        {
            if (string.IsNullOrWhiteSpace(reportNo))
            {
                throw new ArgumentException("報告書Noが必要です。");
            }

            var existingReport = _repository.GetReportByReportNo(reportNo);
            if (existingReport == null)
            {
                throw new InvalidOperationException("報告書が見つかりません。");
            }

            _repository.DeleteReport(reportNo);
        }

        //---------------------------------------------------------------------
        // ReportNoを生成（RPT-YYYYMMDD-XXXX形式）
        //---------------------------------------------------------------------
        private string GenerateReportNo()
        {
            // すべての報告書数を取得して連番を生成
            var existingReports = _repository.GetAllReports();
            int sequence = existingReports.Count + 1;

            // 現在の日付を取得（YYYYMMDD形式）
            string dateStr = DateTime.Now.ToString("yyyyMMdd");

            return $"RPT-{dateStr}-{sequence:D4}";
        }

        //---------------------------------------------------------------------
        // EntityをDtoに変換
        //---------------------------------------------------------------------
        private ReportDto ConvertToDto(ReportEntity entity)
        {
            if (entity == null) return null;

            return new ReportDto
            {
                Id = entity.Id,
                ReportNo = entity.ReportNo,
                Title = entity.Title,
                Content = entity.Content,
                CreatedAt = entity.CreatedAt,
                CreatedUser = entity.CreatedUser,
                UpdatedAt = entity.UpdatedAt,
                UpdatedUser = entity.UpdatedUser
            };
        }
    }
}

