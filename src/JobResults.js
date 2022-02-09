import { useState } from "react";

import { cardColor, cardIcon } from './constants';
import { Result } from './Result';

const Application = (props) => {
    return (
        <div className="card my-1">
            <a className="btn" type="button" href={`/details/${props.uid}/builds/${props.name.replace("/", ":")}`}>
            <div className="row justify-content-between">
                <div className="col col-md-4 text-start">
                    <span className={`text-${cardColor[props.failures ? "errored" : "passed"]}`}>{cardIcon[props.failures ? "errored" : "passed"]}</span>
                    {props.name}
                </div>
                <div className="col col-md-2 text-end">
                    {(props.failures > 0) && <span className="badge rounded-pill bg-danger me-1">{`${props.failures} failed`}</span>}
                    {(props.success > 0) && <span className="badge rounded-pill bg-success">{`${props.success} success`}</span>}
                </div>
            </div>
            </a>
        </div>
    );
};

export const JobBuilds = (props) => {
    const [filter, setFilter] = useState("");
    const [failuresFilter, setFailuresFilter] = useState("");

    const buildsDynamic = props.builds.filter(build => build.application.includes(filter));
    const buildFailuresDynamic = (props.buildFailures) ? props.buildFailures.filter(test => (test.application.includes(failuresFilter) || test.board.includes(failuresFilter))) : [];
    const buildFilterVisible = props.buildFailures && props.buildFailures.length;

    // const build;

    return (
        <>
        {(props.buildFailures && props.buildFailures.length > 0) && (
        <div className="card border-danger m-1">
            <div className="card-header text-light bg-danger">
                <div className="row align-items-center">
                    <div className="col-md-8">{`Failed builds (${buildFailuresDynamic.length}/${props.stats.total_builds})`}</div>
                    <div className="col-md-4">
                        {buildFilterVisible && <input id="build_failures_filter pull-right" className="form-control" type="text" placeholder="Filter failed builds" onChange={(event) => {setFailuresFilter(event.target.value)}} />}
                    </div>
                </div>
            </div>
            <div className="card-body p-1">
                {buildFailuresDynamic.map(build => <Result key={`${build.application}-${build.board}-${build.toolchain}`} uid={props.uid} type="compile" withApplication={true} result={build} />)}
            </div>
        </div>)}
        <div className="card m-1">
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col-md-8">Applications{` (${buildsDynamic.length})`}</div>
                    <div className="col-md-4">
                        <input className="form-control pull-right" type="text" placeholder="Filter applications" onChange={(event) => {setFilter(event.target.value)}} />
                    </div>
                </div>
            </div>
            <div className="card-body p-1">
                {buildsDynamic.map(build => <Application key={build.application} uid={props.uid} name={build.application} success={build.build_success} failures={build.build_failures} />)}
            </div>
        </div>
        </>
    );
};

export const JobTests = (props) => {
    const [filter, setFilter] = useState("");
    const [failuresFilter, setFailuresFilter] = useState("");

    const tests = props.tests.filter(test => test.application.includes(filter));
    const testFailures = (props.testFailures) ? props.testFailures.filter(test => (test.application.includes(failuresFilter) || test.board.includes(failuresFilter))) : [];

    return (
        <>
        {(props.testFailures && props.testFailures.length > 0) && (
        <div className="card border-danger m-1">
            <div className="card-header text-light bg-danger">
                <div className="row align-items-center">
                    <div className="col-md-8">{`Failed tests (${testFailures.length}/${props.stats.total_tests})`}</div>
                    <div className="col-md-4">
                        <input id="build_failures_filter pull-right" className="form-control" type="text" placeholder="Filter failed tests" onChange={(event) => {setFailuresFilter(event.target.value)}} />
                    </div>
                </div>
            </div>
            <div className="card-body p-1">
                {testFailures.map(test => <Result key={`${test.application}-${test.board}-${test.toolchain}`} uid={props.uid} type="run_test" withApplication={true} result={test} />)}
            </div>
        </div>)}
        <div className="card m-1">
            <div className="card-header">
                <div className="row align-items-center">
                    <div className="col-md-8">Applications{` (${tests.length})`}</div>
                    <div className="col-md-4">
                        <input className="form-control pull-right" type="text" placeholder="Filter applications" onChange={(event) => {setFilter(event.target.value)}} />
                    </div>
                </div>
            </div>
            <div className="card-body">
                {tests.map(test => <Application key={test.application} name={test.application} success={test.test_success} failures={test.test_failures} />)}
            </div>
        </div>
        </>
    );
};
