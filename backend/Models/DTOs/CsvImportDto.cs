using System.Collections.Generic;

namespace backend.Models.DTOs
{
    /// <summary>
    /// CSV取り込み結果DTO
    /// </summary>
    public class CsvImportResultDto
    {
        public List<string> Errors { get; set; }
        public string Message { get; set; }

        public CsvImportResultDto()
        {
            Errors = new List<string>();
        }
    }

    /// <summary>
    /// CSV行データDTO（t_results用）
    /// </summary>
    public class ResultCsvRowDto
    {
        public string Date { get; set; }           // 日付
        public string ContentTypeId { get; set; }  // コンテンツタイプ
        public string Vol { get; set; }            // 量
        public string CompanyId { get; set; }      // 企業ID
        public string CompanyName { get; set; }    // 企業名
    }
}

