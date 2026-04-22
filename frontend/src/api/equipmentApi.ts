import axios from "axios";

export type Equipment = {
  reportNo: number;
  equipmentCode: string;
  equipmentName: string;
  category: string;
  manufacturer?: string | null;
  model?: string | null;
  location?: string | null;
  note?: string | null;
  updatedAt: string; // ISO string
  isActive?: boolean;
};

export const equipmentApi = {
  async list(): Promise<Equipment[]> {
    const res = await axios.get<Equipment[]>("/api/equipment", {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  async get(reportNo: number): Promise<Equipment> {
    const res = await axios.get<Equipment>(`/api/equipment/${reportNo}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  async update(reportNo: number, patch: Partial<Equipment>): Promise<Equipment> {
    const res = await axios.put<Equipment>(`/api/equipment/${reportNo}`, patch, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },
};

