"use client";

import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileArchive,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Upload,
  UsersRound,
  X
} from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import ClientEditorModal from "@/components/admin/ClientEditorModal";
import ClientRating, { RankBadge, SegmentBadge } from "@/components/admin/ClientRating";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { ChannelBadge } from "@/components/ChannelIcon";
import { CHANNEL_LABELS, MESSAGE_CHANNELS } from "@/lib/messaging/channels";
import type {
  ClientImportIssueCode,
  ClientImportPreview,
  DuplicateBehavior
} from "@/lib/clients/clientImport";
import type { Booking, Client, ClientStatus, MessageChannel } from "@/types/domain";
import { formatDate, formatNumber } from "@/lib/i18n/formatDate";
import {
  TOP_CLIENTS_COUNT,
  getClientStats,
  groupBookingsByClient,
  percentOf,
  rankClients,
  type ClientStats
} from "@/lib/clients/clientSegments";
import { scoreClientMatch } from "@/lib/clients/clientSearch";
import { clinicToday } from "@/lib/time/clinicTime";

type ImportSummary = {
  added: number;
  updated: number;
  skipped: number;
  errors: number;
};

type DeleteMode = "selected" | "all";
type CategoryKey =
  | "all"
  | "active"
  | "sleeping"
  | "lost"
  | "new"
  | "upcoming"
  | "oneVisit"
  | "withoutBookings"
  | "onlineBooking"
  | "debtors"
  | "vip"
  | "blacklist";
type SortKey = "name" | "lastVisitDate" | "createdAt" | "balance" | "visits" | "spent";

const displayValue = (value?: string | number) =>
  value === undefined || value === "" ? "-" : String(value);

const formatAmount = (value?: number) =>
  value === undefined ? "-" : formatNumber(value);

const exportHref = (format: "excel" | "access", range = "all") =>
  `/api/admin/export/${format}?range=${range}`;

