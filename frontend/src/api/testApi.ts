import axios from "axios";
import type { ContentTypeList, FetchPlanType, fetchTestType } from "../pages/AgTest";


export const testApi = {
  async fetchTestData(): Promise<fetchTestType[]> {
    // 疑似的に1秒の遅延を挿入
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // モックデータを返す
    return [
      {
        date: "2025-10-01",
        contentType: 1,
        company: 1,
        vol: 50,
        time: "09:00",
        note: "",
      },
      {
        date: "2025-10-01",
        contentType: 2,
        company: 2,
        vol: 30,
        time: "13:00",
        note: "",
      },
      {
        date: "2025-10-01",
        contentType: 3,
        company: 3,
        vol: 45,
        time: "10:30",
        note: "",
      },
      {
        date: "2025-10-01",
        contentType: 4,
        company: 3,
        vol: 45,
        time: "10:30",
        note: "",
      },
      {
        date: "2025-10-02",
        contentType: 1,
        company: 1,
        vol: 50,
        time: "09:00",
        note: "",
      },
      {
        date: "2025-10-02",
        contentType: 2,
        company: 2,
        vol: 30,
        time: "13:00",
        note: "",
      },
      {
        date: "2025-10-02",
        contentType: 3,
        company: 3,
        vol: 45,
        time: "10:30",
        note: "",
      },
    ];
  },

  async fetchPlanData(): Promise<FetchPlanType[]> {
    const res = await axios.get<FetchPlanType[]>("/api/plan", {
      headers: {
        Accept: "application/json",
      },
    });
    return res.data;
  },

  async fetchContentTypeList(): Promise<ContentTypeList[]> {
    const res = await axios.get<ContentTypeList[]>("/api/content", {
      headers: {
        Accept: "application/json",
      },
    });
    return res.data;
  },
};
