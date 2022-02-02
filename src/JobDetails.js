import axios from 'axios';
import moment from 'moment';
import $ from 'jquery';

import Websocket from 'react-websocket';
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { murdockHttpBaseUrl, murdockWsUrl, cardColor, cardIcon, linkColor, textColor } from './constants';
import { LoadingSpinner } from './components';
import { CommitWithAuthorCol, DateCompleteCol, GithubCol, RuntimeCol } from './components';

const jobOutputMaxHeight = "500px";

const JobTitle = (props) => {

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
    }

    const cancel = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.ref})`
        console.log(`Canceling queued job ${props.job.commit.sha} ${context}`)
        removeJob("queued");
    }

    const abort = () => {
        const context = (props.job.prinfo) ? `(PR #${props.job.prinfo.number})` : `(${props.job.ref})`
        console.log(`Stopping running job ${props.job.commit.sha} ${context}`)
        removeJob("running");
    }

    const refRepr = (ref) => {
        if (ref) {
            return `${ref.split("/").slice(2).join("/")}`
        }
        return "";
    };

    const cancelAction = (props.permissions === "push" && props.job.state === "queued") && (
        <button className={`btn badge bg-${cardColor[props.job.state]} text-danger fs-5 p-0`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Cancel" onClick={cancel}>
            <i className="bi-x-circle"></i>
        </button>
    );

    const stopAction = (props.permissions === "push" && props.job.state === "running") && (
        <button className={`btn badge bg-${cardColor[props.job.state]} text-danger fs-5 p-0`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Abort" onClick={abort}>
            <i className="bi-x-circle"></i>
        </button>
    );

    const title = (props.job.prinfo) ? `${props.job.prinfo.title}` : refRepr(props.job.ref)

    return (
        <div className="row align-items-center">
            <div className="col-md-10">
                {cardIcon[props.job.state]}
                {(props.job.output_url) ? <a className="link-light link-underline-hover" href={props.job.output_url} target="_blank" rel="noreferrer noopener">{title}</a> : title}
            </div>
            <div className="col-md-2 text-end">
            {cancelAction}
            {stopAction}
            </div>
        </div>
    );
}

const JobStatus = (props) => {
    if ((!props.status) ||
        (props.job.state === "errored" && ((!props.status.status) || (props.status.status && props.status.status !== "canceled"))) ||
        (!["errored", "running", "stopped"].includes(props.job.state))) {
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
        const jobsDone = props.status.passed + props.status.failed;
        progressPercent = Math.round((jobsDone * 100) / props.status.total);
        buildStatus = (
            <div className="row my-1">
                <div className="col col-md-4">
                    <i className="bi-bar-chart-line me-1"></i>
                    {`fail: ${props.status.failed} pass: ${props.status.passed} done: ${jobsDone}/${props.status.total}`}
                </div>
            </div>
        );
    }
    else if (props.status.status) {
        buildStatus = (
            <div className="row my-1">
                <div className="col col-md-4">
                    <i className="bi-arrow-left-right me-1"></i>{props.status.status}
                </div>
            </div>
            );
    }
    else {
        return null;
    }

    return (
        <>
        {buildStatus}
        {(props.job.state === "running") && (
        <>
        <div className="row my-1">
            <div className="col col-md-4">
                <div className="progress my-1 me-1">
                    <div className="progress-bar progress-bar-striped" role="progressbar"
                            style={{ width: `${progressPercent}%` }}
                            aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                        {progressPercent}%
                    </div>
                </div>
            </div>
        </div>
        <div className="row my-1">
            <div className="col col-md-2">
                <i className="bi-clock"></i>
                <span className="m-1">{moment.duration(props.status.eta, "seconds").humanize(true)}</span>
            </div>
        </div>
        </>
        )}
        </>
    );
}

const JobFailures = (props) => {
    if (!["running", "errored", "stopped"].includes(props.job.state)) {
        return null;
    }

    const jobStatus = (props.status) ? props.status : props.job.status;
    if (!jobStatus) {
        return null;
    }

    const failed_jobs = (jobStatus.failed_jobs && jobStatus.failed_jobs.length) && (
        jobStatus.failed_jobs.map((jobs, index) =>
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
    );

    const failed_builds = (jobStatus.failed_builds && jobStatus.failed_builds.length) && (
        jobStatus.failed_builds.map((jobs, index) =>
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
    );

    const failed_tests = (jobStatus.failed_tests && jobStatus.failed_tests.length) && (
        jobStatus.failed_tests.map((jobs, index) =>
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
    );

    return (
        <>
        {(failed_jobs) && (
            <div className="row my-1">
                <h6 className='my-2'><strong>Job failures ({jobStatus.failed_jobs.length})</strong></h6>
                <div className="d-flex flex-wrap">
                    {failed_jobs}
                </div>
            </div>
        )}
        {(failed_builds) && (
            <div className="row my-1">
                <h6 className='my-2'><strong>Build failures ({jobStatus.failed_builds.length})</strong></h6>
                <div className="d-flex flex-wrap">
                    {failed_builds}
                </div>
            </div>
        )}
        {(failed_tests) && (
            <div className="row my-1">
                <h6 className='my-2'><strong>Test failures ({jobStatus.failed_tests.length})</strong></h6>
                <div className="d-flex flex-wrap">
                    {failed_tests}
                </div>
            </div>
        )}
        </>
    );
}

const JobOutput = (props) => {
    const [output, setOutput] = useState(props.job.state === "running" ? props.job.output : null);
    const outputDivScrollableID = `outputScrollable${props.job.uid}`;
    const scrollBottomButtonID = `scrollBottomButton${props.job.uid}`;
    const scrollTopButtonID = `scrollTopButton${props.job.uid}`;

    const scrollToBottom = () => {
        const scrollableDiv = document.getElementById(outputDivScrollableID);
        $(`#${outputDivScrollableID}`).animate({
            scrollTop: scrollableDiv.scrollHeight - scrollableDiv.clientHeight
        }, 250);
    };

    const scrollToTop = () => {
        $(`#${outputDivScrollableID}`).animate({scrollTop: 0}, 250);
    };

    useEffect(() => {
        const scrollableDiv = document.getElementById(outputDivScrollableID);
        $(`#${outputDivScrollableID}`).on("scroll", () => {
            if (scrollableDiv.scrollTop === 0) {
                $(`#${scrollTopButtonID}`).addClass("invisible")
            }
            else if (scrollableDiv.scrollTop === scrollableDiv.scrollHeight - scrollableDiv.clientHeight) {
                $(`#${scrollBottomButtonID}`).addClass("invisible")
            }
            else {
                $(`#${scrollTopButtonID}`).removeClass("invisible")
                $(`#${scrollBottomButtonID}`).removeClass("invisible")
            }
        });

        if (!output && props.job.output_text_url) {
            axios.get(props.job.output_text_url)
            .then(res => {
                setOutput(res.data);
            })
            .catch(error => {
                console.log(error);
            });
        } else if (props.output && props.job.state === "running") {
            setOutput(props.output);
        }
    }, [
        outputDivScrollableID,
        props.output,
        props.job.output_text_url, props.job.state,
        scrollBottomButtonID, scrollTopButtonID, output
    ]);

    return (
        (output) ? (
            <div className="position-relative" style={{ maxHeight: jobOutputMaxHeight }} id={`output${props.job.uid}`}>
                <div className="bg-dark p-2 overflow-auto" style={{ maxHeight: jobOutputMaxHeight }} id={outputDivScrollableID}>
                    <pre className="text-white">{output}</pre>
                </div>
                <button className="btn btn-sm position-absolute bottom-0 end-0 m-2 p-0" id={scrollBottomButtonID} data-bs-toggle="tooltip" data-bs-placement="top" title="Go to bottom" onClick={scrollToBottom}>
                    <i className="bi-arrow-down-square text-white"></i>
                </button>
                <button className="btn btn-sm position-absolute top-0 end-0 m-2 p-0 invisible" id={scrollTopButtonID} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Go to top" onClick={scrollToTop}>
                    <i className="bi-arrow-up-square text-white"></i>
                </button>
            </div>
        ) : null
    );
}

const JobInfo = (props) => {
    const prDate = new Date(props.job.since * 1000);

    const commitMsgLines = props.job.commit.message.split("\n");

    return (
        <>
        <div className="row my-1">
            {
                (props.job.prinfo) ? (
                    <GithubCol title={`PR #${props.job.prinfo.number}`} url={props.job.prinfo.url} color={linkColor[props.job.state]} />
                ): (
                    <GithubCol title={`${props.job.ref.split("/")[2]}`} url={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}/tree/${props.job.ref.split("/")[2]}`} color={linkColor[props.job.state]} />
                )
            }
        </div>
        <div className="row my-1">
            <CommitWithAuthorCol color={linkColor[props.job.state]} commit={props.job.commit.sha} author={props.job.commit.author} />
        </div>
        <div className="row my-1">
            <div className="col col-md12 text-start">
                <i className="bi-card-text me-1"></i>{commitMsgLines[0]}
                {(commitMsgLines.length > 1) && (
                <>
                <button className="btn btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseCommitMsg" aria-expanded="false" aria-controls="collapseCommitMsg">
                    <i className="bi-arrows-angle-expand"></i>
                </button>
                <div className="collapse" id="collapseCommitMsg">
                    {commitMsgLines.slice(1).map(line => <div className="ms-4">{line}</div>)}
                </div>
                </>
                )}
            </div>
        </div>
        <div className="row my-1">
            <DateCompleteCol date={prDate} />
        </div>
        <div className="row my-1">
            <div className="col col-md-4">
                <i className="bi-info-circle me-1"></i>{`Job: ${props.job.uid}`}
            </div>
        </div>
        <div className="row my-1">
            {(props.job.runtime) ? <RuntimeCol runtime={moment.duration(props.job.runtime * -1000).humanize()} /> : (<div className="col-md-2"></div>)}
        </div>
        </>
    );
}

const JobDetails = (props) => {
    const [ fetched, setFetched ] = useState(false);
    const [ job, setJob ] = useState(null);
    const [ jobStatus, setJobStatus ] = useState(null);
    const [ jobOutput, setJobOutput ] = useState(null);
    const [ alerts, setAlerts ] = useState([]);

    let { uid } = useParams();

    const fetchJob = () => {
        axios.get(`${murdockHttpBaseUrl}/job/${uid}`)
            .then(res => {
                setJob(res.data);
                setFetched(true);
                setJobStatus(res.data.status);
                setJobOutput(res.data.output);
            })
            .catch(error => {
                console.log(error);
                setJob(null);
                setJobStatus(null);
                setJobOutput("");
                setFetched(true);
            });
    };

    const handleWsData = (data) => {
        const msg = JSON.parse(data);
        if (msg.cmd === "reload") {
            fetchJob();
        }
        else if (msg.cmd === "status" && job) {
            if (job.uid !== msg.uid) {
                return;
            }
            setJobStatus(msg.status);
        }
        else if (msg.cmd === "output" && job) {
            if (job.uid !== msg.uid) {
                return;
            }
            let tmpOutput = jobOutput;
            tmpOutput += msg.line;
            setJobOutput(tmpOutput);
        }
    }

    const handleWsOpen = () => {
        console.log("Websocket opened");
    }

    const handleWsClose = () => {
        console.log("Websocket closed");
    }

    const notify = (uid, result, message) => {
        const alertsList = alerts.slice();
        alertsList.push({uid: uid, result: result, message: message})
        setAlerts(alertsList);
        setTimeout(() => {
            const alertsList = alerts.filter(item => item.uid !== uid);
            setAlerts(alertsList);
        }, 6000);
    }

    const refRepr = (ref) => {
        if (ref) {
            return `${ref.split("/").slice(2).join("/")}`
        }
        return "";
    };

    useEffect(() => {
        if (!fetched && !job) {
            fetchJob();
            return;
        }

        if (!job) {
            return;
        }

        const jobInfo = (job.prinfo) ? `PR #${job.prinfo.number}` : refRepr(job.ref)
        document.title = `Murdock - ${jobInfo} - ${job.commit.sha.slice(0, 7)}`;
    });

    return (
        (fetched && job) ? (
            <div className="container">
                <div className="position-fixed bottom-0 end-0 p-3" style={{zIndex:11}}>
                    {
                        alerts.map(item => (
                            <div key={item.uid} className="toast show m-1" role="alert" aria-live="assertive" aria-atomic="true">
                                <div className={`toast-body text-${item.result}`}>
                                    <i className={`bi-${(item.result === "danger") ? "x" : "info"}-circle-fill me-2`}></i>{item.message}
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div className={`card m-2`}>
                    <div className={`card-header text-${textColor[job.state]} bg-${cardColor[job.state]}`}>
                        <JobTitle
                            job={job}
                            user={props.user}
                            permissions={props.userPermissions}
                            notify={notify}
                        />
                    </div>
                    <div className="card-body">
                        <JobInfo job={job} />
                        {jobStatus && <JobStatus job={job} status={jobStatus} />}
                        {<JobFailures job={job} status={jobStatus} />}
                    </div>
                </div>
                {(job.state !== "queued") &&
                <div className="m-2">
                    <ul class="nav nav-tabs">
                        <li class="nav-item">
                            <button class="brn nav-link active" aria-current="page">Output</button>
                        </li>
                    </ul>
                    {<JobOutput job={job} output={jobOutput} />}
                </div>
                }
                <Websocket
                    url={murdockWsUrl}
                    onOpen={handleWsOpen}
                    onMessage={handleWsData}
                    onClose={handleWsClose}
                />
        </div>
        ) : job && (
            <LoadingSpinner />
        )
    );
};

export default JobDetails;