export default function AdminClientsPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [editorOpen, setEditorOpen] = useState(false);
  const [category, setCategory] = useState<CategoryKey>("all");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");
  const [vipFilter, setVipFilter] = useState<"all" | "vip" | "nonVip">("all");
  const [blacklistFilter, setBlacklistFilter] =
    useState<"all" | "blacklisted" | "clean">("all");
  const [debtFilter, setDebtFilter] = useState<"all" | "debt" | "noDebt">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [preview, setPreview] = useState<ClientImportPreview | null>(null);
  const [duplicateBehavior, setDuplicateBehavior] =
    useState<DuplicateBehavior>("update");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [importError, setImportError] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(
    () => new Set()
  );
  const [deleteMode, setDeleteMode] = useState<DeleteMode | null>(null);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const groupsMenuRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const issueLabels: Record<ClientImportIssueCode, string> = {
    phoneRequired: t.clients.phoneRequired,
    invalidPhone: t.clients.invalidPhone,
    duplicateClient: t.clients.duplicateClient,
    duplicateInFile: t.clients.duplicateClient
  };

  const loadClients = () => {
    adminFetch("/api/admin/clients")
      .then((response) => response.json())
      .then((data) => setClients(data.clients ?? []))
      .catch(() => setClients([]));
  };

  const loadBookings = () => {
    adminFetch("/api/admin/bookings")
      .then((response) => response.json())
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    loadClients();
    loadBookings();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!groupsOpen) {
      return;
    }

    const closeGroupsMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGroupsOpen(false);
      }
    };
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      if (
        groupsMenuRef.current &&
        !groupsMenuRef.current.contains(event.target as Node)
      ) {
        setGroupsOpen(false);
      }
    };

    document.addEventListener("keydown", closeGroupsMenu);
    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      document.removeEventListener("keydown", closeGroupsMenu);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [groupsOpen]);

  const bookingsByClientId = useMemo(
    () => groupBookingsByClient(clients, bookings),
    [bookings, clients]
  );

  const getBookingsForClient = useCallback(
    (client: Client) => bookingsByClientId.get(client.id) ?? [],
    [bookingsByClientId]
  );

  // Segments, visits and the activity rating come from one shared module
  // (also used by the dashboard and the unit tests), in the clinic's "today".
  const statsByClientId = useMemo(() => {
    const today = clinicToday();
    return new Map(
      clients.map((client) => [
        client.id,
        getClientStats(client, bookingsByClientId.get(client.id) ?? [], today)
      ])
    );
  }, [bookingsByClientId, clients]);

  const getStatsForClient = useCallback(
    (client: Client) =>
      statsByClientId.get(client.id) ?? getClientStats(client, [], clinicToday()),
    [statsByClientId]
  );

  const rankedClients = useMemo(
    () => rankClients(clients, bookingsByClientId, clinicToday()),
    [bookingsByClientId, clients]
  );

  const rankByClientId = useMemo(
    () => new Map(rankedClients.map((entry) => [entry.client.id, entry.rank])),
    [rankedClients]
  );

  const categoryDefinitions = useMemo(() => {
    const definitions: Array<{
      key: CategoryKey;
      label: string;
      subtitle: string;
      dotClass: string;
      predicate: (client: Client, stats: ClientStats, bookings: Booking[]) => boolean;
    }> = [
      {
        key: "all",
        label: t.clients.allClients,
        subtitle: t.clients.allClientsSubtitle,
        dotClass: "bg-ink",
        predicate: () => true
      },
      // Active / sleeping / lost / new are one computed segment per client,
      // so their percentages add up to 100.
      {
        key: "active",
        label: t.clients.active,
        subtitle: t.clients.activeSubtitle,
        dotClass: "bg-emerald-500",
        predicate: (_client, stats) => stats.segment === "active"
      },
      {
        key: "sleeping",
        label: t.clients.sleeping,
        subtitle: t.clients.sleepingSubtitle,
        dotClass: "bg-amber-400",
        predicate: (_client, stats) => stats.segment === "sleeping"
      },
      {
        key: "lost",
        label: t.clients.lost,
        subtitle: t.clients.lostSubtitle,
        dotClass: "bg-red-500",
        predicate: (_client, stats) => stats.segment === "lost"
      },
      {
        key: "new",
        label: t.clients.newClient,
        subtitle: t.clients.newSubtitle,
        dotClass: "bg-sky-500",
        predicate: (_client, stats) => stats.segment === "new"
      },
      {
        key: "upcoming",
        label: t.clients.withUpcomingBooking,
        subtitle: t.clients.withUpcomingBookingSubtitle,
        dotClass: "bg-violet-500",
        predicate: (_client, stats) => stats.hasUpcoming
      },
      {
        key: "oneVisit",
        label: t.clients.oneVisitClients,
        subtitle: t.clients.oneVisitClientsSubtitle,
        dotClass: "bg-cyan-500",
        predicate: (_client, stats) => stats.visits === 1
      },
      {
        key: "withoutBookings",
        label: t.clients.withoutBookings,
        subtitle: t.clients.withoutBookingsSubtitle,
        dotClass: "bg-slate-400",
        predicate: (_client, stats, clientBookings) =>
          clientBookings.length === 0 && !stats.hasUpcoming
      },
      {
        key: "onlineBooking",
        label: t.clients.onlineBookingClients,
        subtitle: t.clients.onlineBookingClientsSubtitle,
        dotClass: "bg-teal-500",
        predicate: (client, _stats, clientBookings) =>
          client.source === "booking" || clientBookings.length > 0
      },
      {
        key: "debtors",
        label: t.clients.debtors,
        subtitle: t.clients.debtorsSubtitle,
        dotClass: "bg-orange-500",
        predicate: (client) => (client.balance ?? 0) > 0
      },
      {
        key: "vip",
        label: t.clients.vip,
        subtitle: t.clients.vipSubtitle,
        dotClass: "bg-fuchsia-500",
        predicate: (_client, stats) => stats.isVip
      },
      {
        key: "blacklist",
        label: t.clients.blacklist,
        subtitle: t.clients.blacklistSubtitle,
        dotClass: "bg-slate-800",
        predicate: (_client, stats) => stats.isBlacklisted
      }
    ];

    return definitions;
  }, [t.clients]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<CategoryKey, number>();

    for (const definition of categoryDefinitions) {
      counts.set(
        definition.key,
        clients.filter((client) =>
          definition.predicate(client, getStatsForClient(client), getBookingsForClient(client))
        ).length
      );
    }

    return counts;
  }, [categoryDefinitions, clients, getBookingsForClient, getStatsForClient]);

  const activeCategory = useMemo(
    () => categoryDefinitions.find((item) => item.key === category),
    [category, categoryDefinitions]
  );

  const filteredClients = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLocaleLowerCase();

    return clients
      .filter((client) => {
        const matchesCategory = activeCategory
          ? activeCategory.predicate(
              client,
              getStatsForClient(client),
              getBookingsForClient(client)
            )
          : true;
        const matchesQuery = normalizedQuery
          ? [
              client.fullName,
              client.firstName,
              client.lastName,
              client.phone,
              client.normalizedPhone,
              client.comment,
              client.email,
              client.address
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase()
              .includes(normalizedQuery) ||
            // Names typed in another script: "Гаспарян" finds "Գասպարյան".
            scoreClientMatch(client, debouncedQuery) > 0
          : true;
        const matchesStatus =
          statusFilter === "all" || client.status === statusFilter;
        const matchesChannel =
          channelFilter === "all" || (client.preferredChannel ?? "sms") === channelFilter;
        const matchesVip =
          vipFilter === "all" ||
          (vipFilter === "vip" ? client.isVip : !client.isVip);
        const matchesBlacklist =
          blacklistFilter === "all" ||
          (blacklistFilter === "blacklisted"
            ? client.isBlacklisted
            : !client.isBlacklisted);
        const matchesDebt =
          debtFilter === "all" ||
          (debtFilter === "debt"
            ? (client.balance ?? 0) > 0
            : (client.balance ?? 0) <= 0);

        return (
          matchesCategory &&
          matchesQuery &&
          matchesStatus &&
          matchesChannel &&
          matchesVip &&
          matchesBlacklist &&
          matchesDebt
        );
      })
      .sort((a, b) => {
        if (sortKey === "name") {
          return a.fullName.localeCompare(b.fullName);
        }

        if (sortKey === "balance") {
          return (b.balance ?? 0) - (a.balance ?? 0);
        }

        if (sortKey === "lastVisitDate") {
          return (getStatsForClient(b).lastVisitDate ?? "").localeCompare(
            getStatsForClient(a).lastVisitDate ?? ""
          );
        }

        if (sortKey === "visits") {
          // Rating order; clients without a rank go last.
          const rankA = rankByClientId.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const rankB = rankByClientId.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return rankA - rankB || a.fullName.localeCompare(b.fullName);
        }

        if (sortKey === "spent") {
          return (
            getStatsForClient(b).totalSpent - getStatsForClient(a).totalSpent ||
            a.fullName.localeCompare(b.fullName)
          );
        }

        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [
    blacklistFilter,
    channelFilter,
    clients,
    debtFilter,
    activeCategory,
    debouncedQuery,
    sortKey,
    statusFilter,
    vipFilter,
    getBookingsForClient,
    getStatsForClient,
    rankByClientId
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const visiblePage = Math.min(page, totalPages);
  const paginatedClients = useMemo(
    () => filteredClients.slice((visiblePage - 1) * pageSize, visiblePage * pageSize),
    [filteredClients, pageSize, visiblePage]
  );

  const visibleClientIds = useMemo(
    () => paginatedClients.map((client) => client.id),
    [paginatedClients]
  );
  const selectedCount = selectedClientIds.size;
  const allVisibleSelected =
    visibleClientIds.length > 0 &&
    visibleClientIds.every((clientId) => selectedClientIds.has(clientId));

  const selectedCountText = t.clients.selectedCountLabel.replace(
    "{count}",
    String(selectedCount)
  );

  const stopRowClick = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const toggleClientSelection = (clientId: string) => {
    setNotice(null);
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const selectVisibleClients = () => {
    setNotice(null);
    setSelectedClientIds((current) => {
      const next = new Set(current);
      visibleClientIds.forEach((clientId) => next.add(clientId));
      return next;
    });
  };

  const deselectAllClients = () => {
    setNotice(null);
    setSelectedClientIds(new Set());
  };

  const openSelectedDeleteModal = () => {
    if (selectedClientIds.size === 0) {
      setNotice({ type: "error", text: t.clients.noClientsSelected });
      return;
    }

    setDeleteMode("selected");
  };

  const openDeleteAllModal = () => {
    setDeleteAllConfirmation("");
    setDeleteMode("all");
  };

  const closeDeleteModal = () => {
    if (deleting) {
      return;
    }

    setDeleteMode(null);
    setDeleteAllConfirmation("");
  };

  const resetImportState = () => {
    setSelectedFileName("");
    setPreview(null);
    setSummary(null);
    setImportError("");
    setLoadingPreview(false);
    setLoadingConfirm(false);
    setDuplicateBehavior("update");
  };

  const closeImport = () => {
    setImportOpen(false);
    resetImportState();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setPreview(null);
    setSummary(null);
    setImportError("");
    setLoadingPreview(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await adminFetch("/api/admin/clients/import-preview", {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      setPreview(data.preview);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t.errors.generic);
    } finally {
      setLoadingPreview(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) {
      return;
    }

    setImportError("");
    setSummary(null);
    setLoadingConfirm(true);

    try {
      const response = await adminFetch("/api/admin/clients/import-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          duplicateBehavior
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      setSummary(data.summary);
      setClients(data.clients ?? []);
      setPreview(null);
      setSelectedFileName("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t.errors.generic);
    } finally {
      setLoadingConfirm(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteMode) {
      return;
    }

    setDeleting(true);
    setNotice(null);

    try {
      const payload =
        deleteMode === "all"
          ? { deleteAll: true, confirmation: deleteAllConfirmation }
          : { clientIds: Array.from(selectedClientIds) };
      const response = await adminFetch("/api/admin/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      setClients(
        data.clients ??
          (deleteMode === "all"
            ? []
            : clients.filter((client) => !selectedClientIds.has(client.id)))
      );
      setSelectedClientIds(new Set());
      setDeleteMode(null);
      setDeleteAllConfirmation("");
      setNotice({
        type: "success",
        text: `${t.clients.deleteSuccess} (${data.deleted ?? 0})`
      });
      loadClients();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.deleteError
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatIssues = (codes: ClientImportIssueCode[]) =>
    codes.map((code) => issueLabels[code]).join(", ");

  const statusOptions: Array<ClientStatus | "all"> = [
    "all",
    "active",
    "sleeping",
    "lost",
    "new",
    "vip",
    "blacklist",
    "inactive"
  ];

  /** Rating place (top clients), activity segment, VIP and blacklist marks. */
  const renderBadges = (client: Client) => {
    const stats = getStatsForClient(client);
    const rank = rankByClientId.get(client.id);

    return (
      <>
        {rank !== undefined && rank <= TOP_CLIENTS_COUNT ? <RankBadge rank={rank} /> : null}
        <SegmentBadge segment={stats.segment} />
        {stats.isVip ? (
          <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
            {t.clients.vip}
          </span>
        ) : null}
        {stats.isBlacklisted ? (
          <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
            {t.clients.blacklist}
          </span>
        ) : null}
      </>
    );
  };

  const statusLabel = (status: ClientStatus | "all") => {
    if (status === "all") {
      return t.common.all;
    }

    const labels: Record<ClientStatus, string> = {
      active: t.clients.active,
      sleeping: t.clients.sleeping,
      lost: t.clients.lost,
      new: t.clients.newClient,
      vip: t.clients.vip,
      blacklist: t.clients.blacklist,
      inactive: t.clients.inactive
    };
    return labels[status];
  };

  return (
    <AdminShell title={t.clients.title} subtitle={t.clients.subtitle}>
      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite/45"
                aria-hidden="true"
              />
              <input
                className="field-control min-h-12 pl-12"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.clients.searchPlaceholder}
              />
            </label>
            <div ref={groupsMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setGroupsOpen((open) => !open)}
                aria-expanded={groupsOpen}
                aria-haspopup="menu"
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition lg:w-auto ${
                  category === "all"
                    ? "border-champagne/70 bg-white text-ink hover:bg-pearl"
                    : "border-ink bg-ink text-white"
                }`}
              >
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                {t.clients.clientGroups}
                <ChevronDown
                  className={`h-4 w-4 transition ${groupsOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {groupsOpen ? (
                <div
                  role="menu"
                  aria-label={t.clients.clientGroups}
                  className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-champagne/80 bg-white p-2 shadow-premium"
                >
                  <div className="max-h-80 overflow-y-auto">
                    {categoryDefinitions.map((definition) => {
                      const count = categoryCounts.get(definition.key) ?? 0;
                      const percent = percentOf(count, clients.length);
                      const active = category === definition.key;

                      return (
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          key={definition.key}
                          onClick={() => {
                            setCategory(definition.key);
                            setGroupsOpen(false);
                          }}
                          className={`grid min-h-11 w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                            active
                              ? "bg-ink text-white"
                              : "text-ink hover:bg-pearl"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${definition.dotClass}`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 truncate font-semibold">
                            {definition.label}
                          </span>
                          <span className={`text-xs ${active ? "text-white/65" : "text-graphite/50"}`}>
                            {percent}%
                          </span>
                          <span className="min-w-7 text-right font-semibold">{count}</span>
                          {active ? (
                            <Check className="h-3.5 w-3.5 justify-self-end" aria-hidden="true" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 border-t border-champagne/60 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCategory("all");
                        setGroupsOpen(false);
                      }}
                      className="flex min-h-10 w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-graphite transition hover:bg-pearl"
                    >
                      {t.clients.clearFilter}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-5 py-3 text-sm font-semibold text-ink"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.clients.addClient}
            </button>
            <button
              type="button"
              onClick={() => {
                resetImportState();
                setImportOpen(true);
              }}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t.clients.importFromExcel}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <select
              className="field-control min-h-12"
              value={channelFilter}
              onChange={(event) =>
                setChannelFilter(event.target.value as MessageChannel | "all")
              }
              aria-label={t.channels.title}
              data-testid="clients-channel-filter"
            >
              <option value="all">{t.channels.filterAll}</option>
              {MESSAGE_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
            <select
              className="field-control min-h-12"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ClientStatus | "all")
              }
              aria-label={t.clients.status}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <select
              className="field-control min-h-12"
              value={vipFilter}
              onChange={(event) =>
                setVipFilter(event.target.value as "all" | "vip" | "nonVip")
              }
              aria-label={t.clients.vip}
            >
              <option value="all">{t.common.all}</option>
              <option value="vip">{t.clients.vip}</option>
              <option value="nonVip">{t.clients.nonVip}</option>
            </select>
            <select
              className="field-control min-h-12"
              value={blacklistFilter}
              onChange={(event) =>
                setBlacklistFilter(event.target.value as "all" | "blacklisted" | "clean")
              }
              aria-label={t.clients.blacklist}
            >
              <option value="all">{t.common.all}</option>
              <option value="blacklisted">{t.clients.blacklist}</option>
              <option value="clean">{t.clients.notBlacklisted}</option>
            </select>
            <select
              className="field-control min-h-12"
              value={debtFilter}
              onChange={(event) =>
                setDebtFilter(event.target.value as "all" | "debt" | "noDebt")
              }
              aria-label={t.clients.debtors}
            >
              <option value="all">{t.common.all}</option>
              <option value="debt">{t.clients.debtors}</option>
              <option value="noDebt">{t.clients.noDebt}</option>
            </select>
            <select
              className="field-control min-h-12"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              aria-label={t.clients.sortBy}
            >
              <option value="createdAt">{t.clients.sortCreatedAt}</option>
              <option value="name">{t.clients.sortName}</option>
              <option value="lastVisitDate">{t.clients.sortLastVisitDate}</option>
              <option value="balance">{t.clients.sortBalance}</option>
              <option value="visits">{t.rating.sortVisits}</option>
              <option value="spent">{t.rating.sortSpent}</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-champagne/55 pt-3">
            <p className="text-sm font-semibold text-graphite/70">
              {t.clients.showingClients} {filteredClients.length} / {clients.length}{" "}
              {t.clients.clientsLabel}
            </p>
            {category !== "all" && activeCategory ? (
              <button
                type="button"
                onClick={() => setCategory("all")}
                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-ink/15 bg-ink px-3 py-1 text-xs font-semibold text-white"
              >
                {activeCategory.label}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {rankedClients.length > 0 ? (
        <ClientRating
          ranked={rankedClients}
          limit={5}
          footer={
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setSortKey("visits");
                setPage(1);
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-pearl"
            >
              {t.rating.sortVisits}
            </button>
          }
        />
      ) : null}

      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/55">
              {t.clients.exportSectionTitle}
            </p>
            <p className="mt-1 text-sm text-graphite/70">
              {t.clients.exportSectionSubtitle}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a href={exportHref("excel")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
              <Download className="h-4 w-4" aria-hidden="true" />
              {t.clients.exportExcel}
            </a>
            <a href={exportHref("access")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 text-sm font-semibold text-ink">
              <FileArchive className="h-4 w-4" aria-hidden="true" />
              {t.clients.exportAccess}
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
          <span />
          <button
            type="button"
            onClick={selectVisibleClients}
            disabled={visibleClientIds.length === 0 || allVisibleSelected}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t.clients.selectAll}
          </button>
          <button
            type="button"
            onClick={deselectAllClients}
            disabled={selectedCount === 0}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t.clients.deselectAll}
          </button>
          <button
            type="button"
            onClick={openDeleteAllModal}
            disabled={clients.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#B85C55]/40 bg-white px-4 py-2 text-sm font-semibold text-[#7A342F] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t.clients.deleteAllClients}
          </button>
        </div>
      </section>

      {notice ? (
        <p
          className={`rounded-3xl border p-4 text-sm font-semibold shadow-soft ${
            notice.type === "success"
              ? "border-sage/30 bg-sage/10 text-sage"
              : "border-[#B85C55]/40 bg-[#B85C55]/10 text-[#7A342F]"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {selectedCount > 0 ? (
        <section className="rounded-3xl border border-champagne/60 bg-ink p-4 text-white shadow-soft">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <p className="text-sm font-semibold">{selectedCountText}</p>
            <button
              type="button"
              onClick={deselectAllClients}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              {t.clients.deselectAll}
            </button>
            <button
              type="button"
              onClick={openSelectedDeleteModal}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#B85C55] px-4 py-2 text-sm font-semibold text-white"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t.clients.deleteSelected}
            </button>
          </div>
        </section>
      ) : null}

      <section className="hidden overflow-hidden rounded-3xl border border-champagne/60 bg-white/86 shadow-soft lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] border-collapse text-left text-sm">
            <thead className="bg-pearl text-xs uppercase tracking-[0.14em] text-graphite/55">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectVisibleClients();
                      } else {
                        setSelectedClientIds((current) => {
                          const next = new Set(current);
                          visibleClientIds.forEach((clientId) => next.delete(clientId));
                          return next;
                        });
                      }
                    }}
                    aria-label={t.clients.selectAll}
                  />
                </th>
                <th className="px-4 py-3">{t.clients.fullName}</th>
                <th className="px-4 py-3">{t.clients.phone}</th>
                <th className="px-4 py-3">{t.channels.column}</th>
                <th className="px-4 py-3">{t.rating.visits}</th>
                <th className="px-4 py-3">{t.rating.spent}</th>
                <th className="px-4 py-3">{t.clients.comment}</th>
                <th className="px-4 py-3">{t.clients.balance}</th>
                <th className="px-4 py-3">{t.clients.discount}</th>
                <th className="px-4 py-3">{t.clients.birthDate}</th>
                <th className="px-4 py-3">{t.clients.email}</th>
                <th className="px-4 py-3">{t.clients.address}</th>
                <th className="px-4 py-3">{t.common.details}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/admin/clients/${client.id}`)}
                  className="cursor-pointer border-t border-champagne/50 align-top transition hover:bg-pearl/70"
                >
                  <td className="px-4 py-4" onClick={stopRowClick}>
                    <input
                      type="checkbox"
                      checked={selectedClientIds.has(client.id)}
                      onChange={() => toggleClientSelection(client.id)}
                      aria-label={`${t.clients.selectedClients}: ${client.fullName}`}
                    />
                  </td>
                  <td className="min-w-[16rem] px-4 py-4">
                    <p className="font-semibold">{displayValue(client.fullName)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{renderBadges(client)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <a
                      href={`tel:${client.normalizedPhone}`}
                      onClick={stopRowClick}
                      className="font-semibold text-ink"
                    >
                      {client.normalizedPhone}
                    </a>
                    <p className="mt-1 text-xs text-graphite/55">{client.phone}</p>
                  </td>
                  <td className="px-4 py-4" data-testid={`client-row-channel-${client.id}`}>
                    <ChannelBadge channel={client.preferredChannel ?? "sms"} />
                  </td>
                  <td className="px-4 py-4 font-semibold">{getStatsForClient(client).visits}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {formatNumber(getStatsForClient(client).totalSpent)} {t.common.amd}
                  </td>
                  <td className="px-4 py-4">
                    <p className="max-w-xs text-graphite/70">{displayValue(client.comment)}</p>
                  </td>
                  <td className="px-4 py-4">{formatAmount(client.balance)}</td>
                  <td className="px-4 py-4">{formatAmount(client.discount)}</td>
                  <td className="px-4 py-4">{formatDate(client.birthDate, language)}</td>
                  <td className="px-4 py-4">{displayValue(client.email)}</td>
                  <td className="px-4 py-4">{displayValue(client.address)}</td>
                  <td className="px-4 py-4 font-semibold text-graphite/70">
                    {t.clients.clientProfile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredClients.length === 0 ? (
          <p className="border-t border-champagne/50 p-5 text-sm text-graphite/65">
            {t.clients.noClients}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:hidden">
        {paginatedClients.map((client) => (
          <article
            key={client.id}
            onClick={() => router.push(`/admin/clients/${client.id}`)}
            className="cursor-pointer rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedClientIds.has(client.id)}
                  onClick={stopRowClick}
                  onChange={() => toggleClientSelection(client.id)}
                  className="mt-1"
                  aria-label={`${t.clients.selectedClients}: ${client.fullName}`}
                />
                <div className="min-w-0">
                  <p className="text-xl font-semibold">{displayValue(client.fullName)}</p>
                  <a
                    href={`tel:${client.normalizedPhone}`}
                    onClick={stopRowClick}
                    className="mt-1 block text-sm text-graphite/70"
                  >
                    {client.normalizedPhone}
                  </a>
                </div>
              </div>
              <span className="rounded-full bg-pearl px-3 py-1 text-xs font-semibold text-graphite/65">
                {client.source || "excel"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ChannelBadge channel={client.preferredChannel ?? "sms"} />
              {renderBadges(client)}
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <span>
                {t.rating.visits}: {getStatsForClient(client).visits} · {t.rating.spent}:{" "}
                {formatNumber(getStatsForClient(client).totalSpent)} {t.common.amd}
              </span>
              <span>{t.clients.comment}: {displayValue(client.comment)}</span>
              <span>{t.clients.balance}: {formatAmount(client.balance)}</span>
              <span>{t.clients.discount}: {formatAmount(client.discount)}</span>
              <span>{t.clients.birthDate}: {formatDate(client.birthDate, language)}</span>
              <span>{t.clients.email}: {displayValue(client.email)}</span>
              <span>{t.clients.address}: {displayValue(client.address)}</span>
            </div>
          </article>
        ))}
        {filteredClients.length === 0 ? (
          <p className="rounded-3xl border border-champagne/60 bg-white/86 p-5 text-sm text-graphite/65 shadow-soft">
            {t.clients.noClients}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-graphite/70">
            {t.clients.recordsPerPage}
            <select
              className="rounded-xl border border-champagne/70 bg-white px-3 py-2"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as 25 | 50 | 100);
                setPage(1);
              }}
            >
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <button type="button" disabled={visiblePage <= 1} onClick={() => setPage(visiblePage - 1)} className="min-h-10 rounded-xl border border-champagne/70 bg-white px-4 disabled:opacity-40">
              {t.clients.previous}
            </button>
            <span>{t.clients.page} {visiblePage} / {totalPages}</span>
            <button type="button" disabled={visiblePage >= totalPages} onClick={() => setPage(visiblePage + 1)} className="min-h-10 rounded-xl border border-champagne/70 bg-white px-4 disabled:opacity-40">
              {t.clients.next}
            </button>
          </div>
        </div>
      </section>

      {deleteMode ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <section className="w-full rounded-t-3xl border border-champagne/60 bg-[#F8F3EF] p-5 shadow-premium sm:max-w-lg sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/50">
                  {t.clients.confirmDelete}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {deleteMode === "all"
                    ? t.clients.deleteAllClients
                    : t.clients.deleteSelected}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-champagne/70 bg-white text-ink"
                aria-label={t.common.close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-graphite/75">
              {deleteMode === "all"
                ? t.clients.deleteAllConfirmationText
                : t.clients.deleteConfirmationText}
            </p>
            {deleteMode === "all" ? (
              <label className="mt-4 block">
                <span className="field-label">{t.clients.typeDeleteClients}</span>
                <input
                  className="field-control min-h-12"
                  value={deleteAllConfirmation}
                  onChange={(event) => setDeleteAllConfirmation(event.target.value)}
                  placeholder="DELETE CLIENTS"
                />
              </label>
            ) : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-champagne/70 bg-white px-5 py-3 text-sm font-semibold text-ink disabled:opacity-50"
              >
                {t.clients.cancelDelete}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={
                  deleting ||
                  (deleteMode === "all" && deleteAllConfirmation !== "DELETE CLIENTS")
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#B85C55] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {deleting ? t.common.loading : t.clients.yesDelete}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ClientEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={(client) => {
          setClients((current) => [
            client,
            ...current.filter((item) => item.id !== client.id)
          ]);
          setNotice({ type: "success", text: t.clients.clientSaved });
        }}
      />

      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-champagne/60 bg-[#F8F3EF] p-5 shadow-premium sm:max-w-6xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/50">
                  {t.clients.importFromExcel}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{t.clients.preview}</h2>
                <p className="mt-1 text-sm text-graphite/65">{t.clients.fileHelp}</p>
              </div>
              <button
                type="button"
                onClick={closeImport}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-champagne/70 bg-white text-ink"
                aria-label={t.common.close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-3xl border border-dashed border-champagne bg-white/80 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                  <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t.clients.chooseFile}</span>
                  <span className="mt-1 block truncate text-sm text-graphite/65">
                    {selectedFileName || ".xlsx, .csv"}
                  </span>
                </span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                />
              </label>

              <div className="rounded-3xl border border-champagne/60 bg-white/86 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/50">
                  {t.clients.duplicateBehavior}
                </p>
                <div className="mt-3 grid gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="radio"
                      name="duplicateBehavior"
                      value="update"
                      checked={duplicateBehavior === "update"}
                      onChange={() => setDuplicateBehavior("update")}
                    />
                    {t.clients.updateExisting}
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="radio"
                      name="duplicateBehavior"
                      value="skip"
                      checked={duplicateBehavior === "skip"}
                      onChange={() => setDuplicateBehavior("skip")}
                    />
                    {t.clients.skipDuplicates}
                  </label>
                </div>
              </div>
            </div>

            {loadingPreview ? (
              <p className="mt-4 rounded-3xl border border-champagne/60 bg-white/86 p-4 text-sm font-semibold">
                {t.common.loading}
              </p>
            ) : null}

            {importError ? (
              <p className="mt-4 rounded-3xl border border-[#B85C55]/40 bg-[#B85C55]/10 p-4 text-sm font-semibold text-ink">
                {importError}
              </p>
            ) : null}

            {preview ? (
              <div className="mt-5 grid gap-5">
                <section className="grid gap-3 sm:grid-cols-4">
                  {[
                    [t.clients.totalRows, preview.summary.totalRows],
                    [t.clients.validRows, preview.summary.validRows],
                    [t.clients.errorRows, preview.summary.errorRows],
                    [t.clients.duplicateRows, preview.summary.duplicateRows]
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-3xl border border-champagne/60 bg-white/86 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/50">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-semibold">{value}</p>
                    </div>
                  ))}
                </section>

                <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4">
                  <p className="text-sm font-semibold">{t.clients.detectedColumns}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preview.detectedColumns.map((column) => (
                      <span
                        key={column}
                        className="rounded-full bg-pearl px-3 py-1 text-xs font-semibold text-graphite/70"
                      >
                        {column}
                      </span>
                    ))}
                  </div>
                  <p className="mt-5 text-sm font-semibold">{t.clients.mappedFields}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(preview.mappedFields).map(([field, column]) => (
                      <span
                        key={field}
                        className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white"
                      >
                        {field}: {column}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-3xl border border-champagne/60 bg-white/86">
                  <div className="border-b border-champagne/50 p-4">
                    <p className="text-sm font-semibold">{t.clients.firstTwentyRows}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
                      <thead className="bg-pearl text-xs uppercase tracking-[0.14em] text-graphite/55">
                        <tr>
                          <th className="px-4 py-3">{t.clients.fullName}</th>
                          <th className="px-4 py-3">{t.clients.phone}</th>
                          <th className="px-4 py-3">{t.clients.comment}</th>
                          <th className="px-4 py-3">{t.clients.balance}</th>
                          <th className="px-4 py-3">{t.clients.discount}</th>
                          <th className="px-4 py-3">{t.clients.birthDate}</th>
                          <th className="px-4 py-3">{t.clients.email}</th>
                          <th className="px-4 py-3">{t.clients.address}</th>
                          <th className="px-4 py-3">{t.clients.validationStatus}</th>
                          <th className="px-4 py-3">{t.clients.duplicateStatus}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.previewRows.map((row) => {
                          const errorCodes = row.errors.map((error) => error.code);
                          const warningCodes = row.warnings.map((warning) => warning.code);
                          const hasErrors = errorCodes.length > 0;

                          return (
                            <tr
                              key={row.rowNumber}
                              className="border-t border-champagne/50 align-top"
                            >
                              <td className="px-4 py-3 font-semibold">
                                {displayValue(row.values.fullName)}
                              </td>
                              <td className="px-4 py-3">
                                {row.normalizedPhone || row.values.phone || "-"}
                              </td>
                              <td className="px-4 py-3">{displayValue(row.values.comment)}</td>
                              <td className="px-4 py-3">{displayValue(row.values.balance)}</td>
                              <td className="px-4 py-3">{displayValue(row.values.discount)}</td>
                              <td className="px-4 py-3">{formatDate(row.values.birthDate, language)}</td>
                              <td className="px-4 py-3">{displayValue(row.values.email)}</td>
                              <td className="px-4 py-3">{displayValue(row.values.address)}</td>
                              <td className="px-4 py-3">
                                {hasErrors ? (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-[#B85C55]/10 px-3 py-1 text-xs font-semibold text-[#7A342F]">
                                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                    {formatIssues(errorCodes)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-sage/10 px-3 py-1 text-xs font-semibold text-sage">
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    OK
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {warningCodes.length > 0 ? (
                                  <span className="rounded-full bg-[#A16A28]/10 px-3 py-1 text-xs font-semibold text-[#A16A28]">
                                    {formatIssues(warningCodes)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={loadingConfirm || preview.summary.validRows === 0}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {loadingConfirm ? t.common.loading : t.clients.confirmImport}
                </button>
              </div>
            ) : null}

            {summary ? (
              <section className="mt-5 rounded-3xl border border-champagne/60 bg-white/86 p-4">
                <p className="text-sm font-semibold">{t.clients.importSummary}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {[
                    [t.clients.added, summary.added],
                    [t.clients.updated, summary.updated],
                    [t.clients.skipped, summary.skipped],
                    [t.clients.errors, summary.errors]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-pearl p-3">
                      <p className="text-xs font-semibold text-graphite/60">{label}</p>
                      <p className="mt-1 text-2xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
