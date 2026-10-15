import { memo } from 'react';
import { GITHUB_REPO } from '../api/config';
import controls from '../styles/controls.module.css';
import jobs from './JobRow.module.css';
import progressStyles from './JobProgress.module.css';
import {
  buildProgress,
  estimatedRuntime,
  jobEnd,
  jobRefLink,
  jobStartDate,
  jobTitle,
  jobTooltip,
  type RuntimeAverages,
} from '../utils/job';
import {
  compactDuration,
  formatDayMonthTime,
  formatEta,
  preciseDuration,
  relativeTime,
} from '../utils/format';
import { FINISHED_STATES } from '../utils/state';
import { Icon } from './Icon';
import { JobActions } from './JobActions';
import { StateBadge } from './StateBadge';
import type { Job, JobActionName } from '../types';

interface DurationCellProps {
  job: Job;
  averages?: RuntimeAverages;
}

function DurationCell({ job, averages }: DurationCellProps) {
  const progress = buildProgress(job.status);

  if (job.state === 'running') {
    if (progress) {
      return (
        <div
          className={jobs.jobDuration}
          title={`fail: ${progress.failed} pass: ${progress.passed} done: ${progress.done}/${progress.total}`}
        >
          <span className="row" style={{ gap: 4 }}>
            {progress.failed > 0 && (
              <Icon name="warning" className={`${controls.stateFg} ${progressStyles.flicker}`} />
            )}
            <span>
              {job.status?.eta != null ? formatEta(job.status.eta) : 'running'} (
              {progress.percent}%)
            </span>
          </span>
          <div className={`${progressStyles.progress} ${jobs.durationProgress}`}>
            <div
              className={`${progressStyles.progressBar} ${progressStyles.isStriped}`}
              data-state={progress.failed ? 'errored' : 'running'}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      );
    }
    return (
      <div className={jobs.jobDuration}>
        <span className="spinner" aria-hidden="true" />
        {job.status?.status ? <em>{job.status.status}…</em> : null}
      </div>
    );
  }

  if (FINISHED_STATES.includes(job.state)) {
    return <div className={jobs.jobDuration}>{preciseDuration(job.runtime ?? 0)}</div>;
  }

  if (job.state === 'queued') {
    return (
      <div className={jobs.jobDuration} title="Estimated from the loaded jobs of this kind">
        <span className="muted">est.</span> {compactDuration(estimatedRuntime(job, averages))}
      </div>
    );
  }

  return <div className={`${jobs.jobDuration} muted`}>-</div>;
}

interface StateCellProps {
  job: Job;
  canManage: boolean;
  onAction: (action: JobActionName) => void;
}

function StateCell({ job, canManage, onAction }: StateCellProps) {
  const failed =
    (job.status?.failed_jobs?.length ?? 0) +
    (job.status?.failed_builds?.length ?? 0) +
    (job.status?.failed_tests?.length ?? 0);

  return (
    <>
      <StateBadge state={job.state} count={failed} />
      <JobActions
        job={job}
        canManage={canManage}
        onAction={onAction}
        variant="menu"
        triggerClassName={jobs.stateTrigger}
      />
    </>
  );
}

export interface JobRowProps {
  job: Job;
  canManage: boolean;
  /** Bound to this row's job by the row itself, so the parent can pass a stable callback. */
  onAction: (job: Job, action: JobActionName) => void;
  queuedStarts?: Map<string, number>;
  /** Measured runtimes per job class, used for the queued estimates. */
  averages?: RuntimeAverages;
  expanded?: boolean;
  onToggleExpand?: (uid: string) => void;
}

/**
 * Rows are pure: given the same job object and expansion state they render the
 * same markup. A `status` update replaces only the affected job object, so
 * comparing the props lets every untouched row skip re-rendering — the
 * dashboard can update one job without reconciling the whole list.
 *
 * `queuedStarts` and `averages` are recomputed (with a fresh identity) on every
 * update, but they only feed a queued row's duration cell, so they are compared
 * by the values that row actually uses.
 */
function areRowsEqual(prev: JobRowProps, next: JobRowProps): boolean {
  if (prev.job !== next.job) return false;
  if (prev.canManage !== next.canManage) return false;
  if (prev.expanded !== next.expanded) return false;
  if (prev.onAction !== next.onAction) return false;
  if (prev.onToggleExpand !== next.onToggleExpand) return false;

  if (next.job.state === 'queued') {
    if (prev.queuedStarts?.get(next.job.uid) !== next.queuedStarts?.get(next.job.uid)) return false;
    if (prev.averages?.full !== next.averages?.full) return false;
    if (prev.averages?.normal !== next.averages?.normal) return false;
    if (prev.averages?.skip !== next.averages?.skip) return false;
  }

  return true;
}

export const JobRow = memo(function JobRow({
  job,
  canManage,
  onAction,
  queuedStarts,
  averages,
  expanded = false,
  onToggleExpand,
}: JobRowProps) {
  const toggle = () => onToggleExpand?.(job.uid);
  const start = jobStartDate(job);
  const end = jobEnd(job);

  // A queued job cannot start before the jobs ahead of it finish. The page
  // estimates that moment from the queue (running job ETA + queued jobs'
  // runtimes guessed from their CI flags) and passes it in as a Map.
  const queuedStart =
    job.state === 'queued' && queuedStarts?.has(job.uid)
      ? new Date(queuedStarts.get(job.uid) as number)
      : null;

  const refLink = jobRefLink(job, GITHUB_REPO);
  const title = jobTitle(job);

  return (
    <li
      className={`${jobs.jobRow} ${expanded ? jobs.isExpanded : ''}`}
      data-state={job.state}
      onClick={toggle}
    >
      <div className={jobs.jobRef}>
        {refLink ? (
          <a
            className={`${controls.refLink} ${jobs.jobRefLink}`}
            href={refLink.url}
            target="_blank"
            rel="noreferrer noopener"
            title={refLink.title}
            data-kind={refLink.kind}
            data-pr-state={refLink.prState}
            onClick={(event) => event.stopPropagation()}
          >
            <Icon name={refLink.icon} size={13} />
            <span className={jobs.refLinkLabel}>{refLink.label}</span>
          </a>
        ) : (
          <span className="muted">-</span>
        )}
      </div>

      <div className={jobs.jobTitle}>
        <button
          type="button"
          className={jobs.jobExpand}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} job ${job.uid.slice(0, 7)}`}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
        >
          <Icon
            name="chevronDown"
            size={14}
            className={expanded ? jobs.isOpen : ''}
          />
        </button>

        <span className={jobs.jobTitleText} title={jobTooltip(job)}>
          {title}
        </span>
      </div>

      <div className={jobs.jobStart}>
        {queuedStart ? (
          <span title="Estimated start, after the jobs ahead in the queue">
            ≥ {formatDayMonthTime(queuedStart)}
          </span>
        ) : start ? (
          <span title={relativeTime(start)}>{formatDayMonthTime(start)}</span>
        ) : (
          <span className="muted">-</span>
        )}
      </div>

      <div className={jobs.jobEnd}>
        {end ? (
          <span title={end.estimated ? 'Estimated end time' : relativeTime(end.date)}>
            {end.estimated ? `~${formatDayMonthTime(end.date)}` : formatDayMonthTime(end.date)}
          </span>
        ) : (
          <span className="muted">-</span>
        )}
      </div>

      <DurationCell job={job} averages={averages} />

      <div className={jobs.jobState} onClick={(event) => event.stopPropagation()}>
        <StateCell job={job} canManage={canManage} onAction={(action) => onAction(job, action)} />
      </div>
    </li>
  );
}, areRowsEqual);
