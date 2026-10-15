// Derives display strings from a Murdock JobModel.

import type {
  BuildProgress,
  IconName,
  Job,
  JobEnd,
  JobRefSource,
  JobState,
  JobStatus,
  PrInfo,
  PrState,
  QueueJob,
  RefLink,
  TimelineSegment,
} from '../types';
import { FINISHED_STATES } from './state';

export function isMergeQueue(ref: string | undefined): boolean {
  return Boolean(
    ref &&
      ref.startsWith('refs/') &&
      ref.split('/').slice(2, 3).join('/') === 'gh-readonly-queue',
  );
}

/** A scheduled nightly run, flagged by the CI via the NIGHTLY env var. */
export function isNightly(env: Record<string, string> | undefined): boolean {
  return env?.NIGHTLY === '1';
}

/** Labels attached to a job, from PR info or the CI_PULL_LABELS env. */
export function jobLabels(job: Pick<Job, 'prinfo' | 'env'>): string[] {
  if (job.prinfo?.labels?.length) return job.prinfo.labels;
  const raw = job.env?.CI_PULL_LABELS;
  return raw ? raw.split(';').filter(Boolean) : [];
}

/** Case-insensitive match of a term against a job's message, PR title or ref. */
export function jobMatchesSearch(
  job: Pick<Job, 'commit' | 'prinfo' | 'ref'>,
  term: string,
): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [job.commit?.message, job.prinfo?.title, job.ref]
    .filter((value): value is string => Boolean(value))
    .join('\n')
    .toLowerCase();
  return haystack.includes(needle);
}

/**
 * Return a copy of `jobs` with the matching job's `status` replaced by a live
 * update. When no job matches, the original array is returned unchanged so a
 * caller can skip re-rendering for a job it is not showing.
 */
export function withJobStatus(jobs: Job[], uid: string, status: JobStatus): Job[] {
  const index = jobs.findIndex((job) => job.uid === uid);
  if (index === -1) return jobs;
  const next = jobs.slice();
  next[index] = { ...next[index], status };
  return next;
}

/** Human representation of a job's ref (branch/tag/merge-queue). */
export function refRepr(job: Pick<Job, 'ref' | 'commit'>): string {
  const ref = job.ref;
  const firstLine = job.commit?.message?.split('\n')[0] ?? '';
  if (ref && ref.startsWith('refs/')) {
    if (isMergeQueue(ref)) return `${firstLine} - Merge Queue`;
    return `${ref.split('/').slice(2).join('/')} @ ${firstLine}`;
  }
  return (ref ?? '').substring(0, 15);
}

/** "(PR #12)" or "(branch @ subject)" used in notifications. */
export function jobContext(job: Pick<Job, 'prinfo' | 'ref' | 'commit'>): string {
  if (job.prinfo) return `(PR #${job.prinfo.number})`;
  return `(${refRepr(job)})`;
}

export function jobTitle(job: Pick<Job, 'prinfo' | 'ref' | 'commit'>): string {
  return job.prinfo ? job.prinfo.title ?? '' : refRepr(job);
}

/** GitHub URL the title links to. */
export function jobTitleUrl(job: Pick<Job, 'prinfo' | 'ref' | 'commit'>, repo: string): string {
  if (job.prinfo) return job.prinfo.url ?? `https://github.com/${repo}`;
  if (isMergeQueue(job.ref)) {
    const target = job.ref?.split('/').slice(3, 4)[0];
    return `https://github.com/${repo}/queue/${target}`;
  }
  if (job.ref && job.ref.startsWith('refs/')) {
    return `https://github.com/${repo}/tree/${job.ref.split('/')[2]}`;
  }
  return `https://github.com/${repo}/commit/${job.commit.sha}`;
}

/** State name used to colour the GitHub mark, or null for neutral. */
export function prStateColor(prinfo: PrInfo | null | undefined): string | null {
  if (!prinfo) return null;
  if (prinfo.is_merged) return 'queued';
  if (prinfo.state === 'closed') return 'errored';
  if (prinfo.state === 'open') return 'passed';
  return null;
}

