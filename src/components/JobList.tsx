import { Fragment } from 'react';
import styles from './JobRow.module.css';
import { JobDetail } from './JobDetail';
import { JobRow } from './JobRow';
import type { RuntimeAverages } from '../utils/job';
import type { Job, JobActionName } from '../types';

export interface JobListProps {
  jobs: Job[];
  canManage: boolean;
  onAction: (job: Job, action: JobActionName) => void;
  queuedStarts?: Map<string, number>;
  /** Measured runtimes per job class, used for the queued estimates. */
  averages?: RuntimeAverages;
  expandedUid?: string | null;
  onToggleExpand?: (uid: string) => void;
}

/** Column header + rows. The surrounding section provides the panel chrome. */
export function JobList({
  jobs,
  canManage,
  onAction,
  queuedStarts,
  averages,
  expandedUid,
  onToggleExpand,
}: JobListProps) {
  return (
    <>
      <div className={styles.jobListHead} aria-hidden="true">
        <span>Ref</span>
        <span>Title</span>
        <span>Start Date</span>
        <span>End Date</span>
        <span>Duration</span>
        <span className="text-end">State</span>
      </div>
      <ul className={styles.jobList}>
        {jobs.map((job) => {
          const expanded = expandedUid === job.uid;
          return (
            <Fragment key={job.uid}>
              <JobRow
                job={job}
                canManage={canManage}
                onAction={onAction}
                queuedStarts={queuedStarts}
                averages={averages}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
              />
              {expanded && (
                <li className={styles.jobEmbed} data-state={job.state}>
                  {/* Mounted on demand, so nothing is fetched until expanded. */}
                  <JobDetail path={job.uid} />
                </li>
              )}
            </Fragment>
          );
        })}
      </ul>
    </>
  );
}
