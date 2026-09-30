"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { useLanguage } from "@/lib/i18n/useLanguage";
import {
  findServiceForProcedure,
  getLocalizedServiceName
} from "@/lib/services/serviceName";
import type { ClientProcedureRecord, Service } from "@/types/domain";
import ClientProcedureModal from "./ClientProcedureModal";
import { formatDate, formatNumber } from "@/lib/i18n/formatDate";

const pageSize = 20;

export default function ClientProcedureTable({
  clientId,
  services,
  records,
  onChange
}: {
  clientId: string;
  services: Service[];
  records: ClientProcedureRecord[];
  onChange: (records: ClientProcedureRecord[]) => void;
}) {
  const { language, t } = useLanguage();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClientProcedureRecord | null>(null);
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const visibleRecords = useMemo(
    () => records.slice((page - 1) * pageSize, page * pageSize),
    [page, records]
  );

  const openAdd = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const openEdit = (record: ClientProcedureRecord) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const saveRecord = (record: ClientProcedureRecord) => {
    const next = records.some((item) => item.id === record.id)
      ? records.map((item) => (item.id === record.id ? record : item))
      : [record, ...records];
    onChange(next);
  };

  const deleteRecord = async (record: ClientProcedureRecord) => {
    if (!window.confirm(t.clients.confirmDelete)) {
      return;
    }

    const response = await adminFetch(
      `/api/admin/clients/${clientId}/procedures/${record.id}`,
      { method: "DELETE" }
    );

    if (response.ok) {
      onChange(records.filter((item) => item.id !== record.id));
    }
  };

  const getRecordServiceName = (record: ClientProcedureRecord) => {
    const service = findServiceForProcedure(
      services,
      record.serviceId,
      record.serviceName,
      language
    );

    return service ? getLocalizedServiceName(service, language) : record.serviceName;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-graphite/65">
          {records.length} {t.clients.procedures}
        </p>
        <button type="button" onClick={openAdd} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.clients.addProcedure}
        </button>
      </div>

      {records.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-champagne/80 bg-pearl/45 p-6 text-center text-sm text-graphite">
          {t.clients.emptyTab}
        </p>
      ) : (
        <>
          <div className="mt-4 hidden max-h-[36rem] overflow-auto rounded-2xl border border-champagne/70 lg:block">
            <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-ink text-xs uppercase tracking-[0.12em] text-white">
                <tr>
                  <th className="px-3 py-3">{t.clients.date}</th>
                  <th className="px-3 py-3">{t.clients.procedures}</th>
                  <th className="px-3 py-3">{t.clients.preparation}</th>
                  <th className="px-3 py-3">{t.clients.amount}</th>
                  <th className="px-3 py-3">{t.clients.unit}</th>
                  <th className="px-3 py-3">{t.clients.area}</th>
                  <th className="px-3 py-3">{t.clients.price}</th>
                  <th className="px-3 py-3">{t.bookings.bookingId}</th>
                  <th className="px-3 py-3">{t.clients.updatedAt}</th>
                  <th className="px-3 py-3">{t.clients.comment}</th>
                  <th className="px-3 py-3">{t.common.edit}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record, index) => (
                  <tr key={record.id} className={index % 2 ? "bg-pearl/55" : "bg-white"}>
                    <td className="px-3 py-3">{formatDate(record.date, language)}</td>
                    <td className="px-3 py-3 font-semibold">{getRecordServiceName(record)}</td>
                    <td className="px-3 py-3">{record.preparationName || "-"}</td>
                    <td className="px-3 py-3">{record.amount || "-"}</td>
                    <td className="px-3 py-3">{record.unit || "-"}</td>
                    <td className="px-3 py-3">{record.area || "-"}</td>
                    <td className="px-3 py-3">{record.price ? `${formatNumber(record.price)} ${t.common.amd}` : "-"}</td>
                    <td className="max-w-[11rem] truncate px-3 py-3">{record.bookingId || "-"}</td>
                    <td className="px-3 py-3">{record.updatedAt}</td>
                    <td className="max-w-xs px-3 py-3 text-graphite/70">{record.comment || record.doctorNotes || "-"}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEdit(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-champagne/70 bg-white" aria-label={t.common.edit}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => void deleteRecord(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700" aria-label={t.common.delete}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 lg:hidden">
            {visibleRecords.map((record) => (
              <article key={record.id} className="rounded-2xl border border-champagne/70 bg-pearl/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-graphite/55">{formatDate(record.date, language)}</p>
                    <p className="mt-1 font-semibold">{getRecordServiceName(record)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEdit(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white" aria-label={t.common.edit}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => void deleteRecord(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-700" aria-label={t.common.delete}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-graphite/75">
                  <span>{t.clients.preparation}: {record.preparationName || "-"}</span>
                  <span>{t.clients.amount}: {record.amount || "-"} {record.unit || ""}</span>
                  <span>{t.clients.area}: {record.area || "-"}</span>
                  <span>{t.clients.price}: {record.price !== undefined ? formatNumber(record.price) : "-"} {t.common.amd}</span>
                  <span>{t.bookings.bookingId}: {record.bookingId || "-"}</span>
                  <span>{t.clients.updatedAt}: {record.updatedAt}</span>
                  <span>{t.clients.comment}: {record.comment || record.doctorNotes || "-"}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="min-h-10 rounded-xl border border-champagne/70 bg-white px-4 disabled:opacity-40">
              {t.clients.previous}
            </button>
            <span>{t.clients.page} {page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="min-h-10 rounded-xl border border-champagne/70 bg-white px-4 disabled:opacity-40">
              {t.clients.next}
            </button>
          </div>
        </>
      )}

      <ClientProcedureModal clientId={clientId} services={services} open={modalOpen} record={editingRecord} onClose={() => setModalOpen(false)} onSaved={saveRecord} />
    </>
  );
}
