import axios from 'axios';
import moment from 'moment';

import Websocket from 'react-websocket';
import { useState, useEffect, useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";

import { murdockHttpBaseUrl, murdockWsUrl, cardColor, cardIcon, linkColor, textColor, stateBadge } from './constants';
import { LoadingSpinner } from './components';
import { CommitWithAuthorCol, DateCol, GithubCol, RuntimeCol } from './components';
import { JobBuilds, JobTests } from './JobResults';
import { JobOutput } from './JobOutput';
import { JobStats } from './JobStats';

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
        <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Cancel" onClick={cancel}>
            <i className="bi-x-circle"></i>
        </button>
    );

    const stopAction = (props.permissions === "push" && props.job.state === "running") && (
        <button className={`btn btn-outline-${cardColor[props.job.state]} badge fs-5 p-0`} data-bs-toggle="tooltip" data-bs-placement="bottom" title="Abort" onClick={abort}>
            <i className="bi-x-circle"></i>
        </button>
    );

    const title = (props.job.prinfo) ? `${props.job.prinfo.title}` : refRepr(props.job.ref)

    return (
        <div className="row align-items-center">
            <div className="col-md-10">
                {cardIcon[props.job.state]}{title}
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
    const prDate = new Date(props.job.since * 1000);

    const commitMsgLines = props.job.commit.message.split("\n");

    let runtime = <div className="col col-md-2"></div>;
    if (props.job.state === "running" && props.status && props.status.eta) {
        runtime = <div className="col col-md-2"><i className="bi-clock"></i><span className="m-1">{moment.duration(props.status.eta, "seconds").humanize(true)}</span></div>;
    }
    else if (props.job.state !== "running" && props.job.runtime) {
        runtime = <RuntimeCol runtime={moment.duration(props.job.runtime * -1000).humanize()} />;
    }

    return (
        <>
        <div className="row align-items-center">
            <CommitWithAuthorCol color={linkColor[props.job.state]} commit={props.job.commit.sha} author={props.job.commit.author} />
            {
                (props.job.prinfo) ? (
                    <GithubCol title={`PR #${props.job.prinfo.number}`} url={props.job.prinfo.url} color={linkColor[props.job.state]} />
                ): (
                    <GithubCol title={`${props.job.ref.split("/")[2]}`} url={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}/tree/${props.job.ref.split("/")[2]}`} color={linkColor[props.job.state]} />
                )
            }
            <DateCol date={prDate} />
            {runtime}
            <div className="col col-md-2 text-end">
                <h5>{stateBadge[props.job.state]}</h5>
            </div>
        </div>
        <div className="row">
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
        </>
    );
}

const Job = (props) => {
    let { uid, tab } = useParams();
    let history = useHistory();

    const [ fetched, setFetched ] = useState(false);
    const [ job, setJob ] = useState(null);
    const [ jobStatus, setJobStatus ] = useState(null);
    const [ jobOutput, setJobOutput ] = useState(null);
    const [ activePanel, setActivePanel ] = useState(tab);
    const [ stats, setStats ] = useState(null);
    const [ builds, setBuilds ] = useState(null);
    const [ buildFailures, setBuildFailures ] = useState(null);
    const [ tests, setTests ] = useState(null);
    const [ testFailures, setTestFailures ] = useState(null);
    const [ alerts, setAlerts ] = useState([]);

    const fetchJob = useCallback(
        () => {
            axios.get(`${murdockHttpBaseUrl}/job/${uid}`)
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
        }, [uid]
    );

    const fetchBuilds = useCallback(
        () => {
            setBuilds([]);
            axios.get(`${murdockHttpBaseUrl}/results/${uid}/builds.json`)
            .then(res => {
                setBuilds(res.data);
            })
            .catch(error => {
                console.log("No build results found");
            });
        }, [uid]
    );

    const fetchBuildFailures = useCallback(
        () => {
            setBuildFailures([]);
            axios.get(`${murdockHttpBaseUrl}/results/${uid}/build_failures.json`)
            .then(res => {
                setBuildFailures(res.data);
            })
            .catch(error => {
                console.log("No build failures found");
            });
        }, [uid]
    );

    const fetchTests = useCallback(
        () => {
            setTests([]);
            axios.get(`${murdockHttpBaseUrl}/results/${uid}/tests.json`)
            .then(res => {
                setTests(res.data);
            })
            .catch(error => {
                console.log("No test results found");
            });
        }, [uid]
    );

    const fetchTestFailures = useCallback(
        () => {
            setTestFailures([]);
            axios.get(`${murdockHttpBaseUrl}/results/${uid}/test_failures.json`)
            .then(res => {
                setTestFailures(res.data);
            })
            .catch(error => {
                console.log("No test failures found");
            });
        }, [uid]
    );

    const fetchStats = useCallback(
        () => {
            setStats({});
            axios.get(`${murdockHttpBaseUrl}/results/${uid}/stats.json`)
            .then(res => {
                setStats(res.data);
            })
            .catch(error => {
                console.log("No job statitics found");
            });
        }, [uid]
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

        if (!["builds", "tests", "output", "stats"].includes(tab)) {
            if (builds && builds.length && ["passed", "errored"].includes(job.state)) {
                setActivePanel("builds");
            } else if (jobStatus && jobStatus.failed_builds && (jobStatus.failed_builds.length > 0) && ["stopped", "running"].includes(job.state)) {
                setActivePanel("builds");
            } else {
                setActivePanel("output");
            }
        } else {
            setActivePanel(tab);
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
        testFailures, tests, history, tab, uid, jobStatus
    ]);

    const buildsTabAvailable = (
        (builds && builds.length > 0) ||
        (jobStatus && jobStatus.failed_builds && jobStatus.failed_builds.length > 0)
    );

    const testsTabAvailable = (
        (tests && tests.length > 0) ||
        (jobStatus && jobStatus.failed_tests && jobStatus.failed_tests.length > 0)
    );

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
                    <div className="card-body p-2 px-3">
                        <JobInfo job={job} status={jobStatus} />
                        {jobStatus && <JobStatus job={job} status={jobStatus} />}
                    </div>
                </div>
                {(job.state !== "queued") &&
                <div className="m-2">
                    <ul className="nav nav-tabs">
                        {buildsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "builds") ? "active" : ""}`} id="builds-tab" data-bs-toggle="tab" data-bs-target="#builds" type="button" role="tab" aria-controls="builds" aria-selected="false" onClick={() => {history.push(`/details/${uid}/builds`)}}>
                                <i className={`bi-${hasFailedBuilds ? "x text-danger": "check text-success"} me-1`}></i>Builds
                            </button>
                        </li>
                        )}
                        {testsTabAvailable && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "tests") ? "active" : ""}`} id="tests-tab" data-bs-toggle="tab" data-bs-target="#tests" type="button" role="tab" aria-controls="tests" aria-selected="false" onClick={() => {history.push(`/details/${uid}/tests`)}}>
                            <i className={`bi-${hasFailedTests ? "x text-danger": "check text-success"} me-1`}></i>Tests
                            </button>
                        </li>
                        )}
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "output") ? "active" : ""}`} id="output-tab" data-bs-toggle="tab" data-bs-target="#output" type="button" role="tab" aria-controls="output" aria-selected="false" onClick={() => {history.push(`/details/${uid}/output`)}}>
                                <i className="bi-file-text-fill text-dark me-1"></i>Output
                            </button>
                        </li>
                        {(stats && stats.total_jobs > 0) && (
                        <li className="nav-item">
                            <button className={`nav-link ${(activePanel === "stats") ? "active" : ""}`} id="stats-tab" data-bs-toggle="tab" data-bs-target="#stats" type="button" role="tab" aria-controls="stats" aria-selected="false" onClick={() => {history.push(`/details/${uid}/stats`)}}>
                                <i className={`bi-bar-chart-line text-dark me-1`}></i>Stats
                            </button>
                        </li>
                        )}
                    </ul>
                    <div className="tab-content">
                        <div className={`tab-pane ${(activePanel === "output") ? "show active" : ""}`} id="output" role="tabpanel" aria-labelledby="output-tab">
                            <JobOutput job={job} output={jobOutput} />
                        </div>
                        <div className={`tab-pane ${(activePanel === "builds") ? "show active" : ""}`} id="builds" role="tabpanel" aria-labelledby="builds-tab">
                            {buildsTabAvailable && <JobBuilds uid={uid} builds={builds} buildFailures={buildFailures} job={job} status={jobStatus} stats={stats} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "tests") ? "show active" : ""}`} id="tests" role="tabpanel" aria-labelledby="tests-tab">
                            {testsTabAvailable && <JobTests tests={tests} testFailures={testFailures} job={job} status={jobStatus} stats={stats} />}
                        </div>
                        <div className={`tab-pane ${(activePanel === "stats") ? "show active" : ""}`} id="stats" role="tabpanel" aria-labelledby="stats-tab">
                            {(stats && stats.total_jobs && stats.total_jobs > 0) && <JobStats stats={stats} />}
                        </div>
                    </div>
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

export default Job;
