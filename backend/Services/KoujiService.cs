using System;
using System.Collections.Generic;
using System.Linq;
using backend.Models.DTOs;
using backend.Models.Repository;

namespace backend.Services
{
    public class KoujiService
    {
        private readonly KoujiRepository _repository = new KoujiRepository();

        public List<KoujiDto> GetList(bool includeInactive = false)
        {
            var entities = _repository.GetAll(includeInactive);
            return entities.Select(e => new KoujiDto
            {
                KoujiId = e.KoujiId,
                KoujiName = e.KoujiName,
                CycleYears = e.CycleYears,
                CycleTimes = e.CycleTimes,
                IsActive = e.IsActive
            }).ToList();
        }

        public List<KoujiMonthlyDto> GetFiscalYearMonthly(int fiscalYearStartYear)
        {
            // 年度: 4月〜翌年3月
            var from = fiscalYearStartYear * 100 + 4;
            var to = (fiscalYearStartYear + 1) * 100 + 3;
            var rows = _repository.GetMonthlyByYyyymmRange(from, to);
            return rows.Select(r => new KoujiMonthlyDto
            {
                KoujiId = r.KoujiId,
                Yyyymm = r.Yyyymm,
                Type = r.Type == 1 ? "actual" : "budget",
                Amount = r.Amount
            }).ToList();
        }

        public void UpsertMonthly(UpsertKoujiMonthlyRequestDto req)
        {
            if (req == null) throw new ArgumentException("リクエストが空です。");
            if (req.KoujiId <= 0) throw new ArgumentException("koujiId が不正です。");
            if (req.Yyyymm < 190001 || req.Yyyymm > 299912) throw new ArgumentException("yyyymm が不正です。");

            var type = ParseType(req.Type);
            _repository.UpsertMonthly(req.KoujiId, req.Yyyymm, type, req.Amount);
        }

        public void DeleteMonthly(int koujiId, int yyyymm, string type)
        {
            if (koujiId <= 0) throw new ArgumentException("koujiId が不正です。");
            if (yyyymm < 190001 || yyyymm > 299912) throw new ArgumentException("yyyymm が不正です。");
            var t = ParseType(type);
            _repository.DeleteMonthly(koujiId, yyyymm, t);
        }

        private static byte ParseType(string type)
        {
            var t = (type ?? "").Trim().ToLowerInvariant();
            if (t == "budget") return 0;
            if (t == "actual") return 1;
            throw new ArgumentException("type は 'budget' または 'actual' です。");
        }
    }
}

