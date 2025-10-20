import {
createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import Layout from "../components/Layout";
import AgTest from "../pages/AgTest";
import Home from "../pages/Home";
import Hello from "../pages/Hello";

const Router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      <Route path="/ag-test" element={<AgTest />} />
      <Route path="/" element={<Home />} />
      <Route path="/hello" element={<Hello />} />
      
    </Route>
  )
);

export default Router;
