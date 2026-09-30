"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, Trash2, Upload, X } from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { ClientPhoto, ClientPhotoCategory } from "@/types/domain";
import { formatDate } from "@/lib/i18n/formatDate";

type ClientPhotosGalleryProps = {
  clientId: string;
  photos: ClientPhoto[];
  onChange: (photos: ClientPhoto[]) => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const acceptedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const today = () => new Date().toISOString().slice(0, 10);

export default function ClientPhotosGallery({
  clientId,
  photos,
  onChange
}: ClientPhotosGalleryProps) {
  const { language, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ClientPhotoCategory>("other");
  const [date, setDate] = useState(today);
  const [comment, setComment] = useState("");
  const [preview, setPreview] = useState<ClientPhoto | null>(null);
  const [previewCategory, setPreviewCategory] =
    useState<ClientPhotoCategory>("other");
  const [previewDate, setPreviewDate] = useState(today);
  const [previewComment, setPreviewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const categoryLabels: Record<ClientPhotoCategory, string> = {
    before: t.clients.before,
    after: t.clients.after,
    document: t.clients.document,
    other: t.clients.other
  };

  const validateFile = (nextFile: File) => {
    const extension = nextFile.name.slice(nextFile.name.lastIndexOf(".")).toLowerCase();
    if (!acceptedMimeTypes.has(nextFile.type) || !acceptedExtensions.includes(extension)) {
      setFile(null);
      setError(t.clients.validPhotoRequired);
      return false;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError(t.clients.fileTooLarge);
      return false;
    }

    setError("");
    return true;
  };

  const chooseFile = (nextFile?: File) => {
    if (nextFile && validateFile(nextFile)) {
      setFile(nextFile);
      setMessage("");
    }
  };

  const uploadPhoto = async () => {
    if (!file || saving) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("category", category);
      formData.set("date", date);
      formData.set("comment", comment);
      const response = await adminFetch(`/api/admin/clients/${clientId}/photos`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      onChange([data.photo, ...photos]);
      setFile(null);
      setCategory("other");
      setDate(today());
      setComment("");
      setMessage(t.clients.photoUploaded);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (uploadError) {
      const errorMessage =
        uploadError instanceof Error ? uploadError.message : "Upload failed";
      setError(
        errorMessage === "Invalid file type"
            ? t.clients.validPhotoRequired
          : errorMessage === "File too large"
            ? t.clients.fileTooLarge
            : t.clients.somethingWentWrong
      );
    } finally {
      setSaving(false);
    }
  };

  const openPreview = (photo: ClientPhoto) => {
    setPreview(photo);
    setPreviewCategory(photo.category);
    setPreviewDate(photo.date);
    setPreviewComment(photo.comment ?? "");
    setError("");
    setMessage("");
  };

  const savePreview = async () => {
    if (!preview || saving) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await adminFetch(
        `/api/admin/clients/${clientId}/photos/${preview.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: previewCategory,
            date: previewDate,
            comment: previewComment
          })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      onChange(photos.map((photo) => (photo.id === data.photo.id ? data.photo : photo)));
      setPreview(data.photo);
      setMessage(t.clients.photoSaved);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t.clients.somethingWentWrong
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePhoto = async () => {
    if (!preview || saving || !window.confirm(t.clients.confirmDelete)) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await adminFetch(
        `/api/admin/clients/${clientId}/photos/${preview.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      onChange(photos.filter((photo) => photo.id !== preview.id));
      setPreview(null);
      setMessage(t.clients.photoDeleted);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t.clients.somethingWentWrong
      );
    } finally {
      setSaving(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-champagne/70 bg-pearl/45 p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-champagne bg-white/70 p-4 text-center text-sm font-semibold text-graphite transition hover:bg-white"
        >
          <ImagePlus className="h-6 w-6 text-ink" aria-hidden="true" />
          {file ? file.name : t.clients.dropPhoto}
        </button>

        <div className="mt-4 grid gap-3 md:grid-cols-[0.7fr_0.8fr_1.5fr_auto] md:items-end">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/60">
            {t.clients.photos}
            <select
              className="field-control mt-2 normal-case tracking-normal"
              value={category}
              onChange={(event) => setCategory(event.target.value as ClientPhotoCategory)}
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/60">
            {t.clients.date}
            <input
              type="date"
              className="field-control mt-2 normal-case tracking-normal"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/60">
            {t.clients.comment}
            <input
              className="field-control mt-2 normal-case tracking-normal"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void uploadPhoto()}
            disabled={!file || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {saving ? t.common.loading : t.clients.uploadPhoto}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>

      {photos.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {photos.map((photo) => (
            <button
              type="button"
              key={photo.id}
              onClick={() => openPreview(photo)}
              className="overflow-hidden rounded-2xl border border-champagne/70 bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:border-ink/30"
            >
              <Image
                src={photo.url}
                alt={photo.comment || photo.originalName}
                width={480}
                height={320}
                loading="lazy"
                unoptimized
                className="h-40 w-full object-cover"
              />
              <span className="block p-3">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/60">
                  {categoryLabels[photo.category]}
                </span>
                <span className="mt-1 block text-sm font-semibold text-ink">{formatDate(photo.date, language)}</span>
                {photo.comment ? (
                  <span className="mt-1 block truncate text-xs text-graphite/70">
                    {photo.comment}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-champagne/80 bg-pearl/45 p-6 text-center text-sm text-graphite">
          {t.clients.noPhotos}
        </p>
      )}

      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 p-4">
          <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-champagne/70 bg-white p-4 shadow-2xl">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="grid h-10 w-10 place-items-center rounded-full border border-champagne/70 bg-white text-ink"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Image
              src={preview.url}
              alt={preview.comment || preview.originalName}
              width={1200}
              height={900}
              unoptimized
              className="mt-2 max-h-[52vh] w-full rounded-2xl bg-pearl object-contain"
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/60">
                {t.clients.photos}
                <select
                  className="field-control mt-2 normal-case tracking-normal"
                  value={previewCategory}
                  onChange={(event) =>
                    setPreviewCategory(event.target.value as ClientPhotoCategory)
                  }
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/60">
                {t.clients.date}
                <input
                  type="date"
                  className="field-control mt-2 normal-case tracking-normal"
                  value={previewDate}
                  onChange={(event) => setPreviewDate(event.target.value)}
                />
              </label>
            </div>
            <label className="mt-3 block text-xs font-bold uppercase tracking-[0.12em] text-graphite/60">
              {t.clients.comment}
              <textarea
                className="field-control mt-2 min-h-24 normal-case tracking-normal"
                value={previewComment}
                onChange={(event) => setPreviewComment(event.target.value)}
              />
            </label>
            {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
            {message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => void deletePhoto()}
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t.clients.deletePhoto}
              </button>
              <button
                type="button"
                onClick={() => void savePreview()}
                disabled={saving}
                className="inline-flex min-h-11 items-center rounded-2xl bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? t.common.loading : t.clients.savePhoto}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
