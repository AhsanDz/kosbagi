"use client";

import { useRef, useState } from "react";
import { ArrowsClockwiseIcon, CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import { ResolveJobDialog } from "@/components/admin/resolve-job-dialog";
import { ChainStatus } from "@/components/common/chain-status";
import { LoadError } from "@/components/common/load-error";
import { StackedListHead, StackedListItem, StackedListMeta } from "@/components/common/stacked-list";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminJobsKey, fetchAdminJobs, resolveAdminJob, retryAdminJob } from "@/lib/api/admin";
import { toApiError } from "@/lib/api/client";
import type { AdminJobDto, AdminJobsPayload, AdminJobsView } from "@/lib/api/types";
import { JOB_TYPE_LABELS, jobChainStatus, jobReference, MAX_JOB_ATTEMPTS } from "@/lib/admin";
import { formatDateTime, formatDayMonth } from "@/lib/format";

/** Job yang sedang menunggu worker biasanya selesai kurang dari satu menit. */
const WAITING_REFRESH_MS = 5_000;

function hasWaitingJob(payload: AdminJobsPayload): boolean {
  return payload.jobs.some((job) => job.status === "QUEUED" || job.status === "PENDING");
}

/** Semua data yang ikut berubah setelah job dikirim ulang atau ditandai ditangani. */
function isAffectedKey(key: unknown): boolean {
  return (
    typeof key === "string" &&
    (key.startsWith("/admin/") || key.startsWith("/periods/") || key.startsWith("/reconciliation"))
  );
}

/** Ringkasan yang perlu dibaca ulang begitu antrean selesai dipantau (temuan QA R1). */
function isSummaryKey(key: unknown): boolean {
  return (
    typeof key === "string" &&
    (key === "/admin/summary" || key.startsWith("/periods/") || key.startsWith("/reconciliation"))
  );
}

/** Job gagal yang masih bisa diulang atau ditandai ditangani. */
function isActionable(job: AdminJobDto): boolean {
  return job.status === "FAILED" && !job.resolution;
}

function jobName(job: AdminJobDto): string {
  return `${JOB_TYPE_LABELS[job.type]} ${jobReference(job)}`;
}

const SKELETON_ROWS = ["baris-1", "baris-2", "baris-3"];

/*
 * Lebar kolom mengikuti Figma ("Baris job on-chain"), kecuali Aksi yang dilebarkan
 * dari 180 ke 270 px supaya Coba lagi dan Tandai ditangani muat berdampingan.
 * Lebarnya diambil dari Jenis, Referensi, Percobaan, dan Status; total tetap 1.120 px.
 */
function HeadRow() {
  return (
    <TableHeader>
      <TableRow className="border-0">
        <TableHead className="w-[180px]">Jenis</TableHead>
        <TableHead className="w-[220px]">Referensi</TableHead>
        <TableHead className="w-[160px]">Dibuat</TableHead>
        <TableHead className="w-[100px]">Percobaan</TableHead>
        <TableHead className="w-[190px]">Status</TableHead>
        <TableHead className="w-[270px]">Aksi</TableHead>
      </TableRow>
    </TableHeader>
  );
}

/** Isi kolom Aksi: dua tombol untuk job gagal, catatan untuk job yang sudah ditangani. */
function ActionCell({
  job,
  retrying,
  onRetry,
  onResolve,
}: {
  job: AdminJobDto;
  retrying: boolean;
  onRetry: (job: AdminJobDto) => void;
  onResolve: (job: AdminJobDto) => void;
}) {
  if (job.resolution) {
    const { resolvedBy, resolvedAt, note } = job.resolution;
    return (
      <span className="flex min-w-0 flex-col gap-0.5 whitespace-normal">
        <span
          className="truncate text-xs leading-4 font-medium text-card-foreground"
          title={`Ditangani ${resolvedBy.name}, ${formatDateTime(resolvedAt)}`}
        >
          Ditangani {resolvedBy.name}, {formatDayMonth(resolvedAt)}
        </span>
        <span className="truncate text-xs leading-4 text-muted-foreground" title={note}>
          {note}
        </span>
      </span>
    );
  }
  if (isActionable(job)) {
    const name = jobName(job);
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={retrying}
          aria-busy={retrying}
          onClick={() => onRetry(job)}
        >
          <ArrowsClockwiseIcon
            aria-hidden
            data-icon="inline-start"
            className={retrying ? "animate-spin" : undefined}
          />
          Coba lagi
          <span className="sr-only"> {name}</span>
        </Button>
        <Button type="button" variant="outline" size="xs" disabled={retrying} onClick={() => onResolve(job)}>
          Tandai ditangani
          <span className="sr-only"> {name}</span>
        </Button>
      </span>
    );
  }
  return <span className="text-sm leading-5 text-muted-foreground">Otomatis</span>;
}

interface JobTableProps {
  view: AdminJobsView;
  jobs: AdminJobDto[] | undefined;
  retryingId: string | null;
  onRetry: (job: AdminJobDto) => void;
  onResolve: (job: AdminJobDto) => void;
}

