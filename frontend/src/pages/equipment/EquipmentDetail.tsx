import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { equipmentApi, type Equipment } from "../../api/equipmentApi";
import PdfPreview from "../../components/PdfPreview";
import { printApi } from "../../api/printApi";
import {
  getTestLinkedEquipmentForEquipment,
  getTestPartsForEquipment,
} from "./equipmentDetailTestData";

const EquipmentDetail = () => {
  const navigate = useNavigate();
  const { equipmentId } = useParams();

  const id = Number(equipmentId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pageCode = "equipment_master";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    equipmentApi
      .get(id)
      .then((data) => {
        if (!cancelled) setEquipment(data);
        if (!data && !cancelled) setError("機器が見つかりません");
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const printEnabled = !!equipment && !loading;

  const handleSave = async () => {
    if (!equipment) return;
    setSaving(true);
    try {
      const saved = await equipmentApi.update(equipment.equipmentId, {
        equipmentName: equipment.equipmentName,
        category: equipment.category,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        location: equipment.location,
        note: equipment.note,
      });
      setEquipment(saved);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (Number.isNaN(id)) {
    return (
      <div className="p-6">
        <div className="text-red-600">不正なIDです</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <button
            className="text-sm text-blue-700 hover:underline"
            onClick={() => navigate("/equipment")}
          >
            ← 一覧へ戻る
          </button>
          <h1 className="text-xl font-bold mt-1">機器詳細</h1>
          <div className="text-sm text-gray-600">
            {equipment ? `${equipment.equipmentCode} / ${equipment.equipmentName}` : ""}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            disabled={!printEnabled || pdfLoading}
            className="px-4 py-2 rounded-md bg-gray-800 text-white disabled:opacity-50"
            onClick={async () => {
              if (!equipment) return;
              setPdfLoading(true);
              setPdfError(null);
              setPdfBlob(null);
              try {
                const fileName = `機器台帳_${equipment.equipmentCode}.pdf`;
                const blob = await printApi.generatePdfByPage(pageCode, {
                  fileName,
                  equipmentId: equipment.equipmentId,
                });
                setPdfBlob(blob);
                setPdfFileName(fileName);
              } catch (e) {
                console.error(e);
                setPdfError("PDFの生成に失敗しました");
              } finally {
                setPdfLoading(false);
              }
            }}
          >
            {pdfLoading ? "生成中..." : "印刷（PDF）"}
          </button>
          <button
            disabled={!printEnabled || pdfLoading}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
            onClick={async () => {
              if (!equipment) return;
              setPdfLoading(true);
              setPdfError(null);
              setPdfBlob(null);
              try {
                const fileName = `機器台帳_${equipment.equipmentCode}_GemBox.pdf`;
                const blob = await printApi.generatePdfByPageGemBox(pageCode, {
                  fileName,
                  equipmentId: equipment.equipmentId,
                });
                setPdfBlob(blob);
                setPdfFileName(fileName);
              } catch (e) {
                console.error(e);
                setPdfError("PDF（GemBox）の生成に失敗しました");
              } finally {
                setPdfLoading(false);
              }
            }}
          >
            {pdfLoading ? "生成中..." : "印刷（PDF/GemBox）"}
          </button>
          <button
            disabled={!printEnabled || pdfLoading}
            className="px-4 py-2 rounded-md bg-teal-700 text-white disabled:opacity-50"
            onClick={async () => {
              if (!equipment) return;
              setPdfLoading(true);
              setPdfError(null);
              setPdfBlob(null);
              try {
                const fileName = `機器詳細_部品関連_${equipment.equipmentCode}_GemBox.pdf`;
                const blob = await printApi.generateEquipmentDetailListsGemBox(equipment.equipmentId);
                setPdfBlob(blob);
                setPdfFileName(fileName);
              } catch (e) {
                console.error(e);
                setPdfError(
                  "PDF（部品・関連機器/GemBox）の生成に失敗しました（equipment_master_detail.xlsx を配置してください）"
                );
              } finally {
                setPdfLoading(false);
              }
            }}
          >
            {pdfLoading ? "生成中..." : "PDF（部品・関連機器）"}
          </button>
          <button
            disabled={!equipment || saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-600">読み込み中...</div>}
      {error && <div className="text-red-600 mb-3">{error}</div>}
      {pdfLoading && <div className="text-gray-600 mb-3">PDFを生成しています...</div>}
      {pdfError && <div className="text-red-600 mb-3">{pdfError}</div>}

      {equipment && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">機器コード</label>
              <div className="font-mono">{equipment.equipmentCode}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">更新日時</label>
              <div>{equipment.updatedAt}</div>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">機器名</label>
              <input
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={equipment.equipmentName}
                onChange={(e) =>
                  setEquipment((prev) => (prev ? { ...prev, equipmentName: e.target.value } : prev))
                }
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">カテゴリ</label>
              <input
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={equipment.category}
                onChange={(e) =>
                  setEquipment((prev) => (prev ? { ...prev, category: e.target.value } : prev))
                }
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">メーカー</label>
              <input
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={equipment.manufacturer ?? ""}
                onChange={(e) =>
                  setEquipment((prev) =>
                    prev ? { ...prev, manufacturer: e.target.value } : prev
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">型式</label>
              <input
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={equipment.model ?? ""}
                onChange={(e) =>
                  setEquipment((prev) => (prev ? { ...prev, model: e.target.value } : prev))
                }
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">設置場所</label>
              <input
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={equipment.location ?? ""}
                onChange={(e) =>
                  setEquipment((prev) => (prev ? { ...prev, location: e.target.value } : prev))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">備考</label>
              <textarea
                className="border border-gray-300 rounded-md px-3 py-2 w-full min-h-24"
                value={equipment.note ?? ""}
                onChange={(e) =>
                  setEquipment((prev) => (prev ? { ...prev, note: e.target.value } : prev))
                }
              />
            </div>
          </div>

          <div className="mt-8 space-y-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-semibold mb-2">部品リスト（テストデータ）</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2">品番</th>
                      <th className="text-right px-3 py-2 w-24">数量</th>
                      <th className="text-left px-3 py-2">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTestPartsForEquipment(equipment.equipmentId).map((row) => (
                      <tr key={row.partCode} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono">{row.partCode}</td>
                        <td className="px-3 py-2 text-right">{row.qty}</td>
                        <td className="px-3 py-2">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">紐づく機器（テストデータ）</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2">機器コード</th>
                      <th className="text-left px-3 py-2">機器名</th>
                      <th className="text-left px-3 py-2">関係</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTestLinkedEquipmentForEquipment(equipment.equipmentId).map((row) => (
                      <tr key={row.equipmentCode} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono">{row.equipmentCode}</td>
                        <td className="px-3 py-2">{row.equipmentName}</td>
                        <td className="px-3 py-2">{row.relation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfBlob && (
        <PdfPreview
          pdfBlob={pdfBlob}
          fileName={pdfFileName}
          onClose={() => setPdfBlob(null)}
          loading={pdfLoading}
          error={pdfError}
        />
      )}
    </div>
  );
};

export default EquipmentDetail;

