import axios from "axios";

export type PhotoComment = {
  id: number;
  fileName: string;
  comment: string;
  createdAt: string;
};

export const photoCommentsApi = {
  async list(): Promise<PhotoComment[]> {
    const res = await axios.get<PhotoComment[]>("/api/photo-comments");
    return res.data;
  },

  async create(file: File, comment: string): Promise<PhotoComment> {
    const form = new FormData();
    form.append("file", file);
    form.append("comment", comment);

    const res = await axios.post<PhotoComment>("/api/photo-comments", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  imageUrlById(id: number): string {
    return `/api/photo-comments/${id}/image`;
  },

  // 後方互換（既存DBデータ確認用に残す）
  imageUrlByFileName(fileName: string): string {
    return `/api/photo-comments/image?fileName=${encodeURIComponent(fileName)}`;
  },
};