/** PR lifecycle state, or undefined when GitHub did not report one. */
export function prState(prinfo: PrInfo | null | undefined): PrState | undefined {
  if (!prinfo) return undefined;
  if (prinfo.is_merged) return 'merged';
  if (prinfo.state === 'closed') return 'closed';
  if (prinfo.state === 'open') return 'open';
  return undefined;
}

/** Icon shown in the PR ref badge, by lifecycle state. */
const PR_ICONS: Record<PrState, IconName> = {
  open: 'gitPullRequest',
  closed: 'gitPullRequestClosed',
  merged: 'gitMerge',
};

/** Live build progress, or null when the counters are not yet meaningful. */
export function buildProgress(status: JobStatus | null | undefined): BuildProgress | null {
  if (!status) return null;
  const has = (key: keyof JobStatus) => Object.prototype.hasOwnProperty.call(status, key);
  if (!has('total') || !has('passed') || !has('failed')) return null;
  const total = status.total ?? 0;
  const passed = status.passed ?? 0;
  const failed = status.failed ?? 0;
  if (total < passed + failed) return null;
  const done = passed + failed;
  const percent = total ? Math.round((done * 100) / total) : 0;
  return { done, total, passed, failed, percent };
}

/** Tooltip text for a job row. */
export function jobTooltip(job: Pick<Job, 'commit' | 'prinfo'>): string {
  let text = `Commit: ${job.commit.sha}\n\n${job.commit.message}\n\nAuthor: ${job.commit.author}`;
  if (job.prinfo?.is_merged) text += '\n\nState: merged';
  else if (job.prinfo?.state) text += `\n\nState: ${job.prinfo.state}`;
  if (job.prinfo?.labels?.length) text += `\n\nLabels: "${job.prinfo.labels.join('", "')}"`;
  return text;
}

/**
 * The external reference a job belongs to, with a human label for the link:
 * its pull request, the merge queue, or the branch/tag/commit it was built
 * from. Data comes from the job payload itself (no extra requests).
 */
export function jobRefLink(
  job: JobRefSource,
  repo: string,
): RefLink | null {
  if (job.prinfo?.url) {
    const state = prState(job.prinfo);
    return {
      url: job.prinfo.url,
      label: `PR #${job.prinfo.number}`,
      title: job.prinfo.title ?? `Pull request #${job.prinfo.number}`,
      icon: state ? PR_ICONS[state] : 'gitPullRequest',
      kind: 'pr',
      prState: state,
    };
  }

  const pullNr = job.env?.CI_PULL_NR;
  if (pullNr) {
    return {
      url: `https://github.com/${repo}/pull/${pullNr}`,
      label: `PR #${pullNr}`,
      title: `Pull request #${pullNr}`,
      icon: 'gitPullRequest',
      kind: 'pr',
    };
  }

  if (isMergeQueue(job.ref)) {
    const branch = job.ref?.split('/').slice(3, 4)[0];
    return {
      url: `https://github.com/${repo}/queue/${branch}`,
      label: 'Merge queue',
      title: `Merge queue for ${branch}`,
      icon: 'gitMerge',
      kind: 'merge-queue',
    };
  }

  if (job.ref?.startsWith('refs/heads/')) {
    const branch = job.ref.slice('refs/heads/'.length);
    return {
      url: `https://github.com/${repo}/tree/${branch}`,
      label: branch,
      title: `Branch ${branch}`,
      icon: 'gitBranch',
      kind: 'branch',
    };
  }

  if (job.ref?.startsWith('refs/tags/')) {
    const tag = job.ref.slice('refs/tags/'.length);
    return {
      url: `https://github.com/${repo}/tree/${tag}`,
      label: tag,
      title: `Tag ${tag}`,
      icon: 'tag',
      kind: 'tag',
    };
  }

  if (job.commit?.sha) {
    return {
      url: `https://github.com/${repo}/commit/${job.commit.sha}`,
      label: 'commit',
      title: `Commit ${job.commit.sha}`,
      icon: 'gitCommit',
      kind: 'commit',
    };
  }

  return null;
}

/** When a job started. A zero/absent `start_time` means it never started. */
export function jobStartDate(job: Pick<Job, 'start_time' | 'creation_time'>): Date | null {
  const seconds = [job.start_time, job.creation_time].find((value) => value != null && value > 0);
  return seconds != null ? new Date(seconds * 1000) : null;
}

