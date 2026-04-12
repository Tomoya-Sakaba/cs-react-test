using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Web.Hosting;
using backend.Models.Config;
using backend.Models.DTOs;
using backend.Models.Entities;
using Newtonsoft.Json;

namespace backend.Services
{
    /// <summary>
    /// JSONマッピング定義を読み込み、EquipmentEntity から GemBoxPrintRequestDto を組み立てる。
    /// </summary>
    public static class GemBoxPrintMappingEngine
    {
        private static readonly Regex PlaceholderPattern = new Regex(@"\{([a-zA-Z0-9_]+)\}", RegexOptions.Compiled);

        /// <summary>
        /// マッピングファイルの既定パス（Web.config で上書き可）
        /// </summary>
        public const string DefaultRelativeMappingPath = "~/common/print-mappings/equipment_gembox.json";

        public static GemBoxPrintMappingDefinition LoadDefinition(string absolutePath)
        {
            if (string.IsNullOrWhiteSpace(absolutePath) || !File.Exists(absolutePath))
                return null;
            var json = File.ReadAllText(absolutePath);
            return JsonConvert.DeserializeObject<GemBoxPrintMappingDefinition>(json);
        }

        public static string ResolveMappingFilePath()
        {
            var configured = System.Configuration.ConfigurationManager.AppSettings["GemBoxPrintMappingFile"]
                ?? "";
            if (!string.IsNullOrWhiteSpace(configured))
            {
                if (Path.IsPathRooted(configured))
                    return configured;
                return HostingEnvironment.MapPath(configured);
            }
            return HostingEnvironment.MapPath(DefaultRelativeMappingPath);
        }

        /// <summary>
        /// 一覧用マッピング（既定: ~/common/print-mappings/equipment_list_gembox.json）
        /// </summary>
        public static string ResolveEquipmentListMappingFilePath()
        {
            var configured = System.Configuration.ConfigurationManager.AppSettings["GemBoxEquipmentListMappingFile"]
                ?? "";
            if (!string.IsNullOrWhiteSpace(configured))
            {
                if (Path.IsPathRooted(configured))
                    return configured;
                return HostingEnvironment.MapPath(configured);
            }
            return HostingEnvironment.MapPath("~/common/print-mappings/equipment_list_gembox.json");
        }

        /// <summary>
        /// 機器詳細（部品・関連機器テーブル付き）既定: ~/common/print-mappings/equipment_detail_gembox.json
        /// </summary>
        public static string ResolveEquipmentDetailMappingFilePath()
        {
            var configured = System.Configuration.ConfigurationManager.AppSettings["GemBoxEquipmentDetailMappingFile"]
                ?? "";
            if (!string.IsNullOrWhiteSpace(configured))
            {
                if (Path.IsPathRooted(configured))
                    return configured;
                return HostingEnvironment.MapPath(configured);
            }
            return HostingEnvironment.MapPath("~/common/print-mappings/equipment_detail_gembox.json");
        }

        /// <summary>
        /// 機器一覧。ヘッダは scalars（now / literal のみ）、明細は DB の全件を <paramref name="tableKey"/> テーブルに展開する。
        /// </summary>
        public static GemBoxPrintRequestDto BuildEquipmentListRequest(
            IEnumerable<EquipmentEntity> entities,
            GemBoxPrintMappingDefinition def)
        {
            if (def == null) return null;

            var data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            if (def.Scalars != null)
            {
                foreach (var item in def.Scalars)
                {
                    if (string.IsNullOrWhiteSpace(item?.ExcelKey)) continue;
                    var key = item.ExcelKey.Trim();
                    var src = (item.Source ?? "").Trim().ToLowerInvariant();
                    switch (src)
                    {
                        case "now":
                            data[key] = string.IsNullOrWhiteSpace(item.Format)
                                ? DateTime.Now.ToString("yyyy/MM/dd", CultureInfo.InvariantCulture)
                                : DateTime.Now.ToString(item.Format, CultureInfo.InvariantCulture);
                            break;
                        case "literal":
                            data[key] = item.Value ?? "";
                            break;
                        default:
                            data[key] = "";
                            break;
                    }
                }
            }

            var rows = new List<Dictionary<string, object>>();
            if (entities != null)
            {
                foreach (var e in entities)
                {
                    if (e == null) continue;
                    rows.Add(new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["equipment_id"] = e.EquipmentId,
                        ["equipment_code"] = e.EquipmentCode ?? "",
                        ["equipment_name"] = e.EquipmentName ?? "",
                        ["category"] = e.Category ?? "",
                        ["manufacturer"] = e.Manufacturer ?? "",
                        ["model"] = e.Model ?? "",
                        ["location"] = e.Location ?? "",
                        ["note"] = e.Note ?? "",
                        ["updated_at"] = FormatScalar(e.UpdatedAt, "yyyy/MM/dd HH:mm"),
                    });
                }
            }

