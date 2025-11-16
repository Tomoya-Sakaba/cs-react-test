using backend.Models.DTOs;
using backend.Models.Entity;
using backend.Models.Repository;
using backend.Utils;
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

            // ReportNoを生成（プレフィックス年度月配番形式）
            // 年度開始月が指定されていない場合は4月をデフォルトとする
            // プレフィックスが指定されていない場合は"RPT"をデフォルトとする
            int fiscalYearStartMonth = request.FiscalYearStartMonth ?? 4;
            string prefix = string.IsNullOrWhiteSpace(request.ReportNoPrefix) ? "RPT" : request.ReportNoPrefix;
            
            // 既存レポートを取得してReportNoを生成
            var existingReports = _repository.GetAllReports();
            string reportNo = ReportNoGenerator.GenerateReportNo(fiscalYearStartMonth, prefix, existingReports);

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

