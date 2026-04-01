import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Equipment } from "../../api/equipmentApi";

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: "/fonts/NotoSansJP-Regular.ttf" },
    { src: "/fonts/NotoSansJP-Bold.ttf", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    size: "A4",
    padding: 40,
    fontFamily: "NotoSansJP",
    fontSize: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 18,
  },
  section: {
    border: "1px solid #000",
    padding: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 110,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
  },
  table: {
    border: "1px solid #000",
    borderBottom: "none",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#EEE",
    borderBottom: "1px solid #000",
    paddingVertical: 4,
  },
  th: {
    fontWeight: "bold",
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    paddingVertical: 4,
  },
  td: {
    paddingHorizontal: 6,
  },
});

export type EquipmentPdfData = {
  equipment: Equipment;
  printDate: string;
  history: Array<{
    date: string;
    action: string;
    note?: string;
  }>;
};

const cell = (width: number) => ({
  width,
});

const EquipmentPdf = ({ data }: { data: EquipmentPdfData }) => {
  const { equipment, printDate, history } = data;

  return (
    <Document
      title={`機器台帳_${equipment.equipmentCode}`}
      author="帳票システム"
      subject="機器台帳"
      creator="React-PDF"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>機器台帳</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>出力日</Text>
            <Text style={styles.value}>{printDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>機器コード</Text>
            <Text style={styles.value}>{equipment.equipmentCode}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>機器名</Text>
            <Text style={styles.value}>{equipment.equipmentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>カテゴリ</Text>
            <Text style={styles.value}>{equipment.category}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>メーカー</Text>
            <Text style={styles.value}>{equipment.manufacturer ?? ""}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>型式</Text>
            <Text style={styles.value}>{equipment.model ?? ""}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>設置場所</Text>
            <Text style={styles.value}>{equipment.location ?? ""}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>備考</Text>
            <Text style={styles.value}>{equipment.note ?? ""}</Text>
          </View>
        </View>

        <Text style={{ fontWeight: "bold", marginBottom: 6 }}>履歴（例）</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, cell(90)]}>日付</Text>
            <Text style={[styles.th, cell(160)]}>区分</Text>
            <Text style={[styles.th, cell(240)]}>備考</Text>
          </View>
          {history.map((h, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, cell(90)]}>{h.date}</Text>
              <Text style={[styles.td, cell(160)]}>{h.action}</Text>
              <Text style={[styles.td, cell(240)]}>{h.note ?? ""}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default EquipmentPdf;