            var tableKey = "items";
            if (def.Tables != null && def.Tables.Count > 0 && !string.IsNullOrWhiteSpace(def.Tables[0].TableKey))
                tableKey = def.Tables[0].TableKey.Trim();

            var tables = new Dictionary<string, List<Dictionary<string, object>>>(StringComparer.OrdinalIgnoreCase)
            {
                [tableKey] = rows
            };

            var download = def.DownloadFileNamePattern ?? "equipment_list_gembox.pdf";
            download = ReplaceDownloadPattern(download, data);

            return new GemBoxPrintRequestDto
            {
                TemplateFileName = def.TemplateFileName ?? "equipment_list.xlsx",
                DownloadFileName = download,
                Data = data,
                Tables = tables
            };
        }

        public static GemBoxPrintRequestDto BuildEquipmentRequest(EquipmentEntity entity, GemBoxPrintMappingDefinition def)
        {
            if (entity == null || def == null) return null;

            var data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            if (def.Scalars != null)
            {
                foreach (var item in def.Scalars)
                {
                    if (string.IsNullOrWhiteSpace(item?.ExcelKey)) continue;
                    var key = item.ExcelKey.Trim();
                    var src = (item.Source ?? "").Trim().ToLowerInvariant();

                    switch (src)
                    {
                        case "now":
                            data[key] = string.IsNullOrWhiteSpace(item.Format)
                                ? DateTime.Now.ToString("yyyy/MM/dd", CultureInfo.InvariantCulture)
                                : DateTime.Now.ToString(item.Format, CultureInfo.InvariantCulture);
                            break;
                        case "literal":
                            data[key] = item.Value ?? "";
                            break;
                        case "entity":
                        default:
                            if (string.IsNullOrWhiteSpace(item.DbColumn))
                            {
                                data[key] = "";
                                break;
                            }
                            var propName = DbColumnToPropertyName(item.DbColumn.Trim());
                            var raw = GetPropertyValue(entity, propName);
                            data[key] = FormatScalar(raw, item.Format);
                            break;
                    }
                }
            }

            var tables = new Dictionary<string, List<Dictionary<string, object>>>(StringComparer.OrdinalIgnoreCase);
            if (def.Tables != null)
            {
                foreach (var t in def.Tables)
                {
                    if (string.IsNullOrWhiteSpace(t?.TableKey)) continue;
                    var list = new List<Dictionary<string, object>>();
                    if (t.Rows != null)
                    {
                        foreach (var row in t.Rows)
                        {
                            if (row == null) continue;
                            var d = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                            foreach (var kv in row)
                                d[kv.Key] = kv.Value ?? "";
                            list.Add(d);
                        }
                    }
                    tables[t.TableKey.Trim()] = list;
                }
            }

            var download = def.DownloadFileNamePattern ?? "document.pdf";
            download = ReplaceDownloadPattern(download, data);

            return new GemBoxPrintRequestDto
            {
                TemplateFileName = def.TemplateFileName ?? "equipment_master.xlsx",
                DownloadFileName = download,
                Data = data,
                Tables = tables
            };
        }

        private static string ReplaceDownloadPattern(string pattern, Dictionary<string, object> data)
        {
            return PlaceholderPattern.Replace(pattern, m =>
            {
                var key = m.Groups[1].Value;
                if (data != null && data.TryGetValue(key, out var v) && v != null)
                    return v.ToString();
                return "";
            });
        }

        /// <summary>
        /// DBの snake_case カラム名を EquipmentEntity のプロパティ名に変換（例: equipment_code → EquipmentCode）
        /// </summary>
        public static string DbColumnToPropertyName(string dbColumn)
        {
            if (string.IsNullOrWhiteSpace(dbColumn)) return null;
            var parts = dbColumn.Split(new[] { '_' }, StringSplitOptions.RemoveEmptyEntries);
            return string.Concat(parts.Select(p =>
                p.Length == 0 ? "" : char.ToUpperInvariant(p[0]) + (p.Length > 1 ? p.Substring(1).ToLowerInvariant() : "")));
        }

        private static object GetPropertyValue(EquipmentEntity entity, string propertyName)
        {
            if (entity == null || string.IsNullOrWhiteSpace(propertyName)) return null;
            var t = typeof(EquipmentEntity);
            var prop = t.GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            return prop?.GetValue(entity);
        }

        private static string FormatScalar(object raw, string format)
        {
            if (raw == null) return "";
            if (raw is DateTime dt)
                return string.IsNullOrWhiteSpace(format)
                    ? dt.ToString("yyyy/MM/dd HH:mm", CultureInfo.InvariantCulture)
                    : dt.ToString(format, CultureInfo.InvariantCulture);
            if (raw is bool b) return b ? "true" : "false";
            return Convert.ToString(raw, CultureInfo.InvariantCulture) ?? "";
        }
    }
}
