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

const Router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      <Route path="/ag-test" element={<AgTest />} />
      <Route path="/" element={<Home />} />
      <Route path="/hello" element={<Hello />} />
      <Route path="/user/create" element={<CreateUser /> } />
      <Route path="/user/list" element={<UserList /> } />
      <Route path="/user/list/:userId" element={<UserDitail /> } />
    </Route>
  )
);

export default Router;
