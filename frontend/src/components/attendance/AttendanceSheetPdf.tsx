/* ----------------------------------------------------------------
 * Pdf.tsx
 * 勤怠表のPDF表示
 * パラメーター:
 *  - data: 勤怠表のデータ
 *  - userName: ユーザー名
 *  - clientName: クライアント名
 *  - storeName: 店舗名
 *  - startDate: 計算開始日
 *  - tableData : {
 *    date: 日付(曜日);
 *    startTime: 始業時間;
 *    endTime: 就業時間;
 *    breakTime: 休憩時間;
 *  }
 * ---------------------------------------------------------------- */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ProcessedAttendanceData } from "../../types/attendance";

Font.register({
  family: "NotoSansJP",
  fonts: [
    {
      src: "/fonts/NotoSansJP-Regular.ttf",
    },
    {
      src: "/fonts/NotoSansJP-Regular.ttf",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    size: "A4",
    padding: 50,
    fontFamily: "NotoSansJP",
    backgroundColor: "white",
  },
  container: {
    backgroundColor: "white",
  },
  title: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    color: "black",
  },
  header: {
    marginTop: 10,
    border: "1px solid #000",
  },
  headerSection: {
    flexDirection: "row",
    height: 50,
    borderBottom: "1px solid #000",
  },
  headerLeft: {
    width: "50%",
  },
  headerRight: {
    width: "50%",
    height: "100%",
  },
  headerRow: {
    flexDirection: "row",
  },
  CellValue: {
    fontSize: 8,
    textAlign: "center",
  },
  headerCellContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#CCE8FE",
    borderRight: "1px solid #000",
  },
  headerCellValueContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  table: {
    marginTop: 20,
    border: "1px solid #000",
    borderBottom: "none",
  },
  tableHeader: {
    flexDirection: "row",
    height: 25,
    borderBottom: "1px solid #000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    minHeight: 15,
  },
  tableRowCellContainer: {
    borderRight: "1px solid #000",
    justifyContent: "center",
    alignItems: "center",
  },
  dateCell: {
    fontSize: 8,
    textAlign: "center",
  },
  timeCell: {
    fontSize: 8,
    textAlign: "center",
  },
  remarkCell: {
    fontSize: 8,
    textAlign: "center",
  },
  summarySection: {
    marginTop: 20,
    border: "1px solid #000",
  },
  summaryHeaderRow: {
    flexDirection: "row",
    height: 15,
    borderBottom: "1px solid #000",
  },
  summaryCellContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#CCE8FE",
    borderRight: "1px solid #000",
  },
  summaryCellHeader: {
    fontSize: 8,
    fontWeight: "bold",
    color: "black",
  },
  summaryCellValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "black",
  },
  summaryDataRow: {
    flexDirection: "row",
    height: 15,
  },
});

