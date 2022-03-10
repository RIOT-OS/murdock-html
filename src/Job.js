import axios from 'axios';
import moment from 'moment';

import Websocket from 'react-websocket';
import { useState, useEffect, useCallback } from "react";
import { useHistory } from "react-router-dom";

import { murdockHttpBaseUrl, murdockWsUrl, cardColor, cardIcon, linkColor, textColor, stateBadge } from './constants';
import { LoadingSpinner } from './components';
import { CommitWithAuthorCol, DateCol, RuntimeCol } from './components';
import { JobBuilds, JobTests } from './JobResults';
import { JobOutput } from './JobOutput';
import { JobStats } from './JobStats';

const JobTitle = (props) => {

    const history = useHistory();

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
            props.notify(props.job.uid, "info", `Job ${props.job.commit.sha.substring(0, 7)} ${context} restarted`);
            history.push("/");
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

    const title = (props.job.prinfo) ? `PR #${props.job.prinfo.number}: ${props.job.prinfo.title}` : refRepr(props.job.ref)
    let titleUrl = null;
    if (props.job.prinfo) {
        titleUrl = props.job.prinfo.url;
    } else if (props.job.ref && props.job.ref.startsWith("refs/")) {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/tree/${props.job.ref.split("/")[2]}`;
    } else {
        titleUrl = `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/${props.job.commit.sha}`;
    }

    return (
        <div className="row align-items-center">
            <div className="col-sm-10">
                {titleUrl ? (
                <a className={`link-underline-hover text-${textColor[props.job.state]} align-middle me-1`} href={titleUrl} target="_blank" rel="noreferrer noopener">
                    {cardIcon[props.job.state]}{title}
                </a>
                ) : (
                    <>{cardIcon[props.job.state]}{title}</>
                )}
            </div>
            <div className="col-sm-2 text-end">
            {(props.permissions === "push" && ["errored", "passed", "stopped"].includes(props.job.state)) && (
                <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0 align-middle`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Restart" onClick={restart}>
                    <i className="bi-arrow-clockwise"></i>
                </button>)}
            {(props.permissions === "push" && props.job.state === "running") && (
                <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0 align-middle`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Abort" onClick={abort}>
                    <i className="bi-x-circle"></i>
                </button>)}
            {(props.permissions === "push" && props.job.state === "queued") && (
                <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0 align-middle`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Cancel" onClick={cancel}>
                    <i className="bi-x-circle"></i>
                </button>)}
            </div>
        </div>
    );
}

const JobDetails = (props) => {
    const envSorted = Object.fromEntries(Object.entries(props.job.env).sort())

    return (
        <>
        <div className="card m-1">
            <div className="card-header">Context</div>
            <div className="card-body p-0">
                <table className="table table-sm">
                <tbody>
                {props.job.hasOwnProperty("triggered_by") && (
                <tr>
                    <td>Triggered by</td>
                    <td>{`${props.job.triggered_by}`}</td>
                </tr>)}
                <tr>
                    <td>Trigger type</td>
                    <td>{`${props.job.trigger}`}</td>
                </tr>
                <tr>
                    <td>Fasttracked</td>
                    <td>{`${props.job.fasttracked ? "True": "False"}`}</td>
                </tr>
                </tbody>
                </table>
            </div>
        </div>
        <div className="card m-1">
            <div className="card-header">Environment</div>
            <div className="card-body p-0">
            <table className="table table-sm">
                <tbody>
                {Object.entries(envSorted).map(elem => <tr key={elem[0]}><td>{elem[0]}</td><td><span className="text-break">{elem[1]}</span></td></tr>)}
                </tbody>
                </table>
            </div>
        </div>
        </>
    )
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
            <div className="col col-md-4">
                <i className="bi-bar-chart-line me-1"></i>
                {`fail: ${props.status.failed} pass: ${props.status.passed} done: ${jobsDone}/${props.status.total}`}
            </div>
        );
    }
    else if (props.status.status) {
        buildStatus = (
            <div className="col col-md-4">
                <i className="bi-arrow-left-right me-1"></i>{props.status.status}
            </div>
        );
    }
    else {
        return null;
    }

    return (
        <div className="row my-1">
        {["running", "stopped"].includes(props.job.state) && (
            <div className="col col-md-5">
                <div className="progress" style={{height: "22px"}}>
                    <div className={`progress-bar progress-bar-animated progress-bar-striped bg-${props.job.status.failed ? "danger" : "warning"}`} role="progressbar"
                            style={{ width: `${progressPercent}%` }}
                            aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
                            <span className="mt-2"><h6>{progressPercent}%</h6></span>
                    </div>
                </div>
            </div>
        )}
        {buildStatus}
        </div>
    );
}

