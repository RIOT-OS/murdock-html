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

import moment from 'moment';
import axios from 'axios';

import { 
    cardColor, cardIcon, linkColor, textColor, murdockHttpBaseUrl
} from './constants';
import { CommitCol, DateCol, LinkCol, RuntimeCol, UserCol } from './components';

export const PullRequestCardTitle = (props) => {

    const removeJob = (type) => {
        axios.delete(
            `${murdockHttpBaseUrl}/jobs/${type}/${props.job.prinfo.commit}`,
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(() => {
            const action = (type === "queued") ? "canceled" : "aborted";
            props.notify(props.job.uid, "info", `Job ${props.job.prinfo.commit.substring(0, 7)} (PR #${props.job.prinfo.number}) ${action}`)
        })
        .catch(error => {
            const action = (type === "queued") ? "cancel" : "abort";
            props.notify(props.job.uid, "danger", `Failed to ${action} job ${props.job.prinfo.commit.substring(0, 7)} (PR #${props.job.prinfo.number})`)
            console.log(error);
        });
    }

    const cancel = () => {
        console.log(`Canceling queued job ${props.job.prinfo.commit} (PR #${props.job.prinfo.number})`)
        removeJob("queued");
    }

    const abort = () => {
        console.log(`Stopping building job ${props.job.prinfo.commit} (PR #${props.job.prinfo.number})`)
        removeJob("building");
    }

    const restart = () => {
        console.log(`Restarting job ${props.job.prinfo.commit} (PR #${props.job.prinfo.number})`)
        axios.post(
            `${murdockHttpBaseUrl}/jobs/finished/${props.job.uid}`, {},
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(() => {
            props.notify(props.job.uid, "info", `Job ${props.job.prinfo.commit.substring(0, 7)} (PR #${props.job.prinfo.number}) restarted`)
        })
        .catch(error => {
            props.notify(props.job.uid, "danger", `Failed to restart job ${props.job.prinfo.commit.substring(0, 7)} (PR #${props.job.prinfo.number})`)
            console.log(error);
        });
    }

    const cancelAction = (props.permissions === "push" && props.jobType === "queued") ? (
        <button className={`btn badge bg-${cardColor[props.jobType]} text-danger fs-5 p-0`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Cancel" onClick={cancel}>
            <i className="bi-x-circle"></i>
        </button>
    ) : null;

    const stopAction = (props.permissions === "push" && props.jobType === "building") ? (
        <button className={`btn badge bg-${cardColor[props.jobType]} text-danger fs-5 p-0`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Abort" onClick={abort}>
            <i className="bi-x-circle"></i>
        </button>
    ) : null;

    const restartAction = (props.permissions === "push" && ["passed", "errored"].includes(props.jobType)) ? (
        <button className={`btn badge bg-${cardColor[props.jobType]} text-${textColor[props.jobType]} fs-5 p-0`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Restart" onClick={restart}>
            <i className="bi-arrow-clockwise"></i>
        </button>
    ) : null;

    return (
        <div className="row align-items-center">
            <div className="col-md-10">
                {cardIcon[props.jobType]}
                {(props.job.output_url) ? <a className="link-light link-underline-hover" href={props.job.output_url} target="_blank" rel="noreferrer noopener">{props.job.prinfo.title}</a> : props.job.prinfo.title}
            </div>
            <div className="col-md-2 text-end">
            {cancelAction}
            {stopAction}
            {restartAction}
            </div>
        </div>
    );
}

export const PullRequestCardInfo = (props) => {
    const prDate = new Date(props.jobSince * 1000);

    return (
        <div className="row">
            <UserCol user={props.user} />
            <LinkCol title={`PR #${props.prNum}`} url={props.prUrl} color={linkColor[props.jobType]} />
            <CommitCol color={linkColor[props.jobType]} commit={props.prCommit} />
            <DateCol date={prDate} />
            {(props.jobRuntime) ? <RuntimeCol runtime={moment.duration(props.jobRuntime * -1000).humanize()} /> : null}
        </div>
    );
}

export const PullRequestCardStatus = (props) => {
    if ((!props.status) || 
        (props.jobType === "errored" && ((!props.status.status) || (props.status.status && props.status.status !== "canceled"))) ||
        (!["errored", "building"].includes(props.jobType))) {
        return null;
    }

    let buildInProgress = (
        props.status.hasOwnProperty("total") &&
        props.status.hasOwnProperty("passed") &&
        props.status.hasOwnProperty("failed") &&
        (props.status.total >= (props.status.passed + props.status.failed))
    );

    let progressPercent = 0;
    let buildStatus = null;
    if (buildInProgress) {
        let jobsDone = props.status.passed + props.status.failed;
        progressPercent = Math.round((jobsDone * 100) / props.status.total);
        buildStatus = (
            <>
            <div className="col col-md-4">
                <i className="bi-bar-chart-line"></i>
                <span className="m-1">
                    {`fail: ${props.status.failed} pass: ${props.status.passed} done: ${jobsDone}/${props.status.total}`}
                </span>
            </div>
            <div className="col col-md-2">
                <i className="bi-clock"></i>
                <span className="m-1">{moment.duration(props.status.eta, "seconds").humanize(true)}</span>
            </div>
            </>
        );
    }
    else if (props.status.status) {
        buildStatus = (
            <>
            <div className="col col-md-4">
                <span className="me-1"><i className="bi-arrow-left-right"></i></span>
                <span className="m-1">{props.status.status}</span>
            </div>
            </>
            );
    }
    else {
        return null;
    }

    return (
        <div className="row">
            <div className="col col-md-6">
                <div className="progress my-1 me-1">
                    <div className="progress-bar progress-bar-striped" role="progressbar"
                            style={{ width: `${progressPercent}%` }}
                            aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                        {progressPercent}%
                    </div>
                </div>
            </div>
            {buildStatus}
        </div>
    );
}

export const PullRequestCardFailedJobs = (props) => {
    if (!["building", "errored"].includes(props.jobType) || !props.status) {
        return null;
    }

    const failed_jobs = (props.status.failed_jobs && props.status.failed_jobs.length) ? (
        props.status.failed_jobs.map((jobs, index) =>
            <div key={`pr-${props.prNum}-${jobs.name}-${index}`} className="col-md-3 px-2">
            {(jobs.href) ? (
                <a className="text-danger link-underline-hover" href={`${jobs.href}`}>
                    {jobs.name}
                </a>
            ) : (
                jobs.name
            )}
            </div>
        )
    ) : null;

    return (
        <>
        {(failed_jobs) ? (
            <div className="row">
                <h6 className='my-2'><strong>Failed jobs:</strong></h6>
                <div className="d-flex flex-wrap">
                    {failed_jobs}
                </div>
            </div>
        ) : null}
        </>
    );
}

export const PullRequestCard = (props) => {
    let jobType = (props.job_type === "finished") ? props.job.result: props.job_type;

    return (
        <div>
        <div className={`card m-2 border-${cardColor[jobType]}`}>
            <div className={`card-header text-${textColor[jobType]} bg-${cardColor[jobType]}`}>
                <PullRequestCardTitle
                    jobType={jobType}
                    job={props.job}
                    user={props.user}
                    permissions={props.permissions}
                    notify={props.notify}
                />
            </div>
            <div className="card-body">
                <PullRequestCardInfo
                    jobType={jobType}
                    user={props.job.prinfo.user}
                    prNum={props.job.prinfo.number}
                    prUrl={props.job.prinfo.url}
                    prCommit={props.job.prinfo.commit}
                    jobRuntime={props.job.runtime}
                    jobSince={props.job.since}
                />
                <PullRequestCardStatus
                    jobType={jobType}
                    status={props.job.status}
                />
                <PullRequestCardFailedJobs
                    jobType={jobType}
                    prNum={props.job.prinfo.number}
                    status={props.job.status}
                />
            </div>
        </div>
        </div>
    );
};
