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

            // マッピングは「ファイル名（または base 配下の相対パス）」のみ運用する。
            // 物理パスは Web.config の base（GemBoxPrintMappingsBasePath）から解決する。
            var configured = (ConfigurationManager.AppSettings["GemBoxPrintMappingsBasePath"] ?? "").Trim();
            if (string.IsNullOrWhiteSpace(configured))
                configured = "~/common/print-mappings";

            // 物理パスか仮想パスかを判定(物理パスの場合はそのまま)
            var baseDir = Path.IsPathRooted(configured)
                ? configured
                : (HostingEnvironment.MapPath(configured) ?? "");

            // パスの末尾の区切り文字(/)を削除
            baseDir = baseDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

            // ベースディレクトリとファイル名を結合
            resolvedPath = Path.Combine(baseDir, mappingFileName);

            // ファイルが存在しない場合はnullを返す
            if (string.IsNullOrWhiteSpace(resolvedPath) || !File.Exists(resolvedPath))
                return null;
            // ファイルを読み込む
            var json = File.ReadAllText(resolvedPath);
            // ファイルをデシリアライズ
            return JsonConvert.DeserializeObject<GemBoxPrintMappingDefinition>(json);
        }

        /// <summary>
        /// マッピングファイルを読み込む
        /// </summary>
        /// <param name="mappingFileName">マッピングファイル名</param>
        /// <returns>マッピング定義</returns>
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
            // 定義が無ければ何も作れないので null を返す（呼び出し側でエラー扱い/分岐する想定）。
            if (def == null) return null;

            // ----------------------------
            // 1) 単票（scalars）を data に詰める
            // ----------------------------
            // def.Scalars の各要素は JSON でこういう形:
            //   { "excelKey": "title", "dbColumn": "equipment_name" }
            //
            // - excelKey: Excelテンプレの {{title}} の "title" 部分（= data のキー）
            // - dbColumn: 取得元のキー名（DBカラム名相当の snake_case を想定）
            //
            // scalarSource は「値を取り出す元オブジェクト」。
            // 例: EquipmentRepository から取ってきた DTO / Entity をそのまま渡す、または辞書で渡す。
            //
            // 実際の取り出しは GetValueFromSource(...) が担当:
            // - scalarSource が Dictionary なら dbColumn で引く
            // - scalarSource が DTO/Entity なら dbColumn を PascalCase に変換してプロパティから取る
            // 単票用の出力先（Excel の {{key}} 置換に使う）を用意する。
            var data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            // scalars 定義が無ければ単票の埋め込みはスキップする。
            if (def.Scalars != null)
            {
                // JSON の scalars を1件ずつ処理する。
                foreach (var item in def.Scalars)
                {
                    // excelKey が無い項目はテンプレに埋め込めないため無視する。
                    if (string.IsNullOrWhiteSpace(item?.ExcelKey)) continue;
                    // Excel の {{...}} のキー名（空白除去）。
                    var key = item.ExcelKey.Trim();
                    // dbColumn が空なら取得元が無いので空文字を入れる（テンプレ側の書き間違いでも処理継続）。
                    if (string.IsNullOrWhiteSpace(item.DbColumn))
                    {
                        data[key] = "";
                        continue;
                    }
                    // scalarSource から dbColumn 指定の値を取り出す（辞書 or reflection）。
                    var raw = GetValueFromSource(scalarSource, item.DbColumn.Trim());
                    // 値の型（数値/日時など）をできるだけ維持しつつ、Excel に渡せる値へ整形して data に入れる。
                    data[key] = FormatScalar(raw);
                }
            }

            // ----------------------------
            // 2) 明細（tables）を tables に詰める
            // ----------------------------
            // def.Tables の各要素は JSON でこういう形:
            //   {
            //     "tableKey": "items",
            //     "columns": [ { "field": "qty", "dbColumn": "qty" }, ... ]
            //   }
            //
            // - tableKey: Excelテンプレの {{table:items}} の "items" 部分
            // - field   : Excelテンプレの {{items.qty}} の "qty" 部分（= 1行辞書のキー）
            // - dbColumn: 取得元のキー名（DBカラム名相当の snake_case を想定）
            //
            // tableRowSourcesByKey は
            //   { "items" => IEnumerable<object>（行の配列） }
            // のように、テーブルごとに「行ソース」を渡す辞書。
            //
            // 行ソース（srcRow）は DTO/Entity/辞書のどれでもよく、列ごとに GetValueFromSource(...) で値を取る。
            // 明細用の出力先（tableKey -> 行配列）を用意する。
            var tables = new Dictionary<string, List<Dictionary<string, object>>>(StringComparer.OrdinalIgnoreCase);
            // tables 定義が無ければ明細の埋め込みはスキップする。
            if (def.Tables != null)
            {
                // JSON の tables を1件ずつ処理する（同一シートに複数の {{table:...}} があっても対応）。
                foreach (var t in def.Tables)
                {
                    // tableKey が無い項目はテンプレに埋め込めないため無視する。
                    if (string.IsNullOrWhiteSpace(t?.TableKey)) continue;
                    // Excel の {{table:...}} のキー名（空白除去）。
                    var tableKey = t.TableKey.Trim();

                    // テーブル行ソース（repository等）を優先し、無ければ JSON の rows（デモ/固定値）を使う
                    // 呼び出し側から渡された「行ソース」があればそれを使う。無ければ null のまま（後で JSON rows にフォールバック）。
                    var sources = (tableRowSourcesByKey != null && tableRowSourcesByKey.TryGetValue(tableKey, out var s))
                        ? (s ?? Enumerable.Empty<object>())
                        : null;

                    if (sources == null)
                    {
                        // 行ソースが渡されていない場合は、マッピングJSON内の tables[].rows（固定値/デモ用）をそのまま使う。
                        var list = new List<Dictionary<string, object>>();
                        if (t.Rows != null)
                        {
                            foreach (var row in t.Rows)
                            {
                                if (row == null) continue;
                                // JSONの rows は既に「列名->値」なので、そのまま行データとしてコピーする（大小文字は無視）。
                                var d = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                                foreach (var kv in row)
                                    d[kv.Key] = kv.Value ?? "";
                                list.Add(d);
                            }
                        }
                        // tableKey ごとの行配列を tables に登録して次のテーブルへ。
                        tables[tableKey] = list;
                        continue;
                    }

                    // 行ソースを使う場合は「どの列をどこから取るか」が必要なので columns が必須。
                    if (t.Columns == null || t.Columns.Count == 0)
                        throw new InvalidOperationException($"テーブル '{tableKey}' の columns 定義がありません。");

                    // sources（行配列）を、Excel 埋め込み用の「Dictionary<string, object>（1行）」に変換していく。
                    var mappedRows = new List<Dictionary<string, object>>();
                    foreach (var srcRow in sources)
                    {
                        if (srcRow == null) continue;
                        // 1行分の出力（field -> 値）。
                        var mapped = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                        foreach (var col in t.Columns)
                        {
                            // field が無い列はテンプレに埋め込めないため無視する。
                            if (string.IsNullOrWhiteSpace(col?.Field)) continue;
                            // Excel の {{tableKey.field}} の field 名。
                            var field = col.Field.Trim();
                            // dbColumn が空なら取得元が無いので空文字。
                            if (string.IsNullOrWhiteSpace(col.DbColumn))
                            {
                                mapped[field] = "";
                                continue;
                            }
                            // その行（srcRow）から dbColumn の値を取り出す（辞書 or reflection）。
                            var raw = GetValueFromSource(srcRow, col.DbColumn.Trim());
                            // 値を整形して、その行の field にセットする。
                            mapped[field] = FormatScalar(raw);
                        }
                        // 1行分が完成したので明細行リストへ追加。
                        mappedRows.Add(mapped);
                    }
                    // tableKey ごとの行配列を tables に登録。
                    tables[tableKey] = mappedRows;
                }
            }

            // ----------------------------
            // 3) 画像（pictures）を pictures に詰める
            // ----------------------------
            // def.Pictures の各要素は JSON でこういう形:
            //   { "key": "picture1", "dbColumn": "picture1" }
            //
            // - key     : Excelテンプレの {{picture1}} の "picture1" 部分（= pictures のキー）
            // - dbColumn: 取得元のキー名（ファイル名/パスが入っているプロパティ or 辞書キー）
            //
            // pictures は最終的に backend-print に渡り、{{picture1}} が置かれているセルに画像が差し込まれる。
            // 画像用の出力先（key -> ファイル名/パス）を用意する。
            var pictures = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            // pictures 定義が無ければ画像の埋め込みはスキップする。
            if (def.Pictures != null)
            {
                // JSON の pictures を1件ずつ処理する。
                foreach (var p in def.Pictures)
                {
                    // key が無い項目はテンプレに埋め込めないため無視する。
                    if (string.IsNullOrWhiteSpace(p?.Key)) continue;
                    // Excel の {{key}} の key 名（空白除去）。
                    var key = p.Key.Trim();
                    // dbColumn が空なら取得元が無いので空文字。
                    if (string.IsNullOrWhiteSpace(p.DbColumn))
                    {
                        pictures[key] = "";
                        continue;
                    }
                    // pictureSource から dbColumn 指定の値を取り出す。
                    var raw = GetValueFromSource(pictureSource, p.DbColumn.Trim());
                    // 画像はファイル名/パスとして文字列化して渡す（backend-print 側がファイルを探して貼るため）。
                    pictures[key] = raw == null
                        ? ""
                        : Convert.ToString(raw, CultureInfo.InvariantCulture) ?? "";
                }
            }

            // ----------------------------
            // 4) ダウンロードファイル名を組み立てる
            // ----------------------------
            // downloadFileNamePattern は JSON 定義で
            //   "equipment_{equipment_code}.pdf"
            // のように {excelKey} 形式で data の値を埋め込める。
            // 既定のファイル名パターン（未指定なら document.pdf）。
            var download = def.DownloadFileNamePattern ?? "document.pdf";
            // {xxx} を data["xxx"] の値で置換して最終ファイル名にする。
            download = ReplaceDownloadPattern(download, data);

            // ----------------------------
            // 5) backend-print に渡す DTO を返す
            // ----------------------------
            // backend-print はこの DTO を受け取り、テンプレExcelに data/tables/pictures を埋め込んでPDF化する。
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

            // 2) オブジェクトの場合は、snake_case → PascalCase に変換して reflection で拾う（DTO / Entity 等を問わない）。
            var t = source.GetType();
            var prop = t.GetProperty(DbColumnToPropertyName(dbColumn), BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            return prop?.GetValue(source);
        }

        /// <summary>
        /// 数値を整形
        /// </summary>
        /// <param name="raw">整形対象のオブジェクト</param>
        /// <returns>整形後のオブジェクト</returns>
        private static object FormatScalar(object raw)
        {
            if (raw == null) return "";

            // Excel 側の表示形式に任せたいので、可能な限り型（数値/日時/真偽）を維持する。
            // 先頭ゼロなど文字列として保持したいものは、ソース側を string にしておく。
            if (raw is DateTime || raw is bool)
                return raw;

            switch (Type.GetTypeCode(raw.GetType()))
            {
                case TypeCode.Byte:
                case TypeCode.SByte:
                case TypeCode.Int16:
                case TypeCode.UInt16:
                case TypeCode.Int32:
                case TypeCode.UInt32:
                case TypeCode.Int64:
                case TypeCode.UInt64:
                case TypeCode.Single:
                case TypeCode.Double:
                case TypeCode.Decimal:
                    return raw;
            }

            // それ以外は従来どおり文字列化
            return Convert.ToString(raw, CultureInfo.InvariantCulture) ?? "";
        }
    }
}
