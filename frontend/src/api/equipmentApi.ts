import axios from "axios";

export type Equipment = {
  equipmentId: number;
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

  async get(equipmentId: number): Promise<Equipment> {
    const res = await axios.get<Equipment>(`/api/equipment/${equipmentId}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  async update(equipmentId: number, patch: Partial<Equipment>): Promise<Equipment> {
    const res = await axios.put<Equipment>(`/api/equipment/${equipmentId}`, patch, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },
};

