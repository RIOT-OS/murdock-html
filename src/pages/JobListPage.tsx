import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GITHUB_REPO, ITEMS_DISPLAYED_STEP } from '../api/config';
import { deleteJob, getJobs, restartJob } from '../api/murdock';
import {
  queryParamsToApiQuery,
  queryParamsToSearchParams,
  queryStringToQueryParams,
} from '../api/query';
import { useAuth } from '../auth/AuthContext';
import { ActiveTimeBar } from '../components/ActiveTimeBar';
import { CurrentJob } from '../components/CurrentJob';
import { JobDetail } from '../components/JobDetail';
import { JobFilters } from '../components/JobFilters';
import { useFilters } from '../components/FiltersContext';
import { JobList } from '../components/JobList';
import { JobSection } from '../components/JobSection';
import { ShowMore } from '../components/ShowMore';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMurdockSocket } from '../hooks/useMurdockSocket';
import {
  estimateQueuedStarts,
  isMergeQueue,
  isNightly,
  jobContext,
  jobLabels,
  jobMatchesSearch,
  runtimeAverages,
  withJobStatus,
} from '../utils/job';
import dashboard from '../components/JobListPage.module.css';
import { withViewTransition } from '../utils/viewTransition';
import { FINISHED_STATES, STATES } from '../utils/state';
import type {
  DraftParams,
  Job,
  JobActionName,
  JobState,
  JobType,
  QueryParams,
} from '../types';

// How many queued jobs to look at when estimating queued start times.
const QUEUE_LOOKAHEAD = 100;
// Running jobs are few, but they are the head of the queue: fetch them on
// their own so a long queue cannot push them past the page limit.
const RUNNING_LIMIT = 25;

