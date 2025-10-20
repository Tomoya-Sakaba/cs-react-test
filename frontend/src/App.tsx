import { RouterProvider } from "react-router-dom";
import Router from "./routes/Router";
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9B6]/40 to-[#1E3A8A]/20">
      <RouterProvider router={Router} />
    </div>
  );
}
