import axios from "axios";
import type { Template, TemplateListItem } from "../types/report";

export type PagePrintSetting = {
  pageCode: string;
  templateId: number;
};

export type PrintSourceResponse = {
  scalar: Array<{ key: string; label: string }>;
  tables: Array<{
    key: string;
    label: string;
    columns: Array<{ key: string; label: string }>;
  }>;
};

export const printSettingsApi = {
  async getPageSetting(pageCode: string): Promise<PagePrintSetting | null> {
    try {
      const res = await axios.get<PagePrintSetting>(`/api/print-settings/${pageCode}`, {
        headers: { Accept: "application/json" },
      });
      return res.data;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },

  async setPageSetting(pageCode: string, templateId: number, updatedUser: string) {
    await axios.put(
      `/api/print-settings/${pageCode}`,
      { pageCode, templateId, updatedUser },
      { headers: { Accept: "application/json" } }
    );
  },

  async getMappings(pageCode: string, templateId: number): Promise<Record<string, string>> {
    const res = await axios.get<Record<string, string>>(
      `/api/print-mapping/pages/${encodeURIComponent(pageCode)}/templates/${templateId}`,
      { headers: { Accept: "application/json" } }
    );
    return res.data;
  },

  async saveMappings(
    pageCode: string,
    templateId: number,
    mappings: Record<string, string>,
    updatedUser: string
  ) {
    await axios.put(
      `/api/print-mapping/pages/${encodeURIComponent(pageCode)}/templates/${templateId}`,
      { updatedUser, mappings },
      { headers: { Accept: "application/json" } }
    );
  },

  async getSources(pageCode: string): Promise<PrintSourceResponse> {
    const res = await axios.get<PrintSourceResponse>(
      `/api/print-mapping/pages/${encodeURIComponent(pageCode)}/sources`,
      { headers: { Accept: "application/json" } }
    );
    return res.data;
  },
};

// re-export types used by settings UI
export type { Template, TemplateListItem };

