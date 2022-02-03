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
};

const RowElement = (props) => {
    return (
        <div className="card my-1">
            <div className="card-body p-2">
                <div className="row justify-content-between">
                    <div className="col col-md-4">
                        <span className={`text-${cardColor[props.failures ? "errored" : "passed"]}`}>{cardIcon[props.failures ? "errored" : "passed"]}</span>
                        {props.name}
                    </div>
                    <div className="col col-md-2 text-end">
                        {(props.failures > 0) && <span className="badge rounded-pill bg-danger me-1">{`${props.failures} failed`}</span>}
                        {(props.success > 0) && <span className="badge rounded-pill bg-success">{`${props.success} success`}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const JobBuildFailure = (props) => {
    return (
        <div className="card m-1">
            <a className="btn" type="button" href={`${process.env.REACT_APP_MURDOCK_HTTP_BASE_URL}/results/${props.uid}/output/compile/${props.build.application}/${props.build.board}:${props.build.toolchain}.txt`} target="_blank" rel="noreferrer noopener">
                <div className="row">
                <div className="col col-md-5 text-start">
                    <i className="bi-x-circle-fill text-danger me-1"></i>{props.build.application}
                </div>
                <div className="col col-md-2 text-start">
                    <i className="bi-cpu pull-left me-1"></i>{props.build.board}:{props.build.toolchain}
                </div>
                <div className="col col-md-4 text-start">
                    <i className="bi-wrench me-1"></i>{props.build.worker}
                </div>
                <div className="col col-md-1 text-start pe-2">
                    <i className="bi-clock me-1"></i>{props.build.runtime.toFixed(2)}s
                </div>
                </div>
            </a>
        </div>
    );
};

const JobBuilds = (props) => {
    const [filter, setFilter] = useState("");
    const [failuresFilter, setFailuresFilter] = useState("");

    return (
        <>
        {(props.buildFailures) && (
        <div className="card border-danger m-1">
            <div className="card-header text-light bg-danger">
                <div className="row align-items-center">
                    <div className="col-md-8">
                        Failed builds ({props.buildFailures.length})
                    </div>
                    <div className="col-md-4">
                        <input id="build_failures_filter pull-right" className="form-control" type="text" placeholder="Filter failed builds" onChange={(event) => {setFailuresFilter(event.target.value)}} />
                    </div>
                </div>
            </div>
            <div className="card-body p-1">
                {props.buildFailures
                    .filter(build => (build.application.includes(failuresFilter) || build.board.includes(failuresFilter)))
                    .map(build => <JobBuildFailure uid={props.uid} build={build} />)}
            </div>
        </div>)}
        <div className="card m-1">
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col-md-8">Builds{(props.stats.total_builds) ? ` (${props.stats.total_builds})` : ""}</div>
                    <div className="col-md-4">
                        <input className="form-control pull-right" type="text" placeholder="Filter builds" onChange={(event) => {setFilter(event.target.value)}} />
                    </div>
                </div>
            </div>
            <div className="card-body">
                {props.builds
                    .filter(build => build.application.includes(filter))
                    .map(build => <RowElement key={build.application} name={build.application} success={build.build_success} failures={build.build_failures} />)}
            </div>
        </div>
        </>
    );
};

const JobTestFailure = (props) => {
    return (
        <div className="card m-1">
            <a className="btn" type="button" href={`${process.env.REACT_APP_MURDOCK_HTTP_BASE_URL}/results/${props.uid}/output/run_test/${props.test.application}/${props.test.board}:${props.test.toolchain}.txt`} target="_blank" rel="noreferrer noopener">
                <div className="row">
                <div className="col col-md-5 text-start">
                    <i className="bi-x-circle-fill text-danger me-1"></i>{props.test.application}
                </div>
                <div className="col col-md-2 text-start">
                    <i className="bi-cpu pull-left me-1"></i>{props.test.board}:{props.test.toolchain}
                </div>
                <div className="col col-md-4 text-start">
                    <i className="bi-wrench me-1"></i>{props.test.worker}
                </div>
                <div className="col col-md-1 text-start pe-2">
                    <i className="bi-clock me-1"></i>{props.test.runtime.toFixed(2)}s
                </div>
                </div>
            </a>
        </div>
    );
};

const JobTests = (props) => {
    const [filter, setFilter] = useState("");
    const [failuresFilter, setFailuresFilter] = useState("");

    return (
        <>
        {(props.testFailures) && (
        <div className="card border-danger m-1">
            <div className="card-header text-light bg-danger">
                <div className="row align-items-center">
                    <div className="col-md-8">
                        Failed tests ({props.testFailures.length})
                    </div>
                    <div className="col-md-4">
                        <input id="build_failures_filter pull-right" className="form-control" type="text" placeholder="Filter failed tests" onChange={(event) => {setFailuresFilter(event.target.value)}} />
                    </div>
                </div>
            </div>
            <div className="card-body p-1">
                {props.testFailures
                    .filter(test => (test.application.includes(failuresFilter) || test.board.includes(failuresFilter)))
                    .map(test => <JobTestFailure uid={props.uid} test={test} />)}
            </div>
        </div>)}
        <div className="card m-1">
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col-md-8">Tests{(props.stats.total_tests) ? ` (${props.stats.total_tests})` : ""}</div>
                    <div className="col-md-4">
                        <input className="form-control pull-right" type="text" placeholder="Filter tests" onChange={(event) => {setFilter(event.target.value)}} />
                    </div>
                </div>
            </div>
            <div className="card-body">
                {props.tests
                    .filter(test => test.application.includes(filter))
                    .map(test => <RowElement key={test.application} name={test.application} success={test.test_success} failures={test.test_failures} />)}
            </div>
        </div>
        </>
    );
};

const Worker = (props) => {
    return (
        <tr>
            <th scope="row">{props.worker.name}</th>
            <td>{props.worker.runtime_avg.toFixed(2)}</td>
            <td>{props.worker.total_cpu_time.toFixed(2)}</td>
            <td>{props.worker.jobs_count}</td>
        </tr>
    );
};

const JobStats = (props) => {
    if (!props.stats.total_jobs) {
        return null;
    }

    return (
        <>
            <div className="card m-1">
                <div className="card-header">Global stats</div>
                <div className="card-body">
                    <ul className="list-group">
                        <li className="list-group-item">Total jobs: {props.stats.total_jobs}</li>
                        <li className="list-group-item">Total builds: {props.stats.total_builds}</li>
                        {(props.stats.total_tests > 0) && <li className="list-group-item">Total tests: {props.stats.total_tests}</li>}
                        <li className="list-group-item">Total CPU time: {props.stats.total_time}</li>
                    </ul>
                </div>
            </div>
            <div className="card m-1">
                <div className="card-header">Workers stats</div>
                <div className="card-body">
                    <table className="table">
                        <thead>
                            <tr>
                                <th scope="col">Worker</th>
                                <th scope="col">Average time (s)</th>
                                <th scope="col">Total CPU time (s)</th>
                                <th scope="col">Total jobs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.stats.workers.map(worker => <Worker key={worker.name} worker={worker} />)}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

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
    const [ activePanel, setActivePanel ] = useState("output");
    const [ stats, setStats ] = useState(null);
    const [ builds, setBuilds ] = useState(null);
    const [ buildFailures, setBuildFailures ] = useState(null);
    const [ tests, setTests ] = useState(null);
    const [ testFailures, setTestFailures ] = useState(null);
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

    const fetchBuilds = () => {
        setBuilds([]);
        axios.get(`${murdockHttpBaseUrl}/results/${uid}/builds.json`)
        .then(res => {
            setBuilds(res.data);
            if (res.data.length > 0) {
                setActivePanel("builds");
            }
        })
        .catch(error => {
            console.log("No build results found");
        });
    };

    const fetchBuildFailures = () => {
        setBuildFailures([]);
        axios.get(`${murdockHttpBaseUrl}/results/${uid}/build_failures.json`)
        .then(res => {
            setBuildFailures(res.data);
        })
        .catch(error => {
            console.log("No build failures found");
        });
    };

    const fetchTests = () => {
        setTests([]);
        axios.get(`${murdockHttpBaseUrl}/results/${uid}/tests.json`)
        .then(res => {
            setTests(res.data);
        })
        .catch(error => {
            console.log("No test results found");
        });
    };

    const fetchTestFailures = () => {
        setTestFailures([]);
        axios.get(`${murdockHttpBaseUrl}/results/${uid}/test_failures.json`)
        .then(res => {
            setTestFailures(res.data);
        })
        .catch(error => {
            console.log("No test failures found");
        });
    };

    const fetchStats = () => {
        setStats({});
        axios.get(`${murdockHttpBaseUrl}/results/${uid}/stats.json`)
        .then(res => {
            setStats(res.data);
        })
        .catch(error => {
            console.log("No job statitics found");
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

            if (!stats) {
                fetchStats();
            }
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
                        {(job.state === "running") && <JobFailures job={job} status={jobStatus} />}
                    </div>
                </div>
                {(job.state !== "queued") &&
                <div className="m-2">
                    <ul className="nav nav-tabs">
                        {(builds && builds.length > 0) && (
                        <li className="nav-item">
                            <button className={`btn nav-link ${(activePanel === "builds") ? "active" : ""}`} aria-current="page" onClick={() => setActivePanel("builds")}>
                                <i className={`bi-${buildFailures && buildFailures.length > 0 ? "x text-danger": "check text-success"} me-1`}></i>Builds
                            </button>
                        </li>
                        )}
                        {(tests && tests.length > 0) && (
                        <li className="nav-item">
                            <button className={`btn nav-link ${(activePanel === "tests") ? "active" : ""}`} aria-current="page" onClick={() => setActivePanel("tests")}>
                            <i className={`bi-${testFailures && testFailures.length > 0 ? "x text-danger": "check text-success"} me-1`}></i>Tests
                            </button>
                        </li>
                        )}
                        <li className="nav-item">
                            <button className={`btn nav-link ${(activePanel === "output") ? "active" : ""}`} aria-current="page" onClick={() => {setActivePanel("output")}}>
                                <i className="bi-file-text-fill text-dark me-1"></i>Output
                            </button>
                        </li>
                        {(stats && stats.total_jobs) && (
                        <li className="nav-item">
                            <button className={`btn nav-link ${(activePanel === "stats") ? "active" : ""}`} aria-current="page" onClick={() => setActivePanel("stats")}>
                                <i className={`bi-bar-chart-line text-dark me-1`}></i>Stats
                            </button>
                        </li>
                        )}
                    </ul>
                    {(activePanel === "output") && <JobOutput job={job} output={jobOutput} />}
                    {(activePanel === "builds" && builds && builds.length) && <JobBuilds uid={uid} builds={builds} buildFailures={buildFailures} stats={stats} />}
                    {(activePanel === "tests" && tests && tests.length) && <JobTests tests={tests} testFailures={testFailures} stats={stats} />}
                    {(activePanel === "stats" && stats && stats.total_jobs) && <JobStats stats={stats} />}
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
