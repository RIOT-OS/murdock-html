import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { JobRow } from './JobRow';
import { jobTooltip } from '../utils/job';
import type { Job } from '../types';

// `jobTooltip` is called once per JobRow render, so its call count is a proxy
// for "did this row re-render?".
vi.mock('../utils/job', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/job')>();
  return { ...actual, jobTooltip: vi.fn(actual.jobTooltip) };
});

const tooltip = vi.mocked(jobTooltip);

const job: Job = {
  uid: 'abc1234',
  commit: { sha: 'deadbeef', message: 'core: fix the thing', author: 'ann' },
  ref: 'refs/heads/master',
  creation_time: 1700000000,
  start_time: 1700000001,
  runtime: 42,
  state: 'passed',
  status: {},
};

const noop = () => {};

function renderRow(overrides: Partial<ComponentProps<typeof JobRow>> = {}) {
  return render(
    <MemoryRouter>
      <JobRow job={job} canManage={false} onAction={noop} {...overrides} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  tooltip.mockClear();
});

describe('JobRow', () => {
  it('skips re-rendering when its props are unchanged', () => {
    const { rerender } = renderRow();
    const renders = tooltip.mock.calls.length;

    rerender(
      <MemoryRouter>
        <JobRow job={job} canManage={false} onAction={noop} />
      </MemoryRouter>,
    );

    expect(tooltip.mock.calls.length).toBe(renders);
  });

  it('re-renders when its job changes', () => {
    const { rerender } = renderRow();
    const renders = tooltip.mock.calls.length;

    rerender(
      <MemoryRouter>
        <JobRow job={{ ...job, status: { passed: 5 } }} canManage={false} onAction={noop} />
      </MemoryRouter>,
    );

    expect(tooltip.mock.calls.length).toBe(renders + 1);
  });
});
