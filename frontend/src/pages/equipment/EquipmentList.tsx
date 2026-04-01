import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef } from "ag-grid-community";
import { useNavigate } from "react-router-dom";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { equipmentApi, type Equipment } from "../../api/equipmentApi";
import type { AgGridReact as AgGridReactType } from "ag-grid-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const EquipmentList = () => {
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReactType<Equipment>>(null);

  const [rowData, setRowData] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    equipmentApi
      .list()
      .then((data) => {
        if (!cancelled) setRowData(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columnDefs = useMemo<ColDef<Equipment>[]>(
    () => [
      { headerName: "ID", field: "equipmentId", width: 90, sortable: true },
      { headerName: "コード", field: "equipmentCode", width: 120, sortable: true, filter: true },
      { headerName: "機器名", field: "equipmentName", flex: 1, minWidth: 220, sortable: true, filter: true },
      { headerName: "カテゴリ", field: "category", width: 140, sortable: true, filter: true },
      { headerName: "メーカー", field: "manufacturer", width: 160, sortable: true, filter: true },
      { headerName: "型式", field: "model", width: 140, sortable: true, filter: true },
      { headerName: "設置場所", field: "location", flex: 1, minWidth: 220, sortable: true, filter: true },
      { headerName: "更新日時", field: "updatedAt", width: 180, sortable: true },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(() => ({ resizable: true }), []);

  return (
    <div className="h-full p-4">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h1 className="text-xl font-bold">機器マスタ</h1>
          <p className="text-sm text-gray-600">行をダブルクリックすると詳細を開きます。</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={quickFilter}
            onChange={(e) => {
              const v = e.target.value;
              setQuickFilter(v);
              gridRef.current?.api.setGridOption("quickFilterText", v);
            }}
            placeholder="検索（クイックフィルタ）"
            className="border border-gray-300 rounded-md px-3 py-2 w-72"
          />
        </div>
      </div>

      <div className="ag-theme-alpine" style={{ height: "calc(100vh - 12rem)" }}>
        <AgGridReact<Equipment>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows
          rowSelection={{ mode: "singleRow" }}
          onRowDoubleClicked={(e) => {
            const id = e.data?.equipmentId;
            if (id != null) navigate(`/equipment/${id}`);
          }}
          overlayLoadingTemplate={'<span class="ag-overlay-loading-center">読み込み中...</span>'}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default EquipmentList;

