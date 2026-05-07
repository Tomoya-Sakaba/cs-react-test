import { axiosClient } from "./httpClient";

export type KoujiDto = {
  koujiId: number;
  koujiName: string;
  cycleYears: number;
  cycleTimes: number;
  isActive: boolean;
};

export type KoujiMonthlyType = "budget" | "actual";

export type KoujiMonthlyDto = {
  koujiId: number;
  yyyymm: number;
  type: KoujiMonthlyType;
  amount: number;
};

export async function fetchKoujiList(includeInactive = false) {
  const res = await axiosClient.get<KoujiDto[]>("/api/kouji", { params: { includeInactive } });
  return res.data;
}

export async function fetchKoujiFiscalYearMonthly(fiscalYear: number) {
  const res = await axiosClient.get<KoujiMonthlyDto[]>("/api/kouji/monthly", { params: { fiscalYear } });
  return res.data;
}

export async function upsertKoujiMonthly(input: KoujiMonthlyDto) {
  await axiosClient.post("/api/kouji/monthly", input);
}

export async function deleteKoujiMonthly(koujiId: number, yyyymm: number, type: KoujiMonthlyType) {
  await axiosClient.delete("/api/kouji/monthly", { params: { koujiId, yyyymm, type } });
}