/**
 * Antrean job versi daftar untuk kartu yang lebih sempit dari tabel 1.000 px
 * (ponsel dan laptop kecil, P5). Isinya sama dengan baris tabel: jenis,
 * status, referensi, waktu dibuat, percobaan, lalu tombol atau penanganannya.
 */
function JobList({ jobs, retryingId, onRetry, onResolve }: Omit<JobTableProps, "view">) {
  if (jobs !== undefined && jobs.length === 0) return null;

  return (
    <ul className="@min-[62.5rem]:hidden" aria-label="Antrean job on-chain">
      {jobs === undefined
        ? SKELETON_ROWS.map((key) => (
            <StackedListItem key={key} className="gap-2.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-48 max-w-full" />
              <Skeleton className="h-3 w-36" />
            </StackedListItem>
          ))
        : jobs.map((job) => (
            <StackedListItem key={job.id} className="gap-2">
              <StackedListHead
                title={JOB_TYPE_LABELS[job.type]}
                value={
                  <ChainStatus
                    status={jobChainStatus[job.status]}
                    txHash={job.txHash ?? undefined}
                    className="flex-wrap justify-end"
                  />
                }
              />
              <StackedListMeta className="font-mono break-all text-card-foreground">
                {jobReference(job)}
              </StackedListMeta>
              <StackedListMeta>
                Dibuat {formatDateTime(job.createdAt)}, percobaan {job.attempts} dari {MAX_JOB_ATTEMPTS}
              </StackedListMeta>
              {job.status === "FAILED" && job.lastError && !job.resolution ? (
                <StackedListMeta className="text-destructive">{job.lastError}</StackedListMeta>
              ) : null}
              {isActionable(job) || job.resolution ? (
                <div className="pt-1">
                  <ActionCell
                    job={job}
                    retrying={retryingId === job.id}
                    onRetry={onRetry}
                    onResolve={onResolve}
                  />
                </div>
              ) : null}
            </StackedListItem>
          ))}
    </ul>
  );
}

/**
 * Tabel antrean job on-chain (Figma: "Baris job on-chain"). Tombol di kolom Aksi
 * memakai Outline dan rata kiri. Job Gagal punya Coba lagi dan Tandai ditangani;
 * job yang sudah ditangani menulis siapa yang menanganinya dan catatannya; job
 * lain diulang otomatis oleh worker.
 */
