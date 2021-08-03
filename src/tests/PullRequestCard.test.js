/*
 * Copyright (C) 2021 Inria
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Alexandre Abadie <alexandre.abadie@inria.fr>
 */

import { cleanup, render, screen } from '@testing-library/react';
import {
    PullRequestCard,
    PullRequestCardFailedJobs,
    PullRequestCardInfo,
    PullRequestCardTitle,
    PullRequestCardStatus
} from '../PullRequestCard';

test('pull request success card title', async () => {
    render(<PullRequestCardTitle title="test" prType="passed" url="http://localhost/test" />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-light link-underline-hover" &&
            element.href === "http://localhost/test" &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "test"
        )
      })).toBeDefined();
})

test('pull request errored card title', async () => {
    render(<PullRequestCardTitle title="test" prType="errored" url="http://localhost/test" />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-light link-underline-hover" &&
            element.href === "http://localhost/test" &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "test"
        )
      })).toBeDefined();
})

test('pull request building card title', async () => {
    render(<PullRequestCardTitle title="test" prType="building" />);
    expect(screen.getByText("test")).toBeDefined();

    expect(screen.queryByText((content, element) => {
        return element.className === "link-light link-underline-hover" && element.href
      })).toBeNull();
})

test('pull request queued card title', async () => {
    render(<PullRequestCardTitle title="test" prType="queued" />);
    expect(screen.getByText("test")).toBeDefined();
    expect(screen.queryByText((content, element) => {
        return element.className === "link-light link-underline-hover" && element.href
      })).toBeNull();
})

test('pull request success card info', async () => {
    render(<PullRequestCardInfo user="toto" prType="passed" prNum="12345" prUrl="http://localhost/test" prSince="1234567" prCommit="56789abcdef" />);

    expect(screen.getByText("toto")).toBeDefined();
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-success" &&
            element.href === "http://localhost/test" &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "PR #12345"
        )
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-success" &&
            element.href === `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/56789abcdef` &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "56789ab"
        )
    })).toBeDefined();

    expect(screen.queryByText((content, element) => {
        return element.className === "bi-clock me-1"
    })).toBeNull();
})

test('pull request success with runtime card info', async () => {
    render(<PullRequestCardInfo user="toto" prType="passed" prNum="12345" prUrl="http://localhost/test" prSince="1234567" prCommit="56789abcdef" prRuntime="42.3" />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "bi-clock me-1"
        )
    })).toBeDefined();
})

test('pull request errored card info', async () => {
    render(<PullRequestCardInfo user="toto" prType="errored" prNum="12345" prUrl="http://localhost/test" prSince="1234567" prCommit="56789abcdef" />);
    expect(screen.getByText("toto")).toBeDefined();
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-danger" &&
            content === "PR #12345"
        )
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-danger" &&
            content === "56789ab"
        )
    })).toBeDefined();
})

test('pull request building card info', async () => {
    render(<PullRequestCardInfo user="toto" prType="building" prNum="12345" prUrl="http://localhost/test" prSince="1234567" prCommit="56789abcdef" />);
    expect(screen.getByText("toto")).toBeDefined();
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-primary" &&
            content === "PR #12345"
        )
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-primary" &&
            content === "56789ab"
        )
    })).toBeDefined();
})

test('pull request status null', async () => {
    const prTypes = ["building", "errored", "passed", "queued"]
    for (let idx = 0; idx < prTypes.length; ++idx ) {
        render(<PullRequestCardStatus prType={prTypes[idx]} status="test" />);
        expect(screen.queryByText((content, element) => {
            return element.className === "row";
        })).toBeNull();
        cleanup();
    }
})

test('pull request status errored and canceled', async () => {
    render(<PullRequestCardStatus prType="errored" status={{"status": "canceled"}} />);
    expect(screen.getByText((content, element) => {
        return element.className === "row";
    })).toBeDefined();
    expect(screen.getByText("canceled")).toBeDefined();
    expect(screen.getByRole("progressbar")).toBeDefined();
    expect(screen.queryByText((content, element) => {
        return element.className === "bi-clock";
    })).toBeNull();
})

test('pull request status building with string status', async () => {
    render(<PullRequestCardStatus prType="building" status={{"status": "collecting jobs"}} />);
    expect(screen.getByText((content, element) => {
        return element.className === "row";
    })).toBeDefined();
    expect(screen.getByText("collecting jobs")).toBeDefined();
    expect(screen.getByRole("progressbar")).toBeDefined();
    expect(screen.queryByText((content, element) => {
        return element.className === "bi-clock";
    })).toBeNull();
})