const JobInfo = (props) => {
    const prDate = new Date(props.job.creation_time * 1000);

    const commitMsgLines = props.job.commit.message.split("\n");

    let runtime = <div className="col col-md-2"></div>;
    if (props.job.state === "running" && props.status && props.status.eta) {
        runtime = <div className="col col-md-2"><i className="bi-clock"></i><span className="m-1">{moment.duration(props.status.eta, "seconds").humanize(true)}</span></div>;
    }
    else if (props.job.state !== "running" && props.job.runtime) {
        runtime = <RuntimeCol runtime={moment.duration(props.job.runtime * -1000).humanize()} />;
    }

    return (
        <div className="position-relative">
            <div className="position-absolute top-0 end-0">
                <h5>{stateBadge[props.job.state]}</h5>
            </div>
        <div className="row">
            <div className="col col-sm-5" style={{ minWidth: "250px"}}>
                <div className="row align-items-center">
                    <div className="col">
                        <CommitWithAuthorCol color={linkColor[props.job.state]} commit={props.job.commit.sha} author={props.job.commit.author} />
                    </div>
                </div>
                <div className="row align-items-center">
                    <div className="col">
                        <i className="bi-card-text me-1"></i>{commitMsgLines[0]}
                        {(commitMsgLines.length > 1) && (
                        <>
                        <button className="btn btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseCommitMsg" aria-expanded="false" aria-controls="collapseCommitMsg">
                            <i className="bi-arrows-angle-expand"></i>
                        </button>
                        <div className="collapse" id="collapseCommitMsg">
                            {commitMsgLines.slice(1).map((line, index) => <div key={index} className="ms-4">{line}</div>)}
                        </div>
                        </>
                        )}
                    </div>
                </div>
            </div>
            <DateCol date={prDate} />
            {runtime}
        </div>
        {props.job.prinfo && props.job.prinfo.labels.length > 0 && (
        <div className="row align-items-center">
            <div className="col col-sm-12 text-start">
            {props.job.prinfo.labels.map(label => <span key={label} className="badge rounded-pill bg-primary ms-1">{label}</span>)}
            </div>
        </div>
        )}
        </div>
    );
}

