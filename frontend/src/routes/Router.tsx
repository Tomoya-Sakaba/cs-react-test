import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import Layout from "../components/Layout";
import AgTest from "../pages/AgTest";
import Home from "../pages/Home";
import Hello from "../pages/Hello";
import CreateUser from "../pages/CreateUser";
import UserList from "../pages/UserList";
import UserDitail from "../pages/UserDitail";
import AttendanceTop from "../pages/attendance/AttendanceTop";
import TimeStamping from "../pages/attendance/TimeStamping";
import AttendanceList from "../pages/attendance/AttendanceList";
import AttendanceRecord from "../pages/attendance/AttendanceRecord";
import Login from "../pages/Login";
import ReportList from "../pages/ReportList";
import ReportForm from "../pages/ReportForm";
import NewPlan from "../pages/NewPlan";
import CsvImport from "../pages/CsvImport";
// 新しい報告書システム
import TemplateList from "../pages/TemplateList";
import TemplateUpload from "../pages/TemplateUpload";
import TemplateDetail from "../pages/TemplateDetail";
import ReportCreate from "../pages/ReportCreate";
import ReportManagementList from "../pages/ReportManagementList";
import ReportDetail from "../pages/ReportDetail";
// 柔軟な計画スケジュールシステム
import FlexibleSchedule from "../pages/FlexibleSchedule";
// 廃棄物排出計画スケジュールシステム（種別ベース）
import WasteSchedule from "../pages/WasteSchedule";
// DHTMLX Grid テスト
import DhtmlxGridTest from "../pages/DhtmlxGridTest";
import DhtmlxAgTest from "../pages/DhtmlxAgTest";

const Router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/ag-test" element={<AgTest />} />
        <Route path="/dhtmlx-test" element={<DhtmlxGridTest />} />
        <Route path="/dhtmlx-ag-test" element={<DhtmlxAgTest />} />
        <Route path="/flexible-schedule" element={<FlexibleSchedule />} />
        <Route path="/waste-schedule" element={<WasteSchedule />} />
        <Route path="/" element={<Home />} />
        <Route path="/hello" element={<Hello />} />
        <Route path="/user/create" element={<CreateUser />} />
        <Route path="/user/list" element={<UserList />} />
        <Route path="/user/list/:userId" element={<UserDitail />} />

        <Route path="/attendance" element={<AttendanceTop />} />
        <Route path="/attendance/stamping" element={<TimeStamping />} />
        <Route path="/attendance/record" element={<AttendanceList />} />
        <Route
          path="/attendance/record/:userId"
          element={<AttendanceRecord />}
        />

        {/* 旧報告書システム（移行中） */}
        <Route path="/reports-old" element={<ReportList />} />
        <Route path="/reports-old/new" element={<ReportForm />} />
        <Route path="/reports-old/edit/:reportNo" element={<ReportForm />} />

        {/* 新しい報告書システム */}
        <Route path="/reports" element={<ReportManagementList />} />
        <Route path="/report-system/templates" element={<TemplateList />} />
        <Route path="/report-system/templates/upload" element={<TemplateUpload />} />
        <Route path="/report-system/templates/:id" element={<TemplateDetail />} />
        <Route path="/report-system/reports" element={<ReportManagementList />} />
        <Route path="/report-system/reports/create" element={<ReportCreate />} />
        <Route path="/report-system/reports/:id" element={<ReportDetail />} />

        <Route path="/new-plan" element={<NewPlan />} />
        <Route path="/csv-import" element={<CsvImport />} />
      </Route>
    </>
  )
);

export default Router;