export function JobListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => queryStringToQueryParams(searchParams.toString()), [searchParams]);
  const apiQuery = useMemo(() => queryParamsToApiQuery(params), [params]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [queue, setQueue] = useState<Job[]>([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const { open: filtersOpen } = useFilters();
  const [draft, setDraft] = useState<DraftParams>({
    sha: params.sha,
    author: params.author,
    prnum: params.prnum,
    branch: params.branch,
    tag: params.tag,
    search: params.search,
  });

  const { canManage, user } = useAuth();
  const { notify } = useToast();

  useDocumentTitle(`Murfrog - ${GITHUB_REPO}`);

  // Keep the local text draft in sync with the committed query params.
  useEffect(() => {
    setDraft({
      sha: params.sha,
      author: params.author,
      prnum: params.prnum,
      branch: params.branch,
      tag: params.tag,
      search: params.search,
    });
  }, [params.sha, params.author, params.prnum, params.branch, params.tag, params.search]);

  // Fetch the (filtered) job list and the global running/queued queue together
  // so a refresh swaps both in one animated commit. Crucially the previous data
  // stays on screen while a background reload is in flight — only the very first
  // load shows the spinner, so socket updates no longer blank the dashboard.
  useEffect(() => {
    const controller = new AbortController();
    setRefreshing(true);

    const jobsRequest = getJobs(apiQuery, controller.signal);
    const runningRequest = getJobs(`limit=${RUNNING_LIMIT}&states=running`, controller.signal).catch(
      () => [] as Job[],
    );
    const queuedRequest = getJobs(
      `limit=${QUEUE_LOOKAHEAD}&states=queued`,
      controller.signal,
    ).catch(() => null);

    Promise.all([jobsRequest, runningRequest, queuedRequest])
      .then(([jobList, runningList, queuedList]) => {
        withViewTransition(() => {
          setJobs(jobList);
          if (queuedList) setQueue([...runningList, ...queuedList]);
          setLoaded(true);
          setRefreshing(false);
        });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return;
        // Keep whatever is on screen rather than clearing the dashboard.
        withViewTransition(() => {
          setLoaded(true);
          setRefreshing(false);
        });
      });

    return () => controller.abort();
  }, [apiQuery, refreshToken]);

  // Runtime estimates come from the jobs we already loaded, so they track the
  // project's real timings and fall back to the defaults when data is missing.
  const averages = useMemo(() => runtimeAverages(jobs), [jobs]);
  const queuedStarts = useMemo(() => estimateQueuedStarts(queue, { averages }), [queue, averages]);

  // Only `reload` and `status` matter here: the rows never render a job's
  // `output`, and the inline detail embed streams that itself, so `output`
  // messages are intentionally ignored to avoid re-rendering the dashboard per
  // log line.
  useMurdockSocket((message) => {
    if (message.cmd === 'reload') {
      setRefreshToken((token) => token + 1);
    } else if (message.cmd === 'status') {
      setJobs((list) => withJobStatus(list, message.uid, message.status));
      setQueue((list) => withJobStatus(list, message.uid, message.status));
    }
  });

  const update = useCallback(
    (patch: Partial<QueryParams>) =>
      setSearchParams(queryParamsToSearchParams({ ...params, ...patch })),
    [params, setSearchParams],
  );

  const onType = (type: JobType) => update({ type });
  // States are selected positively. The list never goes empty: at least one
  // has to stay selected, and the order is kept canonical for the URL.
  const onToggleState = (state: JobState) => {
    const selected = params.states.includes(state);
    if (selected && params.states.length === 1) return;
    update({
      states: selected
        ? params.states.filter((entry) => entry !== state)
        : STATES.filter((entry) => entry === state || params.states.includes(entry)),
    });
  };
  const onSelectAllStates = () => update({ states: [...STATES] });
  const onToggleHiddenPrState = (key: 'open' | 'closed') =>
    update({ prstates: { ...params.prstates, [key]: !params.prstates[key] } });
  const onToggleLabel = (label: string) =>
    update({
      labels: params.labels.includes(label)
        ? params.labels.filter((entry) => entry !== label)
        : [...params.labels, label],
    });
  const onClearLabels = () => update({ labels: [] });
  const onDraftChange = (field: keyof DraftParams, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const onCommit = () => update(draft);
  const onReset = () => setSearchParams(new URLSearchParams());
  const showMore = () => update({ limit: Number(params.limit) + ITEMS_DISPLAYED_STEP });
  const onLimit = (limit: number) => update({ limit });
  const toggleExpand = useCallback(
    (uid: string) =>
      withViewTransition(() => setExpandedUid((current) => (current === uid ? null : uid))),
    [],
  );

  const onAction = useCallback(
    async (job: Job, action: JobActionName) => {
      try {
        if (action === 'restart') {
          const restarted = await restartJob(job.uid, user?.token);
          notify(`Job ${restarted.uid.slice(0, 7)} ${jobContext(job)} started`);
          setRefreshToken((token) => token + 1);
        } else {
          await deleteJob(job.uid, user?.token);
          notify(
            `${action === 'cancel' ? 'Cancelling' : 'Stopping'} job ${job.uid.slice(0, 7)} ${jobContext(job)}`,
          );
        }
      } catch {
        notify(`Failed to ${action} job ${job.uid.slice(0, 7)} ${jobContext(job)}`, 'danger');
      }
    },
    [notify, user],
  );

  // Merge-queue and nightly jobs are branches to the API, so those kinds are
  // refined here, as are labels and free text.
  const visibleJobs = useMemo(() => {
    let list = jobs;
    if (params.type === 'merge-queue') list = list.filter((job) => isMergeQueue(job.ref));
    else if (params.type === 'nightly') list = list.filter((job) => isNightly(job.env));
    if (params.labels.length) {
      list = list.filter((job) => jobLabels(job).some((label) => params.labels.includes(label)));
    }
    const term = params.search.trim();
    if (term) list = list.filter((job) => jobMatchesSearch(job, term));
    return list;
  }, [jobs, params.type, params.labels, params.search]);

  // The dashboard groups the (filtered) job stream into three panels. The
  // queue is worked oldest-first, so the next job to run heads the list.
  const running = visibleJobs.find((job) => job.state === 'running');
  const queued = visibleJobs
    .filter((job) => job.state === 'queued')
    .sort((a, b) => (a.creation_time ?? 0) - (b.creation_time ?? 0));
  const past = visibleJobs.filter((job) => FINISHED_STATES.includes(job.state));
  const hasMore = jobs.length >= Number(params.limit);

  return (
    <div className={dashboard.dashboard}>
      <div className={dashboard.content}>
        {loaded && <ActiveTimeBar jobs={visibleJobs} averages={averages} refreshing={refreshing} />}

        {filtersOpen && (
          <JobFilters
            params={params}
            draft={draft}
            onType={onType}
            onToggleState={onToggleState}
            onSelectAllStates={onSelectAllStates}
            onToggleHiddenPrState={onToggleHiddenPrState}
            onToggleLabel={onToggleLabel}
            onClearLabels={onClearLabels}
            onDraftChange={onDraftChange}
            onCommit={onCommit}
            onLimit={onLimit}
            onReset={onReset}
          />
        )}

        {!loaded ? (
          <Spinner />
        ) : visibleJobs.length ? (
          <>
            <JobSection title="Current Job" icon="gear" state={running?.state}>
              {running ? (
                <>
                  <CurrentJob
                    job={running}
                    canManage={canManage}
                    onAction={(action) => onAction(running, action)}
                    expanded={expandedUid === running.uid}
                    onToggle={() => toggleExpand(running.uid)}
                  />
                  {expandedUid === running.uid && (
                    <div className={dashboard.currentJobEmbed} data-state={running.state}>
                      <JobDetail path={running.uid} />
                    </div>
                  )}
                </>
              ) : (
                <p className="muted">No job is running right now.</p>
              )}
            </JobSection>

            <JobSection
              title="Queued Jobs"
              icon="inbox"
              state={queued.length ? 'queued' : undefined}
              count={queued.length}
            >
              {queued.length ? (
                <JobList
                  jobs={queued}
                  canManage={canManage}
                  onAction={onAction}
                  queuedStarts={queuedStarts}
                  averages={averages}
                  expandedUid={expandedUid}
                  onToggleExpand={toggleExpand}
                />
              ) : (
                <p className="muted">The queue is empty.</p>
              )}
            </JobSection>

            <JobSection title="Past Jobs" icon="clock" count={past.length}>
              {past.length ? (
                <>
                  <JobList
                    jobs={past}
                    canManage={canManage}
                    onAction={onAction}
                    queuedStarts={queuedStarts}
                    expandedUid={expandedUid}
                    onToggleExpand={toggleExpand}
                  />
                  {hasMore && <ShowMore onClick={showMore} />}
                </>
              ) : (
                <p className="muted">No finished jobs match.</p>
              )}
            </JobSection>
          </>
        ) : (
          <div className="empty-state">No job matching</div>
        )}
      </div>
    </div>
  );
}
