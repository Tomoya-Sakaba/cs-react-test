import { useEffect, useMemo, useState } from "react";
import { getTemplates, getTemplate } from "../../api/reportApi";
import { printSettingsApi } from "../../api/printSettingsApi";
import type { Template, TemplateListItem, TemplateField } from "../../types/report";

const PAGE_CODE = "equipment_master";

type Option = { value: string; label: string };

const PrintTemplateSettings = () => {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateDetail, setTemplateDetail] = useState<Template | null>(null);

  const [updatedUser, setUpdatedUser] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sources, setSources] = useState<Awaited<ReturnType<typeof printSettingsApi.getSources>> | null>(
    null
  );
  const [mappings, setMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tpls, setting, src] = await Promise.all([
          getTemplates(),
          printSettingsApi.getPageSetting(PAGE_CODE),
          printSettingsApi.getSources(PAGE_CODE),
        ]);
        setTemplates(tpls);
        setSources(src);
        setSelectedTemplateId(setting?.templateId ?? null);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!selectedTemplateId) {
        setTemplateDetail(null);
        setMappings({});
        return;
      }
      setError(null);
      try {
        const [detail, savedMappings] = await Promise.all([
          getTemplate(selectedTemplateId),
          printSettingsApi.getMappings(PAGE_CODE, selectedTemplateId),
        ]);
        setTemplateDetail(detail);
        setMappings(savedMappings);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    };
    run();
  }, [selectedTemplateId]);

  const sourceOptions = useMemo<Option[]>(() => {
    if (!sources) return [];
    const scalars = sources.scalar.map((s) => ({ value: s.key, label: s.label }));
    const tableCols = sources.tables.flatMap((t) =>
      t.columns.map((c) => ({ value: c.key, label: `${t.label} / ${c.label}` }))
    );
    return [{ value: "", label: "（未設定）" }, ...scalars, ...tableCols];
  }, [sources]);

  const fields = useMemo<TemplateField[]>(() => templateDetail?.fields ?? [], [templateDetail]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">印刷テンプレ設定</h1>
      <p className="text-sm text-gray-600 mb-6">
        ページ（{PAGE_CODE}）で使用するExcelテンプレと、テンプレ内フィールドの紐づけを設定します。
      </p>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">使用テンプレート</label>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
              value={selectedTemplateId ?? ""}
              onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">（未選択）</option>
              {templates.map((t) => (
                <option key={t.templateId} value={t.templateId}>
                  {t.templateName}（{t.templateCode}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">更新者</label>
            <input
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
              value={updatedUser}
              onChange={(e) => setUpdatedUser(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            disabled={!selectedTemplateId || saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
            onClick={async () => {
              if (!selectedTemplateId) return;
              setSaving(true);
              setError(null);
              try {
                await printSettingsApi.setPageSetting(PAGE_CODE, selectedTemplateId, updatedUser);
                await printSettingsApi.saveMappings(PAGE_CODE, selectedTemplateId, mappings, updatedUser);
              } catch (e: any) {
                setError(e?.message ?? String(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            保存
          </button>
          <button
            disabled={!selectedTemplateId}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white disabled:opacity-50"
            onClick={async () => {
              if (!selectedTemplateId) return;
              const saved = await printSettingsApi.getMappings(PAGE_CODE, selectedTemplateId);
              setMappings(saved);
            }}
          >
            再読み込み
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">フィールド紐づけ</h2>
        {!selectedTemplateId && <div className="text-gray-600">まずテンプレートを選択してください。</div>}

        {selectedTemplateId && fields.length === 0 && (
          <div className="text-gray-600">このテンプレートにはフィールドが検出されていません。</div>
        )}

        {selectedTemplateId && fields.length > 0 && (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">テンプレ項目</th>
                  <th className="text-left py-2 pr-4">フィールド名</th>
                  <th className="text-left py-2 pr-4">セル</th>
                  <th className="text-left py-2 pr-4">紐づけ（データソース）</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.fieldId} className="border-b">
                    <td className="py-2 pr-4 whitespace-nowrap">{f.fieldLabel}</td>
                    <td className="py-2 pr-4 font-mono whitespace-nowrap">{f.fieldName}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{f.cellAddress ?? "-"}</td>
                    <td className="py-2 pr-4">
                      <select
                        className="border border-gray-300 rounded-md px-3 py-2 w-full"
                        value={mappings[f.fieldName] ?? ""}
                        onChange={(e) =>
                          setMappings((prev) => ({ ...prev, [f.fieldName]: e.target.value }))
                        }
                      >
                        {sourceOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintTemplateSettings;

