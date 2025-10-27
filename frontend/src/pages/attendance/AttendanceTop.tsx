/* ----------------------------------------------------------------
 * AttendanceTop.tsx
 * 勤怠管理TOPページ
 * 打刻、勤怠一覧、勤怠表へのリンクボタンを表示する
 * ---------------------------------------------------------------- */

import { useNavigate } from "react-router-dom";
import Button from "../../components/Home-service-button";
import ContentHeader from "../../components/ContentHeader";

const AttendanceTop = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-8 h-full flex flex-col">
      <ContentHeader subtitle="Attendance TOP" title="勤怠管理 TOP" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-14 mb-8">
        <Button onClick={() => navigate("/attendance/stamping")}>打刻</Button>
        <Button onClick={() => navigate("/attendance/record")}>勤怠一覧</Button>
        <Button onClick={() => navigate("/attendance/record/me")}>
          勤怠表
        </Button>
        <Button colorScheme="gray" disabled>
          Coming Soon
        </Button>
        <Button colorScheme="gray" disabled>
          Coming Soon
        </Button>
        <Button colorScheme="gray" disabled>
          Coming Soon
        </Button>
      </div>
    </div>
  );
};

export default AttendanceTop;
