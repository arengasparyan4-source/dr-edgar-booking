"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { PortfolioItem } from "@/types/domain";

const emptyItem: PortfolioItem = {
  id: "",
  imageUrl: "/images/doctor.jpg",
  title: { hy: "", ru: "", en: "" },
  order: 1,
  active: true
};

export default function AdminPortfolioPage() {
  const { language, languageOptions, t } = useLanguage();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [draft, setDraft] = useState<PortfolioItem>(emptyItem);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const editorRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUrlInputRef = useRef<HTMLInputElement>(null);

  const loadPortfolio = () => {
    adminFetch("/api/admin/portfolio")
      .then((response) => response.json())
      .then((data) => setPortfolio(data.portfolio ?? []))
      .catch(() => setPortfolio([]));
  };

  useEffect(loadPortfolio, []);

  const savePortfolio = async (items: PortfolioItem[]) => {
    setNotice(null);
    const response = await adminFetch("/api/admin/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolio: items })
    });
    const data = await response.json();

    if (!response.ok || data.success !== true) {
      throw new Error(translateApiError(data, t));
    }

    setPortfolio(data.portfolio ?? []);
    setNotice({ type: "success", text: t.common.saved });
    return true;
  };

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const item = {
      ...draft,
      id: draft.id || `portfolio_${globalThis.crypto.randomUUID()}`
    };
    const next = portfolio.some((current) => current.id === item.id)
      ? portfolio.map((current) => (current.id === item.id ? item : current))
      : [...portfolio, item];

    try {
      const saved = await savePortfolio(next);
      if (saved) {
        setDraft(emptyItem);
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await savePortfolio(portfolio.filter((current) => current.id !== itemId));
      if (draft.id === itemId) {
        setDraft(emptyItem);
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  const startEditing = (item: PortfolioItem) => {
    setDraft({ ...item, title: { ...item.title } });
    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      imageUrlInputRef.current?.focus({ preventScroll: true });
    });
  };

  const formatUploadError = (message: string) => {
    if (message === "Invalid file type") {
      return t.clients.invalidFileType;
    }

    if (message === "File too large") {
      return t.clients.fileTooLarge;
    }

    return message || t.clients.somethingWentWrong;
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    setUploadingImage(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await adminFetch("/api/admin/portfolio/upload", {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (!response.ok || data.success !== true || typeof data.imageUrl !== "string") {
        throw new Error(translateApiError(data, t));
      }

      setDraft((current) => ({ ...current, imageUrl: data.imageUrl }));
      setNotice({ type: "success", text: t.clients.photoUploaded });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.clients.somethingWentWrong;
      setNotice({ type: "error", text: formatUploadError(message) });
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  };

  return (
    <AdminShell title={t.portfolio.title} subtitle={t.portfolio.subtitle}>
      <form
        ref={editorRef}
        onSubmit={saveItem}
        className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
      >
        <h2 className="text-xl font-semibold">
          {draft.id ? t.portfolio.editPhoto : t.portfolio.addPhoto}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="md:col-span-2">
            <span className="field-label">{t.portfolio.imageUrl}</span>
            <input
              ref={imageUrlInputRef}
              className="field-control min-h-12"
              value={draft.imageUrl}
              onChange={(event) =>
                setDraft({ ...draft, imageUrl: event.target.value })
              }
              required
            />
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={uploadImage}
            />
            {draft.imageUrl ? (
              <div className="relative mt-3 aspect-[4/5] w-32 overflow-hidden rounded-2xl bg-champagne-glow">
                <Image
                  key={draft.imageUrl}
                  src={draft.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="128px"
                  className="object-cover"
                  data-testid="portfolio-draft-preview"
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="mt-3 min-h-11 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {uploadingImage ? t.common.loading : t.clients.uploadPhoto}
            </button>
          </label>
          <label>
            <span className="field-label">{t.portfolio.changeOrder}</span>
            <input
              className="field-control min-h-12"
              type="number"
              value={draft.order}
              onChange={(event) =>
                setDraft({ ...draft, order: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {languageOptions.map((option) => (
            <label key={option.code}>
              <span className="field-label">
                {t.portfolio.caption} ({option.shortLabel})
              </span>
              <input
                className="field-control min-h-12"
                value={draft.title[option.code]}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    title: { ...draft.title, [option.code]: event.target.value }
                  })
                }
                required
              />
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-3 rounded-2xl bg-pearl p-4">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) =>
              setDraft({ ...draft, active: event.target.checked })
            }
          />
          <span className="text-sm font-semibold">{t.portfolio.active}</span>
        </label>
        <button
          type="submit"
          disabled={uploadingImage}
          className="mt-5 min-h-12 rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t.portfolio.savePhoto}
        </button>
      </form>

      {notice ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {notice.text}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portfolio.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-3xl border border-champagne/60 bg-white/86 shadow-soft"
          >
            <div className="relative aspect-[4/5] bg-champagne-glow">
              <Image
                src={item.imageUrl}
                alt={item.title[language]}
                fill
                unoptimized
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <p className="text-lg font-semibold">{item.title[language]}</p>
              <p className="mt-1 text-sm text-graphite/65">
                #{item.order} · {item.active ? t.common.active : t.common.inactive}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(item)}
                  className="min-h-11 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  {t.common.edit}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  className="min-h-11 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold"
                >
                  {t.common.delete}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
