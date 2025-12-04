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

const Router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/ag-test" element={<AgTest />} />
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

        <Route path="/reports" element={<ReportList />} />
        <Route path="/reports/new" element={<ReportForm />} />
        <Route path="/reports/edit/:reportNo" element={<ReportForm />} />

        <Route path="/new-plan" element={<NewPlan />} />
      </Route>
    </>
  )
);

export default Router;