const Job = (props) => {
    let history = useHistory();

    const [ fetched, setFetched ] = useState(false);
    const [ job, setJob ] = useState(null);
    const [ jobStatus, setJobStatus ] = useState(null);
    const [ jobOutput, setJobOutput ] = useState(null);
    const [ activePanel, setActivePanel ] = useState(props.tab);
    const [ stats, setStats ] = useState(null);
    const [ builds, setBuilds ] = useState(null);
    const [ buildFailures, setBuildFailures ] = useState(null);
    const [ tests, setTests ] = useState(null);
    const [ testFailures, setTestFailures ] = useState(null);

    const fetchJob = useCallback(
        () => {
            axios.get(`${murdockHttpBaseUrl}/job/${props.url}`)
            .then(res => {
                setJob(res.data);
                setJobStatus(res.data.status);
                setJobOutput(res.data.output);
                setFetched(true);
            })
            .catch(error => {
                console.log(error);
                setJob(null);
                setJobStatus(null);
                setJobOutput("");
                setFetched(true);
            });
        }, [props.url]
    );

    const fetchBuilds = useCallback(
        () => {
            setBuilds([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/builds.json`)
            .then(res => {
                setBuilds(res.data);
            })
            .catch(error => {
                console.log("No build results found");
            });
        }, [job]
    );

    const fetchBuildFailures = useCallback(
        () => {
            setBuildFailures([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/build_failures.json`)
            .then(res => {
                setBuildFailures(res.data);
            })
            .catch(error => {
                console.log("No build failures found");
            });
        }, [job]
    );

    const fetchTests = useCallback(
        () => {
            setTests([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/tests.json`)
            .then(res => {
                setTests(res.data);
            })
            .catch(error => {
                console.log("No test results found");
            });
        }, [job]
    );

    const fetchTestFailures = useCallback(
        () => {
            setTestFailures([]);
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/test_failures.json`)
            .then(res => {
                setTestFailures(res.data);
            })
            .catch(error => {
                console.log("No test failures found");
            });
        }, [job]
    );

    const fetchStats = useCallback(
        () => {
            setStats({});
            axios.get(`${murdockHttpBaseUrl}/results/${job.uid}/stats.json`)
            .then(res => {
                setStats(res.data);
            })
            .catch(error => {
                console.log("No job statitics found");
            });
        }, [job]
    );

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

    const refRepr = (ref) => {
        if (ref) {
            return `${ref.split("/").slice(2).join("/")}`
        }
        return "";
    };

    function getFaviconElement() {
        return document.getElementById("favicon");
      }

    useEffect(() => {
        if (!fetched) {
            fetchJob();
            return;
        }

        if (!job) {
            return;
        }

        if (!["builds", "tests", "output", "details", "stats"].includes(props.tab)) {
            if (builds && builds.length && ["passed", "errored"].includes(job.state)) {
                setActivePanel("builds");
            } else if (jobStatus && jobStatus.failed_builds && (jobStatus.failed_builds.length > 0) && ["stopped", "running"].includes(job.state)) {
                setActivePanel("builds");
            } else if (job.state === "queued") {
                setActivePanel("details");
            } else {
                setActivePanel("output");
            }
        } else {
            setActivePanel(props.tab);
        }

        const jobInfo = (job.prinfo) ? `PR #${job.prinfo.number}` : refRepr(job.ref)
        document.title = `Murdock - ${jobInfo} - ${job.commit.sha.slice(0, 7)}`;

        const favicon = getFaviconElement();
        if (job.state === "passed") {
            favicon.href = "/passed.png";
            document.title += " - Passed";
        }
        else if (job.state === "errored") {
            favicon.href = "/failed.png";
            document.title += " - Failed";
        }
        else {
            favicon.href = "/favicon.png";
        }

        if (["errored", "passed"].includes(job.state)) {
            if (!builds) {
                fetchBuilds();
            }
            if (!buildFailures) {
                fetchBuildFailures();
            }
            if (!tests) {
                fetchTests();
            }
            if (!testFailures) {
                fetchTestFailures();
            }
            if (!testFailures) {
                fetchStats();
            }
        }
    }, [
        buildFailures, builds, fetchBuildFailures, fetchBuilds, fetchJob,
        fetchStats, fetchTestFailures, fetchTests, fetched, job, stats,
        testFailures, tests, history, jobStatus, props.tab
    ]);

    const buildsTabAvailable = (
        (builds && builds.length > 0) ||
        (jobStatus && jobStatus.failed_builds && jobStatus.failed_builds.length > 0)
    );

    const testsTabAvailable = (
        (tests && tests.length > 0) ||
        (jobStatus && jobStatus.failed_tests && jobStatus.failed_tests.length > 0)
    );

    const detailsTabAvailable = (
        job &&
        job.hasOwnProperty("fasttracked") &&
        job.hasOwnProperty("trigger") &&
        job.env
    );

    const statsTabAvailable = stats && stats.total_jobs > 0;

    const hasFailedBuilds = (
        (buildFailures && buildFailures.length > 0) ||
        (jobStatus && jobStatus.failed_builds && jobStatus.failed_builds.length > 0)
    )

    const hasFailedTests = (
        (buildFailures && buildFailures.length > 0) ||
        (jobStatus && jobStatus.failed_builds && jobStatus.failed_builds.length > 0)
    )

    return (
        (fetched && job) ? (
            <>
                <div className={`card m-2`}>
                    <div className={`card-header text-${textColor[job.state]} bg-${cardColor[job.state]}`}>
                        <JobTitle
                            job={job}
                            user={props.user}
                            permissions={props.userPermissions}
                            notify={props.notify}
                        />
                    </div>
                    <div className="card-body p-2 px-3">
                        <JobInfo job={job} status={jobStatus} />
                        {jobStatus && <JobStatus job={job} status={jobStatus} />}
                    </div>
                </div>
                <div className="m-2">
                    <ul className="nav nav-tabs">
                        {buildsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "builds") ? "active" : ""}`} id="builds-tab" data-bs-toggle="tab" data-bs-target="#builds" type="button" role="tab" aria-controls="builds" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/builds`)}}>
                                <i className={`bi-${hasFailedBuilds ? "x text-danger": "check text-success"} me-1`}></i>Builds
                            </button>
                        </li>
                        )}
                        {testsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "tests") ? "active" : ""}`} id="tests-tab" data-bs-toggle="tab" data-bs-target="#tests" type="button" role="tab" aria-controls="tests" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/tests`)}}>
                            <i className={`bi-${hasFailedTests ? "x text-danger": "check text-success"} me-1`}></i>Tests
                            </button>
                        </li>
                        )}
                        {(job.state !== "queued") &&
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "output") ? "active" : ""}`} id="output-tab" data-bs-toggle="tab" data-bs-target="#output" type="button" role="tab" aria-controls="output" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/output`)}}>
                                <i className="bi-file-text-fill text-dark me-1"></i>Output
                            </button>
                        </li>}
                        {statsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "stats") ? "active" : ""}`} id="stats-tab" data-bs-toggle="tab" data-bs-target="#stats" type="button" role="tab" aria-controls="stats" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/stats`)}}>
                                <i className={`bi-bar-chart-line text-dark me-1`}></i>Stats
                            </button>
                        </li>
                        )}
                        {detailsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "details") ? "active" : ""}`} id="details-tab" data-bs-toggle="tab" data-bs-target="#details" type="button" role="tab" aria-controls="details" aria-selected="false" onClick={() => {history.push(`/details/${props.url}/details`)}}>
                                <i className="bi-info-circle text-dark me-1"></i>Details
                            </button>
                        </li>
                        )}
                    </ul>
                    <div className="tab-content">
                        <div className={`tab-pane ${(activePanel === "output") ? "show active" : ""}`} id="output" role="tabpanel" aria-labelledby="output-tab">
                            <JobOutput job={job} output={jobOutput} />
                        </div>
                        <div className={`tab-pane ${(activePanel === "builds") ? "show active" : ""}`} id="builds" role="tabpanel" aria-labelledby="builds-tab">
                            {buildsTabAvailable && <JobBuilds uid={job.uid} builds={builds} buildFailures={buildFailures} job={job} status={jobStatus} stats={stats} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "tests") ? "show active" : ""}`} id="tests" role="tabpanel" aria-labelledby="tests-tab">
                            {testsTabAvailable && <JobTests tests={tests} testFailures={testFailures} job={job} status={jobStatus} stats={stats} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "details") ? "show active" : ""}`} id="details" role="tabpanel" aria-labelledby="details-tab">
                            {detailsTabAvailable && <JobDetails job={job} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "stats") ? "show active" : ""}`} id="stats" role="tabpanel" aria-labelledby="stats-tab">
                            {statsTabAvailable && <JobStats stats={stats} />}
                        </div>
                    </div>
                </div>
                <Websocket
                    url={murdockWsUrl}
                    onOpen={handleWsOpen}
                    onMessage={handleWsData}
                    onClose={handleWsClose}
                />
            </>
        ) : job && (
            <LoadingSpinner />
        )
    );
};

export default Job;
