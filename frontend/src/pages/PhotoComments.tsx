import { useEffect, useMemo, useState } from "react";
import ContentHeader from "../components/ContentHeader";
import { photoCommentsApi, type PhotoComment } from "../api/photoCommentsApi";
import ImagePreview from "../components/ImagePreview";

const PhotoComments = () => {
  const [items, setItems] = useState<PhotoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState<PhotoComment | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await photoCommentsApi.list();
      setItems(list);
    } catch (e) {
      console.error(e);
      setError("一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("画像を選択してください。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await photoCommentsApi.create(file, comment);
      setFile(null);
      setComment("");
      await load();
    } catch (e) {
      console.error(e);
      setError("登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full">
      <ContentHeader subtitle="Photos" title="写真とコメント" />

      <div className="px-4 pb-8">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-slate-700">
                画像
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-lg border bg-white p-2 text-sm"
              />

              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-600">
                  プレビュー
                </div>
                <div className="mt-2 overflow-hidden rounded-xl border bg-slate-50">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                      画像を選択してください
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">
                コメント
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="この写真のコメント"
                className="mt-2 h-32 w-full resize-none rounded-xl border bg-white p-3 text-sm"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-sm text-red-600">{error ?? ""}</div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? "登録中..." : "登録"}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">
              一覧（カード表示）
            </div>
            <button
              onClick={() => void load()}
              className="rounded-lg border bg-white px-3 py-1 text-sm"
              disabled={loading}
            >
              {loading ? "更新中..." : "更新"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {items.map((x) => (
              <div
                key={x.id}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                <div className="bg-slate-50">
                  <img
                    src={photoCommentsApi.imageUrlById(x.id)}
                    alt={x.fileName}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                    onClick={() => setSelected(x)}
                    role="button"
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm text-slate-900 whitespace-pre-wrap">
                    {x.comment || "（コメントなし）"}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {new Date(x.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && !loading && (
            <div className="mt-6 rounded-xl border bg-white p-6 text-sm text-slate-500">
              まだ登録がありません。
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ImagePreview
          imageUrl={photoCommentsApi.imageUrlById(selected.id)}
          title={selected.fileName}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default PhotoComments;

