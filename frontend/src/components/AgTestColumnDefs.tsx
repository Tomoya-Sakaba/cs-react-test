import type {
  ColDef,
  ColGroupDef,
  CellClassParams,
  CellValueChangedEvent,
} from 'ag-grid-community';
import TimeInputEditor from './TimeInputEditor';
import CustomInputEditor from './CustomInputEditor';
import CompanyCellRenderer from './CompanyCellRenderer';
import CompanyCellEditor from './CompanyCellEditor';
import type {
  MapdePlan,
  ContentTypeList,
  Company,
} from '../pages/AgTest';

export const getAgTestColumnDefs = (
  isEditing: boolean,
  selectedIds: number[],
  originalList: ContentTypeList[],
  companies: Company[],
  onRequestStopEditing: () => void
): (ColDef<MapdePlan> | ColGroupDef<MapdePlan>)[] => {
  // 選択されたIDのみをフィルタリングし、オリジナルの順序でソート
  const filteredAndSorted = originalList
    .filter((type) => selectedIds.includes(type.contentTypeId))
    .sort((a, b) => {
      const indexA = originalList.findIndex(
        (t) => t.contentTypeId === a.contentTypeId
      );
      const indexB = originalList.findIndex(
        (t) => t.contentTypeId === b.contentTypeId
      );
      return indexA - indexB;
    });

  return [
    {
      headerName: '日付',
      field: 'dayLabel',
      width: 100,
      pinned: 'left',
      cellClass: (params) => {
        if (params.data?.isHoliday) return 'text-red-500 font-bold';
        if (params.data?.isSturday) return 'text-blue-500 font-bold';
        return 'text-gray-800';
      },
    },
    ...filteredAndSorted.map((type) => ({
      headerName: type.contentName,
      children: [
        {
          headerName: '会社',
          field: `contentType.${type.contentTypeId}.company`,
          minWidth: 90,
          flex: 1,
          editable: isEditing,
          cellRenderer: CompanyCellRenderer,
          cellRendererParams: { companies },
          cellEditor: CompanyCellEditor,
          cellEditorPopup: true,
          cellEditorPopupPosition: 'under',
          cellEditorParams: { companies, onRequestStopEditing },
          // 会社選択時に、まだ時間が入っていなければ defTime を自動設定
          onCellValueChanged: (params: CellValueChangedEvent<MapdePlan>) => {
            const newCompanyId = params.newValue as number | null | undefined;
            const row = params.data;
            if (!row) return;

            const item = row.contentType?.[type.contentTypeId];
            if (!item) return;

            if (newCompanyId != null && (item.time == null || item.time === '')) {
              // まだ時間が設定されていない場合のみ、会社マスタの defTime をそのまま反映
              const company = companies.find(
                (c) => c.companyId === newCompanyId
              );
              // defTime が null の場合は undefined 扱いにする
              item.time = company?.defTime ?? undefined;
            }

            // 時間列を再描画
            params.api.refreshCells({
              rowNodes: [params.node],
              columns: [`contentType.${type.contentTypeId}.time`],
              force: true,
            });
          },
          cellClass: (params: CellClassParams<MapdePlan>) => {
            const item = params.data?.contentType?.[type.contentTypeId];
            return item?.isChanged ? 'bg-red-100' : '';
          },
        },
        {
          headerName: '数量',
          field: `contentType.${type.contentTypeId}.vol`,
          minWidth: 90,
          flex: 1,
          editable: isEditing,
          cellEditor: CustomInputEditor,
          cellEditorParams: { type: 'number' },
          cellClass: (params: CellClassParams<MapdePlan>) => {
            const item = params.data?.contentType?.[type.contentTypeId];
            return item?.isChanged ? 'bg-red-100' : '';
          },
        },
        {
          headerName: '時間',
          field: `contentType.${type.contentTypeId}.time`,
          flex: 1,
          minWidth: 90,
          editable: isEditing,
          cellEditor: TimeInputEditor,
          cellClass: (params: CellClassParams<MapdePlan>) => {
            const item = params.data?.contentType?.[type.contentTypeId];
            return item?.isChanged ? 'bg-red-100' : '';
          },
        },
      ],
    })),
    {
      headerName: '備考',
      field: 'note',
      minWidth: 200,
      editable: isEditing, // ここで toggle 状態で編集可否切替
      cellEditor: CustomInputEditor,
      cellEditorParams: { type: 'text' },
    },
  ];
};