/**
 * When a job ended. For a running job this is an estimate derived from
 * `status.eta` (seconds remaining), so it is marked as estimated. Queued jobs
 * have not ended.
 */
export function jobEnd(
  job: Pick<Job, 'state' | 'start_time' | 'runtime' | 'status'>,
  now: number = Date.now(),
): JobEnd | null {
  if (job.state === 'running') {
    const eta = job.status?.eta;
    if (eta == null) return null;
    return { date: new Date((now / 1000 + eta) * 1000), estimated: true };
  }

  if (job.state === 'queued') return null;

  const { start_time: startTime, runtime } = job;
  if (startTime != null && startTime > 0 && runtime != null) {
    return { date: new Date((startTime + runtime) * 1000), estimated: false };
  }

  return null;
}

// Murdock jobs fall into three runtime classes: everything that builds the
// whole tree (a full build, the merge queue, a nightly, a branch or a tag),
// a plain pull-request build, and a pull request that skips the compile test.
export type JobClass = 'full' | 'normal' | 'skip';

/** Which runtime class a job belongs to, from its CI flags and ref. */
export function jobClass(job: Pick<Job, 'env' | 'ref'>): JobClass {
  const labels = job.env?.CI_PULL_LABELS ?? '';
  // The two labels are independent, so a job can carry both. A full build is
  // the heavier instruction, and the safer estimate, so it wins.
  if (labels.includes('CI: full build')) return 'full';
  if (labels.includes('CI: skip compile test')) return 'skip';

  // PR jobs carry no ref and no CI_BUILD_REF, so these only match non-PR jobs.
  const ref = job.ref ?? job.env?.CI_BUILD_REF ?? '';
  if (isMergeQueue(ref)) return 'full';
  if (isNightly(job.env)) return 'full';
  if (ref.startsWith('refs/heads/') || ref.startsWith('refs/tags/')) return 'full';
  return 'normal';
}

// Fallback durations (seconds), used until the loaded jobs hold a sample.
const FALLBACK_RUNTIME: Record<JobClass, number> = {
  full: 2 * 60 * 60,
  normal: 15 * 60,
  skip: 3 * 60,
};

/** Typical runtime (seconds) per class, measured from the loaded jobs. */
export type RuntimeAverages = Partial<Record<JobClass, number>>;

/** Middle value of a non-empty list. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Median runtime (seconds) per class, measured from the jobs already on
 * screen. Only successful runs count, so failed and cancelled jobs never
 * enter the average, and the median keeps a few unusually short passing runs
 * from dragging it down. Classes with no sample are left out so the caller
 * can fall back.
 */
export function runtimeAverages(
  jobs: Pick<Job, 'state' | 'runtime' | 'env' | 'ref'>[],
): RuntimeAverages {
  const samples: Record<JobClass, number[]> = { full: [], normal: [], skip: [] };
  for (const job of jobs) {
    const runtime = job.runtime ?? 0;
    if (job.state !== 'passed' || runtime <= 0) continue;
    samples[jobClass(job)].push(runtime);
  }

  const averages: RuntimeAverages = {};
  for (const cls of Object.keys(samples) as JobClass[]) {
    const values = samples[cls];
    if (values.length) averages[cls] = median(values);
  }
  return averages;
}

/**
 * Estimated total runtime (seconds) of a job: the average measured for its
 * class in the loaded jobs, or the fallback when we have no sample yet.
 */
export function estimatedRuntime(
  job: Pick<Job, 'env' | 'ref'>,
  averages?: RuntimeAverages,
): number {
  const cls = jobClass(job);
  const measured = averages?.[cls];
  return measured && measured > 0 ? measured : FALLBACK_RUNTIME[cls];
}

/** Remaining runtime (seconds): the live `status.eta` while running, else the estimate. */
function remainingRuntime(job: QueueJob, now: number, averages?: RuntimeAverages): number {
  if (job.state === 'running') {
    const eta = job.status?.eta;
    if (eta != null) return Math.max(0, eta);
    const start = jobStartDate(job);
    if (start) return Math.max(0, estimatedRuntime(job, averages) - (now - start.getTime()) / 1000);
  }
  return estimatedRuntime(job, averages);
}