const Pdf = ({
  data,
}: {
  data: {
    userName: string;
    clientName: string;
    storeName: string;
    startDate: string;
    summary: {
      totalWorkDays: number;
      totalActualHours: number;
      totalOvertime: number;
      totalNightHours: number;
      totalHolidayWorkHours: number;
    };
    tableData?: ProcessedAttendanceData[];
  } | null;
}) => (
  <Document
    title={`勤怠表_${data?.userName}`}
    author="勤怠管理システム"
    subject={`${data?.userName}の勤怠表`}
    creator="React-PDF"
  >
    <Page size="A4" style={styles.page}>
      <View style={styles.container}>
        {/* タイトル */}
        <Text style={styles.title}>勤怠管理表</Text>

        {/* ヘッダー情報 */}
        <View style={styles.header}>
          <View style={styles.headerSection}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerRow,
                  { borderBottom: "1px solid #000", height: 16 },
                ]}
              >
                <View style={[styles.headerCellContainer, { width: "30%" }]}>
                  <Text style={styles.CellValue}>クライアント</Text>
                </View>
                <View
                  style={[styles.headerCellValueContainer, { width: "70%" }]}
                >
                  <Text style={styles.CellValue}>{data?.clientName}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.headerRow,
                  { borderBottom: "1px solid #000", height: 16 },
                ]}
              >
                <View style={[styles.headerCellContainer, { width: "30%" }]}>
                  <Text style={styles.CellValue}>店舗名</Text>
                </View>
                <View
                  style={[styles.headerCellValueContainer, { width: "70%" }]}
                >
                  <Text style={styles.CellValue}>{data?.storeName}</Text>
                </View>
              </View>
              <View style={[styles.headerRow, { height: 17 }]}>
                <View style={[styles.headerCellContainer, { width: "30%" }]}>
                  <Text style={styles.CellValue}>計算開始期間</Text>
                </View>
                <View
                  style={[styles.headerCellValueContainer, { width: "70%" }]}
                >
                  <Text style={styles.CellValue}>{data?.startDate}</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.headerCellContainer,
                    {
                      width: "20%",
                      height: 49,
                      borderLeft: "1px solid #000",
                    },
                  ]}
                >
                  <Text style={[styles.CellValue, { fontSize: 8 }]}>氏名</Text>
                </View>
                <View
                  style={[
                    styles.headerCellValueContainer,
                    {
                      width: "80%",
                      height: 49,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "bold",
                    }}
                  >
                    {data?.userName}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {/* 今月のフリーコメント */}
          <View style={styles.headerRow}>
            <View
              style={[styles.headerCellContainer, { width: "20%", height: 40 }]}
            >
              <Text style={[styles.CellValue, { fontSize: 8 }]}>
                今月のフリーコメント
              </Text>
            </View>
            <View
              style={[
                styles.headerCellValueContainer,
                { width: "80%", height: 40 },
              ]}
            >
              <Text style={{ fontSize: 8, textAlign: "center" }}></Text>
            </View>
          </View>
        </View>

        {/* サマリーセクション */}
        <View style={styles.summarySection}>
          {/* サマリーヘッダー行 */}
          <View style={styles.summaryHeaderRow}>
            <View style={styles.summaryCellContainer}>
              <Text style={styles.summaryCellHeader}>実働日数</Text>
            </View>
            <View style={styles.summaryCellContainer}>
              <Text style={styles.summaryCellHeader}>実働時間</Text>
            </View>
            <View style={styles.summaryCellContainer}>
              <Text style={styles.summaryCellHeader}>残業時間</Text>
            </View>
            <View style={styles.summaryCellContainer}>
              <Text style={styles.summaryCellHeader}>深夜時間</Text>
            </View>
            <View
              style={[styles.summaryCellContainer, { borderRight: "none" }]}
            >
              <Text style={styles.summaryCellHeader}>休日時間</Text>
            </View>
          </View>

          {/* サマリーデータ行 */}
          <View style={styles.summaryDataRow}>
            <View
              style={[
                styles.summaryCellContainer,
                { backgroundColor: "white" },
              ]}
            >
              <Text style={styles.summaryCellValue}>
                {data?.summary.totalWorkDays}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCellContainer,
                { backgroundColor: "white" },
              ]}
            >
              <Text style={styles.summaryCellValue}>
                {data?.summary.totalActualHours.toFixed(2)}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCellContainer,
                { backgroundColor: "white" },
              ]}
            >
              <Text style={styles.summaryCellValue}>
                {data?.summary.totalOvertime.toFixed(2)}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCellContainer,
                { backgroundColor: "white" },
              ]}
            >
              <Text style={styles.summaryCellValue}>
                {data?.summary.totalNightHours.toFixed(2)}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCellContainer,
                { backgroundColor: "white", borderRight: "none" },
              ]}
            >
              <Text style={styles.summaryCellValue}>
                {data?.summary.totalHolidayWorkHours.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* テーブルデータセクション */}
        <View style={styles.table}>
          {/* テーブルヘッダー */}
          <View style={styles.tableHeader}>
            <View style={[styles.headerCellContainer, { width: "10%" }]}>
              <Text style={styles.CellValue}>日付 (曜日)</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "5%" }]}>
              <Text style={styles.CellValue}>欠勤</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "5%" }]}>
              <Text style={styles.CellValue}>遅刻</Text>
              <Text style={styles.CellValue}>早退</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "8%" }]}>
              <Text style={styles.CellValue}>始業</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "8%" }]}>
              <Text style={styles.CellValue}>就業</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "8%" }]}>
              <Text style={styles.CellValue}>休憩(分)</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "8%" }]}>
              <Text style={styles.CellValue}>実働</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "8%" }]}>
              <Text style={styles.CellValue}>割増残業</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "8%" }]}>
              <Text style={styles.CellValue}>内深夜</Text>
            </View>
            <View style={[styles.headerCellContainer, { width: "8%" }]}>
              <Text style={styles.CellValue}>休日勤務</Text>
            </View>
            <View
              style={[
                styles.headerCellContainer,
                { width: "24%", borderRight: "none" },
              ]}
            >
              <Text style={styles.CellValue}>備考</Text>
            </View>
          </View>

          {/* データ行 */}
          {data?.tableData?.map((dayData, index) => (
            <View key={index} style={styles.tableRow}>
              {/* 日付 */}
              <View style={[styles.tableRowCellContainer, { width: "10%" }]}>
                <Text style={styles.dateCell}>{dayData.dayLabel}</Text>
              </View>

              {/* 欠勤 */}
              <View style={[styles.tableRowCellContainer, { width: "5%" }]}>
                <Text style={styles.timeCell}>
                  {dayData.isAbsent ? "○" : "-"}
                </Text>
              </View>

              {/* 遅刻 */}
              <View style={[styles.tableRowCellContainer, { width: "5%" }]}>
                <Text style={styles.timeCell}>-</Text>
              </View>

              {/* 始業 */}
              <View style={[styles.tableRowCellContainer, { width: "8%" }]}>
                <Text style={styles.timeCell}>{dayData?.startTime || "-"}</Text>
              </View>

              {/* 就業 */}
              <View style={[styles.tableRowCellContainer, { width: "8%" }]}>
                <Text style={styles.timeCell}>{dayData?.endTime || "-"}</Text>
              </View>

              {/* 休憩 */}
              <View style={[styles.tableRowCellContainer, { width: "8%" }]}>
                <Text style={styles.timeCell}>{dayData?.breakTime || "-"}</Text>
              </View>

              {/* 実働 */}
              <View style={[styles.tableRowCellContainer, { width: "8%" }]}>
                <Text style={styles.timeCell}>
                  {dayData.actualHours == 0
                    ? "-"
                    : dayData.actualHours.toFixed(2)}
                </Text>
              </View>

              {/* 割増残業 */}
              <View style={[styles.tableRowCellContainer, { width: "8%" }]}>
                <Text style={styles.timeCell}>
                  {dayData.overtime == 0 ? "-" : dayData.overtime.toFixed(2)}
                </Text>
              </View>

              {/* 内深夜 */}
              <View style={[styles.tableRowCellContainer, { width: "8%" }]}>
                <Text style={styles.timeCell}>
                  {dayData.nightHours == 0
                    ? "-"
                    : dayData.nightHours.toFixed(2)}
                </Text>
              </View>

              {/* 休日出勤 */}
              <View style={[styles.tableRowCellContainer, { width: "8%" }]}>
                <Text style={styles.timeCell}>
                  {dayData.isHoliday && dayData.startTime && dayData.endTime
                    ? dayData.actualHours == 0
                      ? "-"
                      : dayData.actualHours.toFixed(2)
                    : "-"}
                </Text>
              </View>

              {/* 備考 */}
              <View
                style={[
                  styles.tableRowCellContainer,
                  { width: "24%", borderRight: "none" },
                ]}
              >
                <Text style={styles.remarkCell}>{dayData?.note || "-"}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Page>
  </Document>
);

export default Pdf;
