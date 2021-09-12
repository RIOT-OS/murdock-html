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
    DashboardCard,
    DashboardCardFailedJobs,
    DashboardCardInfo,
    DashboardCardTitle,
    DashboardCardStatus
} from '../DashboardCard';
import { defaultLoginUser } from '../userStorage';

test('pull request success card title', async () => {
    const job = {
        prinfo: {
            title: "test",
        },
        output_url: "http://localhost/test",
    }
    render(<DashboardCardTitle jobType="passed" job={job} user={defaultLoginUser} />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-light link-underline-hover" &&
            element.href === "http://localhost/test" &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "PR: test"
        )
      })).toBeDefined();
})

test('pull request errored card title', async () => {
    const job = {
        prinfo: {
            title: "test",
        },
        output_url: "http://localhost/test",
    }

    render(<DashboardCardTitle jobType="errored" job={job} user={defaultLoginUser} />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-light link-underline-hover" &&
            element.href === "http://localhost/test" &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "PR: test"
        )
      })).toBeDefined();
})

test('pull request building card title', async () => {
    const job = { prinfo: { title: "test" } };
    render(<DashboardCardTitle jobType="building" job={job} />);
    expect(screen.getByText("PR: test")).toBeDefined();

    expect(screen.queryByText((content, element) => {
        return element.className === "link-light link-underline-hover" && element.href
      })).toBeNull();
})

test('pull request queued card title', async () => {
    const job = { prinfo: { title: "test" } };
    render(<DashboardCardTitle title="test" jobType="queued" job={job} />);
    expect(screen.getByText("PR: test")).toBeDefined();
    expect(screen.queryByText((content, element) => {
        return element.className === "link-light link-underline-hover" && element.href
      })).toBeNull();
})

test('pull request success card info', async () => {
    const job = {
        "commit": {
            "sha": "56789abcdef",
            "author": "toto"
        },
        "prinfo": {
            "number": "12345",
            "url": "http://localhost/test"
        },
        "since": "1234567",
    }
    render(<DashboardCardInfo user="toto" jobType="passed" job={job} />);

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
    const job = {
        "commit": {
            "sha": "56789abcdef",
            "author": "toto"
        },
        "prinfo": {
            "number": "12345",
            "url": "http://localhost/test"
        },
        "since": "1234567",
        "runtime": "42.3"
    }
    render(<DashboardCardInfo user="toto" jobType="passed" job={job} />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "bi-clock me-1"
        )
    })).toBeDefined();
})

test('pull request errored card info', async () => {
    const job = {
        "commit": {
            "sha": "56789abcdef",
            "author": "toto"
        },
        "prinfo": {
            "number": "12345",
            "url": "http://localhost/test"
        },
        "since": "1234567"
    }
    render(<DashboardCardInfo user="toto" jobType="errored" job={job} />);
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
    const job = {
        "commit": {
            "sha": "56789abcdef",
            "author": "toto"
        },
        "prinfo": {
            "number": "12345",
            "url": "http://localhost/test"
        },
        "since": "1234567"
    }
    render(<DashboardCardInfo user="toto" jobType="building" job={job} />);
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
    const jobTypes = ["building", "errored", "passed", "queued"]
    for (let idx = 0; idx < jobTypes.length; ++idx ) {
        render(<DashboardCardStatus jobType={jobTypes[idx]} status="test" />);
        expect(screen.queryByText((content, element) => {
            return element.className === "row";
        })).toBeNull();
        cleanup();
    }
})

test('pull request status errored and canceled', async () => {
    render(<DashboardCardStatus jobType="errored" status={{"status": "canceled"}} />);
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
    render(<DashboardCardStatus jobType="building" status={{"status": "collecting jobs"}} />);
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
    render(<DashboardCardStatus jobType="building" status={{ "total": 123, "passed": 101, "failed": 2 , "eta": 42}} />);
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
    const jobTypes = ["building", "errored", "passed", "queued"]
    const job = {"prinfo": {"number": "12345"}, "status": ""}
    for (let idx = 0; idx < jobTypes.length; ++idx ) {
        render(<DashboardCardFailedJobs jobType={jobTypes[idx]} job={job} />);
        expect(screen.queryByText((content, element) => {
            return content === "Failed jobs";
        })).toBeNull();
        expect(screen.queryByText((content, element) => {
            return element.className === "row";
        })).toBeNull();
        cleanup();
    }
})

test('pull request failed jobs empty', async () => {
    const jobTypes = ["building", "errored", "passed", "queued"]
    const job = {"prinfo": {"number": "12345"}, "status": {"failed_jobs": []}}
    for (let idx = 0; idx < jobTypes.length; ++idx ) {
        render(<DashboardCardFailedJobs jobType={jobTypes[idx]} job={job} />);
        expect(screen.queryByText((content, element) => {
            return content === "Failed jobs";
        })).toBeNull();
        expect(screen.queryByText((content, element) => {
            return element.className === "row";
        })).toBeNull();
        cleanup();
    }
})

test('pull request failed jobs no href', async () => {
    const jobTypes = ["building", "errored"]
    const job = {
        "prinfo": {
            "number": "12345",
        },
        "status": {
            "failed_jobs": [ {"name": "test1"}, {"name": "test2"} ]
        }
    }
    for (let idx = 0; idx < jobTypes.length; ++idx ) {
        render(<DashboardCardFailedJobs jobType={jobTypes[idx]} job={job} />);
        expect(screen.getByText("Failed jobs (2)")).toBeDefined();
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
    const jobTypes = ["building", "errored"]
    const job = {
        "prinfo": {
            "number": "12345",
        },
        "status": {
            "failed_jobs": [
                {"name": "test1", "href": "test1_href"},
                {"name": "test2", "href": "test2_href"}
            ]
        }
    }
    for (let idx = 0; idx < jobTypes.length; ++idx ) {
        render(<DashboardCardFailedJobs jobType={jobTypes[idx]} job={job} />);
        expect(screen.getByText("Failed jobs (2)")).toBeDefined();
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
    const jobTypes = ["finished", "building"]
    for (let idx = 0; idx < jobTypes.length; ++idx ) {
        const job = {
            "uid": "1234",
            "result": (jobTypes[idx] === "finished") ? "passed" : null,
            "commit": {
                "sha": "1234556789",
                "author": "toto",
            },
            "prinfo": {
                "title": "test",
                "user": "toto",
                "url": "test_url/12345",
                "number": 12345,
            },
            "runtime": "42",
            "since": 1234567789,
        }
        render(<DashboardCard
                job_type={jobTypes[idx]}
                job={job}
                user={defaultLoginUser}
                />);
        cleanup();
    }
})