/** Shared inputs for the queue/timeline estimates. */
export interface EstimateOptions {
  /** Reference time in milliseconds; defaults to now. */
  now?: number;
  /** Measured runtimes per class, from the loaded jobs. */
  averages?: RuntimeAverages;
}

/**
 * Estimated start time (ms since epoch) for every queued job, assuming the
 * queue is worked through one job at a time. Anything already running holds
 * the worker, so it is counted first even if a queued job was created before
 * it (a fasttracked job jumps the queue). The queued jobs then follow in
 * creation order, each contributing its estimated runtime. Keyed by uid.
 */
export function estimateQueuedStarts(
  jobs: QueueJob[],
  options: EstimateOptions = {},
): Map<string, number> {
  const { averages } = options;
  const now = options.now ?? Date.now();
  const starts = new Map<string, number>();

  let cursor = now;
  for (const job of jobs) {
    if (job.state === 'running') cursor += remainingRuntime(job, now, averages) * 1000;
  }

  const queued = jobs
    .filter((job) => job.state === 'queued')
    .sort((a, b) => (a.creation_time ?? 0) - (b.creation_time ?? 0));

  for (const job of queued) {
    starts.set(job.uid, cursor);
    cursor += remainingRuntime(job, now, averages) * 1000;
  }

  return starts;
}

interface Interval {
  uid: string;
  state: JobState;
  future: boolean;
  start: number;
  end: number;
}

/**
 * Builds a chronological timeline of the loaded jobs for the active-time bar,
 * oldest first. Finished jobs contribute their runtime and a running job its
 * elapsed time; the running job's ETA (or its estimated runtime while the ETA
 * is not yet known) and the queued jobs' estimated runtimes form the future.
 * Gaps between jobs become explicit idle segments, so the bar covers wall-clock
 * time without holes.
 *
 * Each segment is `{ start, end, seconds, idle, future, uid?, state? }` with
 * `start`/`end` in milliseconds and `seconds` as the duration.
 */
export function activeTimeTimeline(
  jobs: QueueJob[],
  options: EstimateOptions = {},
): TimelineSegment[] {
  const { averages } = options;
  const now = options.now ?? Date.now();
  const queuedStarts = estimateQueuedStarts(jobs, { now, averages });
  const intervals: Interval[] = [];

  for (const job of jobs) {
    if (job.state === 'queued') {
      const start = queuedStarts.get(job.uid);
      if (start == null) continue;
      intervals.push({
        uid: job.uid,
        state: job.state,
        future: true,
        start,
        end: start + estimatedRuntime(job, averages) * 1000,
      });
    } else if (job.state === 'running') {
      const start = jobStartDate(job);
      if (start && now > start.getTime()) {
        intervals.push({
          uid: job.uid,
          state: job.state,
          future: false,
          start: start.getTime(),
          end: now,
        });
      }
      // While the build is still setting up ("fetching code", "collecting
      // jobs", ...) there is no live ETA yet. Fall back to the estimated
      // runtime for the expected remainder, so the running job does not leave
      // an idle gap in front of the queued jobs.
      const remaining = remainingRuntime(job, now, averages) * 1000;
      if (remaining > 0) {
        intervals.push({
          uid: job.uid,
          state: job.state,
          future: true,
          start: now,
          end: now + remaining,
        });
      }
    } else if (FINISHED_STATES.includes(job.state) && (job.runtime ?? 0) > 0) {
      const start = jobStartDate(job);
      const runtime = job.runtime ?? 0;
      if (start) {
        intervals.push({
          uid: job.uid,
          state: job.state,
          future: false,
          start: start.getTime(),
          end: start.getTime() + runtime * 1000,
        });
      }
    }
  }

  if (!intervals.length) return [];

  intervals.sort((a, b) => a.start - b.start);

  const segments: Omit<TimelineSegment, 'seconds'>[] = [];
  let cursor = intervals[0].start;
  for (const interval of intervals) {
    const start = Math.max(interval.start, cursor);
    if (start > cursor) {
      segments.push({ idle: true, future: false, start: cursor, end: start });
    }
    if (interval.end > start) {
      segments.push({ ...interval, start, end: interval.end });
      cursor = interval.end;
    }
  }

  return segments.map((segment) => ({ ...segment, seconds: (segment.end - segment.start) / 1000 }));
}
