import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { fetchTestData, usePdfPreview, type PdfPreviewData, type TestPdfData } from '../hooks/usePdfPreview';
import TestPdf from '../components/TestPdf';
import PdfPreview from '../components/PdfPreview';

// モジュール登録
ModuleRegistry.registerModules([AllCommunityModule]);

interface RowData {
  id: number;
  name: string;
  age1: number;
  age2: number;
  age3: number;
  age4: number;
  age5: number;
  age6: number;
  age7: number;
  age8: number;
}

const rowData: RowData[] = [
  { id: 1, name: 'Alice', age1: 25, age2: 26, age3: 27, age4: 28, age5: 29, age6: 10, age7: 10, age8: 10 },
  { id: 2, name: 'Bob', age1: 30, age2: 31, age3: 32, age4: 33, age5: 34, age6: 10, age7: 10, age8: 10 },
  { id: 3, name: 'Charlie', age1: 28, age2: 29, age3: 30, age4: 31, age5: 32, age6: 10, age7: 10, age8: 10 },
  { id: 3, name: 'Charlie', age1: 28, age2: 29, age3: 30, age4: 31, age5: 32, age6: 10, age7: 10, age8: 10 },
  { id: 3, name: 'Charlie', age1: 28, age2: 29, age3: 30, age4: 31, age5: 32, age6: 10, age7: 10, age8: 10 },
  { id: 3, name: 'Charlie', age1: 28, age2: 29, age3: 30, age4: 31, age5: 32, age6: 10, age7: 10, age8: 10 },
  { id: 3, name: 'Charlie', age1: 28, age2: 29, age3: 30, age4: 31, age5: 32, age6: 10, age7: 10, age8: 10 },
];

const columnDefs: ColDef<RowData>[] = [
  { field: 'id', headerName: 'ID', pinned: 'left', cellClass: 'text-center', width: 100 },
  { field: 'name', headerName: '名前', pinned: 'left' },
  { field: 'age1', headerName: '年齢', flex: 1 },
  { field: 'age2', headerName: 'ああああ', flex: 1 },
  { field: 'age3', headerName: 'いいいい', flex: 1 },
  { field: 'age4', headerName: 'うううう', flex: 1 },
  { field: 'age5', headerName: 'ええええ', flex: 1 },
  { field: 'age6', headerName: 'ええええ', flex: 1 },
  { field: 'age7', headerName: 'ええええ', flex: 1 },
  { field: 'age8', headerName: 'ええええ', flex: 1 },
];

const AgTest = () => {

  const pdfHook = usePdfPreview<PdfPreviewData<TestPdfData[]>>(2025, 9)

  const handleClick = async () => {
    const pdfData = await fetchTestData(2025, 9 + 1);

    await pdfHook.handlePreviewPdf(pdfData, TestPdf);
  };


  return (
    <>
      <div className="w-full">
        <button
          className="ml-4 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg"
          onClick={handleClick}
        >
          pdf
        </button>
        <div className="ag-theme-alpine h-96 m-5">
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true }}
          />
        </div>


        {/* PDFプレビューモーダル */}
        {pdfHook.isOpen && pdfHook.previewData && (
          <PdfPreview
            pdfBlob={pdfHook.previewData.pdfBlob}
            fileName={pdfHook.previewData.fileName}
            onClose={pdfHook.closePreview}
            loading={pdfHook.loading}
            error={pdfHook.error}
          />
        )}
      </div>
    </>
    )
};

export default AgTest;
