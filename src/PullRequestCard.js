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
            `${murdockHttpBaseUrl}/api/jobs/${type}/${props.pr.commit}`,
            {
                headers: {
                    "Authorization": props.user.token,
                },
            },
        )
        .catch(error => {
            console.log(error);
        });
    }

    const cancel = () => {
        console.log(`Canceling queued job ${props.pr.commit} (PR #${props.pr.prnum})`)
        removeJob("queued");
    }

    const stop = () => {
        console.log(`Stopping building job ${props.pr.commit} (PR #${props.pr.prnum})`)
        removeJob("building");
    }

    const cancelAction = (props.permissions === "push" && props.prType === "queued") ? (
        <button className="btn badge bg-info text-dark" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Cancel" onClick={cancel}>
            <i className="bi-x-circle-fill"></i>
        </button>
    ) : null;

    const stopAction = (props.permissions === "push" && props.prType === "building") ? (
        <button className="btn badge bg-warning text-dark" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Stop" onClick={stop}>
            <i className="bi-stop-circle-fill"></i>
        </button>
    ) : null;

    return (
        <div className="row align-items-center">
            <div className="col-md-10">
                {cardIcon[props.prType]}
                {(props.pr.output_url) ? <a className="link-light link-underline-hover" href={props.pr.output_url} target="_blank" rel="noreferrer noopener">{props.pr.title}</a> : props.pr.title}
            </div>
            <div className="col-md-2 text-end">
            {cancelAction}
            {stopAction}
            </div>
        </div>
    );
}

export const PullRequestCardInfo = (props) => {
    const prDate = new Date(props.prSince * 1000);

    return (
        <div className="row">
            <UserCol user={props.user} />
            <LinkCol title={`PR #${props.prNum}`} url={props.prUrl} color={linkColor[props.prType]} />
            <CommitCol color={linkColor[props.prType]} commit={props.prCommit} />
            <DateCol date={prDate} />
            {(props.prRuntime) ? <RuntimeCol runtime={moment.duration(props.prRuntime * -1000).humanize()} /> : null}
        </div>
    );
}

export const PullRequestCardStatus = (props) => {
    if ((!props.status) || 
        (props.prType === "errored" && ((!props.status.status) || (props.status.status && props.status.status !== "canceled"))) ||
        (!["errored", "building"].includes(props.prType))) {
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
    if (!["building", "errored"].includes(props.prType) || !props.status) {
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
    let prType = (props.pr_type === "finished") ? props.pr.result: props.pr_type;

    return (
        <div>
        <div className={`card m-2 border-${cardColor[prType]}`}>
            <div className={`card-header text-${textColor[prType]} bg-${cardColor[prType]}`}>
                <PullRequestCardTitle
                    prType={prType}
                    pr={props.pr}
                    user={props.user}
                    permissions={props.permissions}
                />
            </div>
            <div className="card-body">
                <PullRequestCardInfo
                    prType={prType}
                    user={props.pr.user}
                    prNum={props.pr.prnum}
                    prUrl={props.pr.url}
                    prCommit={props.pr.commit}
                    prRuntime={props.pr.runtime}
                    prSince={props.pr.since}
                />
                <PullRequestCardStatus
                    prType={prType}
                    status={props.pr.status}
                />
                <PullRequestCardFailedJobs
                    prType={prType}
                    prNum={props.pr.prnum}
                    status={props.pr.status}
                />
            </div>
        </div>
        </div>
    );
};
