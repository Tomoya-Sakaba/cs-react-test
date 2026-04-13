using System;
using System.Collections.Generic;
using System.Globalization;
using System.Configuration;
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

        /// <summary>
        /// マッピングJSONを読み込む（引数は基本「JSONファイル名」）。
        /// Web.config の <c>GemBoxPrintMappingsBasePath</c> をベースに物理パスへ解決して読み込む。
        /// </summary>
        public static GemBoxPrintMappingDefinition LoadDefinition(string mappingFileName, out string resolvedPath)
        {
            resolvedPath = null;

            if (string.IsNullOrWhiteSpace(mappingFileName))
                return null;

            // 絶対パスで渡された場合はそのまま
            if (Path.IsPathRooted(mappingFileName))
            {
                resolvedPath = mappingFileName;
            }
            else
            {
                // ファイル名のみ運用（Web.config の base + ファイル名）
                var configured = (ConfigurationManager.AppSettings["GemBoxPrintMappingsBasePath"] ?? "").Trim();
                if (string.IsNullOrWhiteSpace(configured))
                    configured = "~/common/print-mappings";

                var baseDir = Path.IsPathRooted(configured)
                    ? configured
                    : (HostingEnvironment.MapPath(configured) ?? "");

                baseDir = baseDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                resolvedPath = Path.Combine(baseDir, mappingFileName);
            }

            if (string.IsNullOrWhiteSpace(resolvedPath) || !File.Exists(resolvedPath))
                return null;
            var json = File.ReadAllText(resolvedPath);
            return JsonConvert.DeserializeObject<GemBoxPrintMappingDefinition>(json);
        }

        public static GemBoxPrintMappingDefinition LoadDefinition(string mappingFileName)
        {
            return LoadDefinition(mappingFileName, out _);
        }


        /// <summary>
        /// マッピング定義とデータソース（単票・画像・テーブル）から backend-print 用 DTO を汎用的に組み立てる。
        /// - scalars: def.Scalars の excelKey/dbColumn を scalarSource から解決して Data に入れる
        /// - pictures: def.Pictures の key（Excel の {{key}}）/ dbColumn（pictureSource 側のキー）を解決し DTO.Pictures に入れ、埋め込み用に Data にも同じキーを複製する（pictureSource が null のときは空）
        /// - tables: def.Tables[].columns を tableRowSourcesByKey[tableKey] の各行から解決して Tables に入れる
        /// </summary>
        public static GemBoxPrintRequestDto BuildRequest(
            GemBoxPrintMappingDefinition def,
            object scalarSource,
            object pictureSource,
            IDictionary<string, IEnumerable<object>> tableRowSourcesByKey)
        {
            if (def == null) return null;

            var data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            if (def.Scalars != null)
            {
                foreach (var item in def.Scalars)
                {
                    if (string.IsNullOrWhiteSpace(item?.ExcelKey)) continue;
                    var key = item.ExcelKey.Trim();
                    if (string.IsNullOrWhiteSpace(item.DbColumn))
                    {
                        data[key] = "";
                        continue;
                    }
                    var raw = GetValueFromSource(scalarSource, item.DbColumn.Trim());
                    data[key] = FormatScalar(raw);
                }
            }

            var tables = new Dictionary<string, List<Dictionary<string, object>>>(StringComparer.OrdinalIgnoreCase);
            if (def.Tables != null)
            {
                foreach (var t in def.Tables)
                {
                    if (string.IsNullOrWhiteSpace(t?.TableKey)) continue;
                    var tableKey = t.TableKey.Trim();

                    // テーブル行ソース（repository等）を優先し、無ければ JSON の rows（デモ/固定値）を使う
                    var sources = (tableRowSourcesByKey != null && tableRowSourcesByKey.TryGetValue(tableKey, out var s))
                        ? (s ?? Enumerable.Empty<object>())
                        : null;

                    if (sources == null)
                    {
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
                        tables[tableKey] = list;
                        continue;
                    }

                    if (t.Columns == null || t.Columns.Count == 0)
                        throw new InvalidOperationException($"テーブル '{tableKey}' の columns 定義がありません。");

                    var mappedRows = new List<Dictionary<string, object>>();
                    foreach (var srcRow in sources)
                    {
                        if (srcRow == null) continue;
                        var mapped = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                        foreach (var col in t.Columns)
                        {
                            if (string.IsNullOrWhiteSpace(col?.Field)) continue;
                            var field = col.Field.Trim();
                            if (string.IsNullOrWhiteSpace(col.DbColumn))
                            {
                                mapped[field] = "";
                                continue;
                            }
                            var raw = GetValueFromSource(srcRow, col.DbColumn.Trim());
                            mapped[field] = FormatScalar(raw);
                        }
                        mappedRows.Add(mapped);
                    }
                    tables[tableKey] = mappedRows;
                }
            }

            var pictures = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (def.Pictures != null)
            {
                foreach (var p in def.Pictures)
                {
                    if (string.IsNullOrWhiteSpace(p?.Key)) continue;
                    var key = p.Key.Trim();
                    if (string.IsNullOrWhiteSpace(p.DbColumn))
                    {
                        pictures[key] = "";
                        continue;
                    }
                    var raw = GetValueFromSource(pictureSource, p.DbColumn.Trim());
                    pictures[key] = raw == null
                        ? ""
                        : Convert.ToString(raw, CultureInfo.InvariantCulture) ?? "";
                }
            }

            var download = def.DownloadFileNamePattern ?? "document.pdf";
            download = ReplaceDownloadPattern(download, data);

            return new GemBoxPrintRequestDto
            {
                TemplateFileName = def.TemplateFileName ?? "document.xlsx",
                DownloadFileName = download,
                Data = data,
                Tables = tables,
                Pictures = pictures
            };
        }

        /// <summary>
        /// JSON定義（now / literal と tables.rows）だけで DTO を組み立てる（デモ用）。
        /// entity 参照は行わない。
        /// </summary>
        public static string ReplaceDownloadPattern(string pattern, Dictionary<string, object> data)
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

        private static object GetValueFromSource(object source, string dbColumn)
        {
            if (source == null || string.IsNullOrWhiteSpace(dbColumn)) return null;

            // 1) 既に辞書で来ている場合（Repository側で snake_case をキーにして返す運用にも対応）
            if (source is IDictionary<string, object> dict)
            {
                // dbColumn をそのままキーとして引く（大小文字は無視）
                foreach (var kv in dict)
                {
                    if (string.Equals(kv.Key, dbColumn, StringComparison.OrdinalIgnoreCase))
                        return kv.Value;
                }
                return null;
            }

            // 2) Entity 等のオブジェクトの場合（snake_case → PascalCase に変換して reflection）
            if (source is EquipmentEntity entity)
            {
                var propName = DbColumnToPropertyName(dbColumn);
                return GetPropertyValue(entity, propName);
            }

            // 3) その他オブジェクト（parts/linked の行など）も同様に reflection で拾う
            var t = source.GetType();
            var prop = t.GetProperty(DbColumnToPropertyName(dbColumn), BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            return prop?.GetValue(source);
        }

        private static string FormatScalar(object raw)
        {
            if (raw == null) return "";
            if (raw is DateTime dt)
                return dt.ToString("yyyy/MM/dd HH:mm", CultureInfo.InvariantCulture);
            if (raw is bool b) return b ? "true" : "false";
            return Convert.ToString(raw, CultureInfo.InvariantCulture) ?? "";
        }
    }
}
