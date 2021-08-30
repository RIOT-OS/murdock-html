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

export const DashboardCardTitle = (props) => {

    const removeJob = (type) => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.branch})`
        axios.delete(
            `${murdockHttpBaseUrl}/jobs/${type}/${props.job.commit.sha}`,
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(() => {
            const action = (type === "queued") ? "canceled" : "aborted";
            props.notify(props.job.uid, "info", `Job ${props.job.commit.sha.substring(0, 7)} ${context} ${action}`)
        })
        .catch(error => {
            const action = (type === "queued") ? "cancel" : "abort";
            props.notify(props.job.uid, "danger", `Failed to ${action} job ${props.job.commit.sha.substring(0, 7)} ${context}`)
            console.log(error);
        });
    }

    const cancel = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.branch})`
        console.log(`Canceling queued job ${props.job.commit.sha} ${context}`)
        removeJob("queued");
    }

    const abort = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.branch})`
        console.log(`Stopping building job ${props.job.commit.sha} ${context}`)
        removeJob("building");
    }

    const restart = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.branch})`
        console.log(`Restarting job ${props.job.commit.sha} ${context}`)
        axios.post(
            `${murdockHttpBaseUrl}/jobs/finished/${props.job.uid}`, {},
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .then(() => {
            props.notify(props.job.uid, "info", `Job ${props.job.commit.sha.substring(0, 7)} ${context} restarted`)
        })
        .catch(error => {
            props.notify(props.job.uid, "danger", `Failed to restart job ${props.job.commit.sha.substring(0, 7)} ${context}`)
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

    const title = (props.job.prinfo) ? props.job.prinfo.title : props.job.branch

    return (
        <div className="row align-items-center">
            <div className="col-md-10">
                {cardIcon[props.jobType]}
                {(props.job.output_url) ? <a className="link-light link-underline-hover" href={props.job.output_url} target="_blank" rel="noreferrer noopener">{title}</a> : title}
            </div>
            <div className="col-md-2 text-end">
            {cancelAction}
            {stopAction}
            {restartAction}
            </div>
        </div>
    );
}

export const DashboardCardInfo = (props) => {
    const prDate = new Date(props.job.since * 1000);

    return (
        <div className="row">
            <UserCol user={props.job.commit.author} />
            {
                (props.job.prinfo) ? (
                    <LinkCol title={`PR #${props.job.prinfo.number}`} url={props.job.prinfo.url} color={linkColor[props.jobType]} />
                ): (
                    <LinkCol title={`${props.job.branch}`} url={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}/tree/${props.job.branch}`} color={linkColor[props.jobType]} />
                )
            }
            <CommitCol color={linkColor[props.jobType]} commit={props.job.commit.sha} />
            <DateCol date={prDate} />
            {(props.job.runtime) ? <RuntimeCol runtime={moment.duration(props.job.runtime * -1000).humanize()} /> : null}
        </div>
    );
}

export const DashboardCardStatus = (props) => {
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

export const DashboardCardFailedJobs = (props) => {
    if (!["building", "errored"].includes(props.jobType) || !props.job.status) {
        return null;
    }

    const failed_jobs = (props.job.status.failed_jobs && props.job.status.failed_jobs.length) ? (
        props.job.status.failed_jobs.map((jobs, index) =>
            <div key={`pr-${props.job.uid}-${jobs.name}-${index}`} className="col-md-3 px-2">
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

export const DashboardCard = (props) => {
    let jobType = (props.job_type === "finished") ? props.job.result: props.job_type;

    return (
        <div>
        <div className={`card m-2 border-${cardColor[jobType]}`}>
            <div className={`card-header text-${textColor[jobType]} bg-${cardColor[jobType]}`}>
                <DashboardCardTitle
                    jobType={jobType}
                    job={props.job}
                    user={props.user}
                    permissions={props.permissions}
                    notify={props.notify}
                />
            </div>
            <div className="card-body">
                <DashboardCardInfo jobType={jobType} job={props.job} />
                <DashboardCardStatus jobType={jobType} status={props.job.status} />
                <DashboardCardFailedJobs jobType={jobType} job={props.job} />
            </div>
        </div>
        </div>
    );
};