test('pull request status building with progress', async () => {
    render(<PullRequestCardStatus prType="building" status={{ "total": 123, "passed": 101, "failed": 2 , "eta": 42}} />);
    expect(screen.queryByText((content, element) => {
        return element.className === "row";
    })).toBeDefined();
    expect(screen.getByText("fail: 2 pass: 101 done: 103/123")).toBeDefined();
    expect(screen.getByRole("progressbar")).toBeDefined();
    expect(screen.getByText((content, element) => {
        return element.className === "bi-bar-chart-line";
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return element.className === "bi-clock";
    })).toBeDefined();
})

test('pull request failed jobs null', async () => {
    const prTypes = ["building", "errored", "passed", "queued"]
    for (let idx = 0; idx < prTypes.length; ++idx ) {
        render(<PullRequestCardFailedJobs prType={prTypes[idx]} prNum="12345" status="" />);
        expect(screen.queryByText((content, element) => {
            return content === "Failed jobs:";
        })).toBeNull();
        expect(screen.queryByText((content, element) => {
            return element.className === "row";
        })).toBeNull();
        cleanup();
    }
})

test('pull request failed jobs empty', async () => {
    const prTypes = ["building", "errored", "passed", "queued"]
    for (let idx = 0; idx < prTypes.length; ++idx ) {
        render(<PullRequestCardFailedJobs prType={prTypes[idx]} prNum="12345" status={{ "failed_jobs": [] }} />);
        expect(screen.queryByText((content, element) => {
            return content === "Failed jobs:";
        })).toBeNull();
        expect(screen.queryByText((content, element) => {
            return element.className === "row";
        })).toBeNull();
        cleanup();
    }
})

test('pull request failed jobs no href', async () => {
    const prTypes = ["building", "errored"]
    for (let idx = 0; idx < prTypes.length; ++idx ) {
        render(<PullRequestCardFailedJobs
                    prType={prTypes[idx]}
                    prNum="12345"
                    status={{ "failed_jobs": [{"name": "test1"}, {"name": "test2"}] }}
                />);
        expect(screen.getByText("Failed jobs:")).toBeDefined();
        expect(screen.getByText((content, element) => {
            return (
                element.className === "d-flex flex-wrap" &&
                element.childNodes.length === 2
            );
        })).toBeDefined();
        expect(screen.getByText("test1")).toBeDefined();
        expect(screen.getByText("test2")).toBeDefined();
        expect(screen.queryAllByText((content, element) => {
            return (
                element.className === "text-danger link-underline-hover"
            );
        }).length).toBe(0);
        cleanup();
    }
})

test('pull request failed jobs with href', async () => {
    const prTypes = ["building", "errored"]
    for (let idx = 0; idx < prTypes.length; ++idx ) {
        render(<PullRequestCardFailedJobs
                    prType={prTypes[idx]}
                    prNum="12345"
                    status={{ "failed_jobs": [
                        {"name": "test1", "href": "test1_href"},
                        {"name": "test2", "href": "test2_href"}
                    ] }}
                />);
        expect(screen.getByText("Failed jobs:")).toBeDefined();
        expect(screen.getByText((content, element) => {
            return (
                element.className === "d-flex flex-wrap" &&
                element.childNodes.length === 2
            );
        })).toBeDefined();
        expect(screen.getByText("test1")).toBeDefined();
        expect(screen.getByText("test2")).toBeDefined();
        expect(screen.queryAllByText((content, element) => {
            return (
                element.className === "text-danger link-underline-hover"
            );
        }).length).toBe(2);
        cleanup();
    }
})

test('pull request card', async () => {
    const prTypes = ["finished", "building"]
    for (let idx = 0; idx < prTypes.length; ++idx ) {
        render(<PullRequestCard
                pr_type={prTypes[idx]}
                pr={
                    {
                        "result": (prTypes[idx] === "finished") ? "passed" : null,
                        "title": "test",
                        "user": "toto",
                        "url": "test_url/12345",
                        "commit": "1234556789",
                        "runtime": "42",
                        "since": 1234567789,
                    }
                } />);
        cleanup();
    }
})