function JobTable({ view, jobs, retryingId, onRetry, onResolve }: JobTableProps) {
  return (
    <div className="@container overflow-hidden rounded-xl bg-card text-card-foreground">
      <div className="hidden @min-[62.5rem]:block">
        <Table className="min-w-[1000px] table-fixed">
          <HeadRow />
          <TableBody>
            {jobs === undefined
              ? SKELETON_ROWS.map((key) => (
                  <TableRow key={key} aria-hidden className="h-16">
                    <TableCell>
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-35 max-w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-12" />
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                ))
              : jobs.map((job) => (
                  <TableRow key={job.id} className="h-16">
                    <TableCell>
                      <span className="flex flex-col gap-0.5">
                        <span className="truncate text-sm leading-5 font-medium">{JOB_TYPE_LABELS[job.type]}</span>
                        <span className="truncate font-mono text-xs leading-4 text-muted-foreground">{job.type}</span>
                      </span>
                    </TableCell>
                    <TableCell className="truncate font-mono" title={job.reference}>
                      {jobReference(job)}
                    </TableCell>
                    <TableCell>{formatDateTime(job.createdAt)}</TableCell>
                    <TableCell className="tabular-nums">
                      {job.attempts} dari {MAX_JOB_ATTEMPTS}
                    </TableCell>
                    <TableCell
                      className="whitespace-normal"
                      title={job.status === "FAILED" ? (job.lastError ?? undefined) : undefined}
                    >
                      <ChainStatus
                        status={jobChainStatus[job.status]}
                        txHash={job.txHash ?? undefined}
                        className="flex-wrap"
                      />
                      {job.status === "FAILED" && job.lastError ? (
                        <span className="sr-only">. Penyebab terakhir: {job.lastError}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <ActionCell
                        job={job}
                        retrying={retryingId === job.id}
                        onRetry={onRetry}
                        onResolve={onResolve}
                      />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      <JobList jobs={jobs} retryingId={retryingId} onRetry={onRetry} onResolve={onResolve} />
      {jobs === undefined ? <p className="sr-only">Memuat antrean job.</p> : null}
      {jobs !== undefined && jobs.length === 0 ? (
        <Empty className="rounded-none border-0 px-6 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircleIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle className="mt-2">
              {view === "open" ? "Tidak ada job yang menunggu atau gagal" : "Belum ada job on-chain"}
            </EmptyTitle>
            <EmptyDescription>
              {view === "open"
                ? "Semua pencatatan on-chain sudah selesai. Lihat tab Semua untuk riwayat."
                : "Job muncul di sini setelah ada pembayaran, persetujuan KYC, atau biaya yang dicatat."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  );
}

/**
 * Antrean job on-chain di ringkasan admin: tab "Menunggu atau gagal" dan
 * "Semua" berjumlah, tabel job, Coba lagi (POST /admin/jobs/:id/retry), dan
 * Tandai ditangani (POST /admin/jobs/:id/resolve) untuk job yang gagal permanen.
 * Processor memeriksa status on-chain dulu, jadi job yang ternyata sudah masuk
 * blok diakui tercatat, bukan dikirim dua kali.
 */
export function JobQueue() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const [view, setView] = useState<AdminJobsView>("open");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<AdminJobDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [watch, setWatch] = useState(false);
  // Status pemantauan terakhir, untuk tahu kapan antrean selesai dipantau.
  const watchingRef = useRef(false);

  const open = useSWR(adminJobsKey("open"), fetchAdminJobs, {
    refreshInterval: watch ? WAITING_REFRESH_MS : 0,
    onSuccess: (payload) => {
      const waiting = hasWaitingJob(payload);
      // Antrean baru saja selesai: kartu Perlu perhatian, periode, dan ringkasan
      // rekonsiliasi dibaca ulang supaya tidak tertinggal dari tabel.
      if (watchingRef.current && !waiting) void mutateGlobal(isSummaryKey);
      watchingRef.current = waiting;
      setWatch(waiting);
    },
  });
  const all = useSWR(adminJobsKey("all"), fetchAdminJobs, {
    refreshInterval: watch ? WAITING_REFRESH_MS : 0,
  });

  async function retry(job: AdminJobDto) {
    setRetryingId(job.id);
    try {
      await retryAdminJob(job.id);
      watchingRef.current = true;
      setWatch(true);
      toast.success(`${JOB_TYPE_LABELS[job.type]} dikirim ulang`, {
        description: "Worker memeriksa status on-chain dulu, lalu mengirim transaksi bila perlu.",
      });
    } catch (caught) {
      const error = toApiError(caught);
      if (error.code === "JOB_NOT_FAILED") {
        toast.info("Job ini tidak lagi gagal", {
          description: "Statusnya sudah berubah. Daftar dimuat ulang.",
        });
      } else if (error.code === "JOB_RESOLVED") {
        toast.info("Job ini sudah ditandai ditangani", {
          description: "Job yang sudah ditangani tidak dikirim ulang. Daftar dimuat ulang.",
        });
      } else {
        toast.error("Job belum dikirim ulang", { description: error.message });
      }
    } finally {
      setRetryingId(null);
      void mutateGlobal(isAffectedKey);
    }
  }

  async function resolve(note: string): Promise<string | null> {
    if (!resolving) return null;
    const job = resolving;
    setSubmitting(true);
    try {
      await resolveAdminJob(job.id, note);
      setResolving(null);
      toast.success(`${JOB_TYPE_LABELS[job.type]} ditandai ditangani`, {
        description: "Job tidak dikirim ulang dan tidak lagi menghalangi penutupan periode.",
      });
      return null;
    } catch (caught) {
      const error = toApiError(caught);
      if (error.code === "VALIDATION_ERROR") return error.message;
      setResolving(null);
      if (error.code === "JOB_NOT_FAILED" || error.code === "JOB_ALREADY_RESOLVED") {
        toast.info("Job ini tidak perlu ditandai lagi", {
          description: "Statusnya sudah berubah. Daftar dimuat ulang.",
        });
      } else {
        toast.error("Job belum ditandai ditangani", { description: error.message });
      }
      return null;
    } finally {
      setSubmitting(false);
      void mutateGlobal(isAffectedKey);
    }
  }

  const tabs: { value: AdminJobsView; label: string; query: typeof open }[] = [
    { value: "open", label: "Menunggu atau gagal", query: open },
    { value: "all", label: "Semua", query: all },
  ];

  return (
    <section id="antrean-job" aria-labelledby="judul-antrean" className="flex scroll-mt-6 flex-col gap-4">
      <Tabs value={view} onValueChange={(value) => setView(value as AdminJobsView)} className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="judul-antrean" className="text-h4 font-semibold">
              Antrean job on-chain
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              Job blockchain dari outbox. Worker mengulang otomatis sampai {MAX_JOB_ATTEMPTS} kali;
              setelah itu admin bisa mengulang, atau menandainya ditangani bila gagal permanen.
            </p>
          </div>
          <TabsList
            variant="line"
            className="w-auto shrink-0 gap-5 border-b-0 sm:gap-5"
            aria-label="Tampilan antrean job"
          >
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.query.data ? `${tab.label} (${tab.query.data.jobs.length})` : tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {!tab.query.data && tab.query.error ? (
              <LoadError
                title="Antrean job gagal dimuat"
                retrying={tab.query.isValidating}
                onRetry={() => void tab.query.mutate()}
              />
            ) : (
              <JobTable
                view={tab.value}
                jobs={tab.query.data?.jobs}
                retryingId={retryingId}
                onRetry={(job) => void retry(job)}
                onResolve={setResolving}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
      <ResolveJobDialog
        open={resolving !== null}
        onOpenChange={(next) => {
          if (!next) setResolving(null);
        }}
        jobName={resolving ? jobName(resolving) : "Job ini"}
        submitting={submitting}
        onSubmit={resolve}
      />
    </section>
  );
}
