import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { ITEMS_DISPLAYED_STEP } from '../api/config';
import { FiltersProvider } from '../components/FiltersContext';
import { NavBar } from '../components/NavBar';
import { ToastProvider } from '../components/Toast';
import { JobListPage } from './JobListPage';
import type { Job, JobState } from '../types';

const job: Job = {
  uid: '29c3d405db074a24a34e4ce9c07ee8c7',
  commit: { sha: '87f30ba9', message: 'core: fix the thing', author: 'ann' },
  ref: 'refs/heads/master',
  creation_time: 1700000000,
  runtime: 42,
  state: 'passed',
  status: {},
};

const fetchMock = vi.fn();

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: RequestInfo | URL) => {
    if (String(url).includes('/jobs')) return jsonResponse([job]);
    return Promise.resolve({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: async () => ({}),
    });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <FiltersProvider>
            <JobListPage />
          </FiltersProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** The dashboard as the app mounts it, so the top-bar toggle is present. */
function renderDashboard(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <FiltersProvider>
            <NavBar />
            <JobListPage />
          </FiltersProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('JobListPage', () => {
  it('renders the fetched jobs', async () => {
    renderPage();
    expect(await screen.findByText(/core: fix the thing/)).toBeInTheDocument();
    // "Success" appears on the row's state badge.
    expect(screen.getAllByText('Success').length).toBeGreaterThan(0);
    // 42s appears in both the row duration and the active-time bar.
    expect(screen.getAllByText('42s').length).toBeGreaterThan(0);
  });

  it('reveals the filter panel from the top-bar toggle', async () => {
    renderDashboard();

    // Hidden until the "Show Filters" button is clicked.
    const toggle = await screen.findByRole('button', { name: 'Show Filters' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(await screen.findByText('Filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Filters' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('groups jobs into Current, Queued and Past sections', async () => {
    const makeJob = (
      uid: string,
      state: JobState,
      message: string,
      extra: Partial<Job> = {},
    ): Job => ({
      ...job,
      uid,
      state,
      commit: { ...job.commit, message },
      ...extra,
    });

    const running = makeJob('run', 'running', 'running: the current one', {
      start_time: 1700000010,
      status: { eta: 30, total: 4, passed: 2, failed: 0 },
    });
    const queued = makeJob('queue', 'queued', 'queued: next in line', {
      start_time: 0,
      status: {},
    });
    const passed = makeJob('past', 'passed', 'past: already done');

    fetchMock.mockImplementation((url: RequestInfo | URL) =>
      String(url).includes('/jobs') ? jsonResponse([running, queued, passed]) : Promise.reject(),
    );

    renderPage();

    expect(await screen.findByText('Current Job')).toBeInTheDocument();
    expect(screen.getByText('Queued Jobs')).toBeInTheDocument();
    expect(screen.getByText('Past Jobs')).toBeInTheDocument();
    expect(screen.getByText(/running: the current one/)).toBeInTheDocument();
    expect(screen.getByText(/queued: next in line/)).toBeInTheDocument();
    expect(screen.getByText(/past: already done/)).toBeInTheDocument();
  });

  it('flags the current job when one of its tasks has failed', async () => {
    const runningJob = (failed: number): Job => ({
      ...job,
      uid: 'run',
      state: 'running',
      start_time: 1700000010,
      status: { eta: 30, total: 4, passed: 1, failed },
    });
    const respondWith = (running: Job) => {
      fetchMock.mockImplementation((url: RequestInfo | URL) =>
        String(url).includes('/jobs') ? jsonResponse([running]) : Promise.reject(),
      );
    };

    respondWith(runningJob(0));
    const { unmount } = renderPage();
    const healthy = await screen.findByText('Current Job');
    expect(healthy.closest('section')).toHaveAttribute('data-state', 'running');
    unmount();

    respondWith(runningJob(1));
    renderPage();
    const failing = await screen.findByText('Current Job');
    expect(failing.closest('section')).toHaveAttribute('data-state', 'errored');
  });

  it('shows only merge-queue jobs for the merges kind', async () => {
    const master: Job = {
      ...job,
      uid: 'branchmaster',
      commit: { ...job.commit, message: 'regular: a branch' },
    };
    const mergeQueue: Job = {
      ...job,
      uid: 'queueentry',
      ref: 'refs/heads/gh-readonly-queue/master/pr-1-abcdef',
      commit: { ...job.commit, message: 'queued: an entry' },
    };
    fetchMock.mockImplementation((url: RequestInfo | URL) =>
      String(url).includes('/jobs') ? jsonResponse([master, mergeQueue]) : Promise.reject(),
    );

    render(
      <MemoryRouter initialEntries={['/?type=merge-queue']}>
        <AuthProvider>
          <ToastProvider>
            <FiltersProvider>
              <JobListPage />
            </FiltersProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/queued: an entry/)).toBeInTheDocument();
    expect(screen.queryByText(/regular: a branch/)).not.toBeInTheDocument();
  });

  it('shows only nightly jobs for the nightlies kind', async () => {
    const nightly: Job = {
      ...job,
      uid: 'nightly',
      env: { NIGHTLY: '1' },
      commit: { ...job.commit, message: 'nightly: full run' },
    };
    const regular: Job = {
      ...job,
      uid: 'regular',
      commit: { ...job.commit, message: 'regular: normal run' },
    };
    fetchMock.mockImplementation((url: RequestInfo | URL) =>
      String(url).includes('/jobs') ? jsonResponse([nightly, regular]) : Promise.reject(),
    );

    render(
      <MemoryRouter initialEntries={['/?type=nightly']}>
        <AuthProvider>
          <ToastProvider>
            <FiltersProvider>
              <JobListPage />
            </FiltersProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/nightly: full run/)).toBeInTheDocument();
    expect(screen.queryByText(/regular: normal run/)).not.toBeInTheDocument();
  });

  it('filters by PR label on the client', async () => {
    const labeled: Job = {
      ...job,
      uid: 'labeled',
      prinfo: { number: 1, title: 'labeled: build it', labels: ['CI: full build'] },
    };
    const plain: Job = {
      ...job,
      uid: 'plain',
      prinfo: { number: 2, title: 'plain: no label', labels: ['Area: core'] },
    };
    fetchMock.mockImplementation((url: RequestInfo | URL) =>
      String(url).includes('/jobs') ? jsonResponse([labeled, plain]) : Promise.reject(),
    );

    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Show Filters' }));
    await userEvent.click(await screen.findByRole('button', { name: 'CI: full build' }));

    expect(await screen.findByText(/labeled: build it/)).toBeInTheDocument();
    expect(screen.queryByText(/plain: no label/)).not.toBeInTheDocument();
  });

  it('searches the loaded jobs by text', async () => {
    const match: Job = {
      ...job,
      uid: 'match',
      commit: { ...job.commit, message: 'needle: found it' },
    };
    const other: Job = {
      ...job,
      uid: 'other',
      commit: { ...job.commit, message: 'haystack: elsewhere' },
    };
    fetchMock.mockImplementation((url: RequestInfo | URL) =>
      String(url).includes('/jobs') ? jsonResponse([match, other]) : Promise.reject(),
    );

    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Show Filters' }));
    await userEvent.type(screen.getByLabelText('Search jobs'), 'needle{Enter}');

    expect(await screen.findByText(/needle: found it/)).toBeInTheDocument();
    expect(screen.queryByText(/haystack: elsewhere/)).not.toBeInTheDocument();
  });

  it('confirms before loading more than the default page size', async () => {
    const defaultSize = String(ITEMS_DISPLAYED_STEP);
    const biggerSize = String(ITEMS_DISPLAYED_STEP * 3);

    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Show Filters' }));

    // The default size applies straight away.
    await userEvent.click(await screen.findByRole('button', { name: defaultSize }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // Any other size asks first.
    await userEvent.click(screen.getByRole('button', { name: biggerSize }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Load more jobs?');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`limit=${biggerSize}`))).toBe(
      false,
    );

    await userEvent.click(screen.getByRole('button', { name: biggerSize }));
    await userEvent.click(await screen.findByRole('button', { name: 'Load' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`limit=${biggerSize}`))).toBe(
        true,
      ),
    );
  });

  it('lists queued jobs oldest first, so the next to run is on top', async () => {
    const older: Job = {
      ...job,
      uid: 'older',
      state: 'queued',
      creation_time: 1700000000,
      start_time: 0,
      commit: { ...job.commit, message: 'queued: older' },
    };
    const newer: Job = {
      ...job,
      uid: 'newer',
      state: 'queued',
      creation_time: 1700000100,
      start_time: 0,
      commit: { ...job.commit, message: 'queued: newer' },
    };
    // The API hands the jobs back newest first.
    fetchMock.mockImplementation((url: RequestInfo | URL) =>
      String(url).includes('/jobs') ? jsonResponse([newer, older]) : Promise.reject(),
    );

    renderPage();

    const titles = (await screen.findAllByText(/master @ queued:/)).map((el) => el.textContent);
    expect(titles).toEqual(['master @ queued: older', 'master @ queued: newer']);
  });

  it('selects job states positively, with a reset', async () => {
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Show Filters' }));

    const states = within(screen.getByRole('group', { name: 'Job states' }));
    expect(states.getByRole('button', { name: 'Success' })).toHaveAttribute('aria-pressed', 'true');

    // Deselecting "Failed" drops errored from the API query.
    await userEvent.click(states.getByRole('button', { name: 'Failed' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes('states=queued+running+passed+stopped'),
        ),
      ).toBe(true),
    );

    // Reset puts every state back.
    await userEvent.click(screen.getByRole('button', { name: 'Reset states' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes('states=queued+running+passed+errored+stopped'),
        ),
      ).toBe(true),
    );
  });

  it('never lets the state selection go empty', async () => {
    renderDashboard('/?states=passed');
    // The active-filter badge is part of the button's name here.
    await userEvent.click(await screen.findByRole('button', { name: /Show Filters/ }));

    const states = within(screen.getByRole('group', { name: 'Job states' }));
    await userEvent.click(states.getByRole('button', { name: 'Success' }));

    expect(states.getByRole('button', { name: 'Success' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the empty state when there are no jobs', async () => {
    fetchMock.mockImplementation((url: RequestInfo | URL) =>
      String(url).includes('/jobs') ? jsonResponse([]) : Promise.reject(new Error('unexpected')),
    );
    renderPage();
    expect(await screen.findByText('No job matching')).toBeInTheDocument();
  });

  it('fetches the detail only once a row is expanded', async () => {
    const past: Job = { ...job, uid: 'past123', state: 'passed' };
    const calls: string[] = [];
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const href = String(url);
      calls.push(href);
      if (href.includes('/jobs')) return jsonResponse([past]);
      if (href.includes('/job/past123')) return jsonResponse(past);
      if (href.includes('/results/')) return jsonResponse([]);
      return jsonResponse({});
    });

    renderPage();
    expect(await screen.findByText(/core: fix the thing/)).toBeInTheDocument();
    expect(calls.some((href) => href.includes('/job/past123'))).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Expand job past123' }));

    expect(await screen.findByRole('button', { name: 'Collapse job past123' })).toBeInTheDocument();
    expect(calls.some((href) => href.includes('/job/past123'))).toBe(true);
  });
});
