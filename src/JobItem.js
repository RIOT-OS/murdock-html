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

import axios from 'axios';
import moment from 'moment';

import {
    stateBadge, murdockHttpBaseUrl
} from './constants';
import { DateShortElem } from './components';


export const JobItem = (props) => {
    const jobDate = new Date(props.job.since * 1000);

    const removeJob = (type) => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.ref})`
        axios.delete(
            `${murdockHttpBaseUrl}/jobs/${type}/${props.job.uid}`,
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
    };

    const cancel = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.ref})`
        console.log(`Canceling queued job ${props.job.commit.sha} ${context}`)
        removeJob("queued");
    };

    const abort = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.ref})`
        console.log(`Stopping running job ${props.job.commit.sha} ${context}`)
        removeJob("running");
    };

    const restart = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.ref})`
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
    };

    const refRepr = (ref) => {
        if (ref && ref.startsWith("refs/")) {
            return `${ref.split("/").slice(2).join("/")}`
        }
        return ref.substring(0, 15);
    };

    const cancelAction = (props.permissions === "push" && props.job.state === "queued") && (
        <li>
            <button className={`dropdown-item btn-sm text-end`} type="button" onClick={cancel}>
                <i className="bi-x-circle me-1"></i><span>Cancel</span>
            </button>
        </li>
    );

    const stopAction = (props.permissions === "push" && props.job.state === "running") && (
        <li>
            <button className={`dropdown-item btn-sm text-end`} type="button" onClick={abort}>
                <i className="bi-x-circle me-1"></i><span>Abort</span>
            </button>
        </li>
    );

    const restartAction = (props.permissions === "push" && ["passed", "errored", "stopped"].includes(props.job.state)) && (
        <li>
            <button className={`dropdown-item btn-sm text-end`} type="button" onClick={restart}>
                <i className="bi-arrow-clockwise me-1"></i><span>Restart</span>
            </button>
        </li>
    );

    const title = (props.job.prinfo) ? props.job.prinfo.title : refRepr(props.job.ref);
    let titleUrl = "";
    if (props.job.prinfo) {
        titleUrl = props.job.prinfo.url;
    } else if (props.job.ref && props.job.ref.startsWith("refs/")) {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/tree/${props.job.ref.split("/")[2]}`;
    } else {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/${props.job.commit.sha}`;
    }

    let buildInProgress = (
        props.job.state === "running" &&
        props.job.status.hasOwnProperty("total") &&
        props.job.status.hasOwnProperty("passed") &&
        props.job.status.hasOwnProperty("failed") &&
        (props.job.status.total >= (props.job.status.passed + props.job.status.failed))
    );

    let progressPercent = 0;
    let runningJobStatus = "";
    if (buildInProgress) {
        let jobsDone = props.job.status.passed + props.job.status.failed;
        progressPercent = Math.round((jobsDone * 100) / props.job.status.total);
        runningJobStatus = `fail: ${props.job.status.failed} pass: ${props.job.status.passed} done: ${jobsDone}/${props.job.status.total}`;
    }

    let jobItemTitleTooltip = `Commit: ${props.job.commit.sha}\n\n${props.job.commit.message}`;
    if (props.job.prinfo && props.job.prinfo.hasOwnProperty("is_merged") && props.job.prinfo.is_merged) {
        jobItemTitleTooltip += "\n\nState: merged"
    }
    else if (props.job.prinfo && props.job.prinfo.hasOwnProperty("state")) {
        jobItemTitleTooltip += `\n\nState: ${props.job.prinfo.state}`
    }

    return (
        <tr>
            <td style={{width: "5%"}}>
            <a className="btn link-underline-hover p-0 text-primary" href={`/details/${props.job.uid}`}>{`${props.job.uid.substring(0, 7)}`}</a>
            </td>
            <td style={{width: "50%"}}>
                <span className="align-middle" data-bs-toggle="tooltip" data-bs-placement="bottom" title={jobItemTitleTooltip}>
                    <i className={`bi-github ${(props.job.prinfo && props.job.prinfo.hasOwnProperty("is_merged") && props.job.prinfo.is_merged) ? "text-info": ""} me-1`}></i>
                    <a className="link-underline-hover text-dark me-1" href={titleUrl} target="_blank" rel="noreferrer noopener">
                        {props.job.prinfo ? `PR #${props.job.prinfo.number}: ${title}`: `${title}`}
                    </a>
                </span>
            </td>
            <td style={{width: "20%"}} className="text-left">
                <DateShortElem date={jobDate} />
            </td>
            <td className="text-center align-middle py-0" style={{width: "20%"}}>
                {(props.job.state === "running") && (
                    (buildInProgress) ? (
                        <a className="btn" style={{width: "100%"}} href={`/details/${props.job.uid}`} data-bs-toggle="tooltip" data-bs-placement="bottom" title={runningJobStatus}>
                            {props.job.status.failed ? <i className="animate-flicker bi-exclamation-triangle me-1 text-danger"></i> : null}{`${moment.duration(props.job.status.eta, "seconds").humanize(true)} (${progressPercent}%)`}
                            <div className="progress position-relative" style={{height: "5px"}}>
                                <div className={`progress-bar progress-bar-animated progress-bar-striped bg-${props.job.status.failed ? "danger" : "warning"}`} role="progressbar"
                                    style={{ width: `${progressPercent}%` }}
                                    aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                                </div>
                            </div>
                        </a>
                    ) : (
                        <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        {(props.job.status && props.job.status.status) ? (
                        <span className="fst-italic">{`${props.job.status.status}...`}</span>
                        ) :null}
                        </>
                    )
                )}
                {["passed", "errored", "stopped"].includes(props.job.state) && `${moment.duration(props.job.runtime * -1000).humanize()}`}
                {props.job.state === "queued" && " - "}
            </td>
            <td className="text-end pe-3">
                <div className="dropdown">
                    <button className="btn dropdown-toggle p-0" type="button" id="dropdownMenuActions" data-bs-toggle="dropdown" aria-expanded="false">
                    {stateBadge[props.job.state]}
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end p-0" style={{minWidth: "20px"}} aria-labelledby="dropdownMenuActions">
                        <li>
                        <a className="dropdown-item btn-sm text-end" href={`/details/${props.job.uid}`}>
                            <i className="bi-eye me-1"></i><span>Details</span>
                        </a>
                        </li>
                        {cancelAction}
                        {stopAction}
                        {restartAction}
                    </ul>
                </div>
            </td>
        </tr>
    );
}
