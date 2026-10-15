import { useMemo } from 'react';
import type { JobState, QueueJob, TimelineSegment } from '../types';
import { Link } from 'react-router-dom';
import styles from './ActiveTimeBar.module.css';
import { preciseDuration } from '../utils/format';
import { activeTimeTimeline, type RuntimeAverages } from '../utils/job';
import { stateLabel } from '../utils/state';

/**
 * A chronological bar of CI occupancy. Finished jobs show their runtime and a
 * running job its elapsed time (the "active time"); the running ETA and the
 * queued jobs' estimated runtimes are the striped "expected" future. Idle gaps
 * (nothing running) are filled with a neutral hatch, and every job segment
 * links to that job's detail page.
 */
interface ActiveTimeBarProps {
  jobs: QueueJob[];
  now?: number;
  refreshing?: boolean;
  /** Measured runtimes per job class, used for the queued estimates. */
  averages?: RuntimeAverages;
}

export function ActiveTimeBar({ jobs, now, refreshing = false, averages }: ActiveTimeBarProps) {
  const segments = useMemo(
    () => activeTimeTimeline(jobs, { now, averages }),
    [jobs, now, averages],
  );
  if (!segments.length) return null;

  const sum = (predicate: (seg: TimelineSegment) => boolean): number =>
    segments.filter(predicate).reduce((total, seg) => total + seg.seconds, 0);

  const active = sum((seg) => !seg.idle && !seg.future);
  const idle = sum((seg) => Boolean(seg.idle));
  const future = sum((seg) => seg.future);

  const utilization = active + idle > 0 ? Math.round((active / (active + idle)) * 100) : null;

  const label = (seg: TimelineSegment) =>
    `${stateLabel(seg.state as JobState)} · ${preciseDuration(seg.seconds)}`;

  return (
    <div className={styles.activeTime}>
      <div className={styles.activeTimeHead}>
        <span className={styles.activeTimeTitle}>Active time</span>
        <span className={styles.activeTimeTotal}>{preciseDuration(active)}</span>
        {idle > 0 && (
          <span className={styles.activeTimeIdle}>
            <span className={styles.activeTimeValue}>{preciseDuration(idle)}</span> idle
          </span>
        )}
        {utilization != null && (
          <span className={styles.activeTimeUtil}>{utilization}% utilized</span>
        )}
        {future > 0 && (
          <span className={styles.activeTimeFuture}>
            +<span className={styles.activeTimeValue}>{preciseDuration(future)}</span> expected
          </span>
        )}
        {refreshing && <span className="spinner" role="status" aria-label="Updating" />}
      </div>
      <div className={styles.activeTimeBar}>
        {segments.map((seg) => {
          const style = { flexGrow: seg.seconds };
          const key = `${seg.uid ?? 'idle'}-${seg.start}`;

          if (seg.idle) {
            return (
              <span
                key={key}
                className={`${styles.activeTimeSeg} ${styles.isIdle}`}
                style={style}
                title={`Idle · ${preciseDuration(seg.seconds)}`}
              />
            );
          }

          return (
            <Link
              key={key}
              className={`${styles.activeTimeSeg}${seg.future ? ` ${styles.isFuture}` : ''}`}
              data-state={seg.state}
              style={style}
              to={`/details/${seg.uid}`}
              title={label(seg)}
              aria-label={label(seg)}
            />
          );
        })}
      </div>
    </div>
  );
}
