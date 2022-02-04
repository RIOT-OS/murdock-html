import axios from "axios";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { murdockHttpBaseUrl } from './constants';
import { Result } from './Result';

const ApplicationResults = (props) => {
    const { uid, application } = useParams();
    const [ applicationData, setApplicationData ] = useState(null);
    const [ filter, setFilter ] = useState("");
    const [ failuresFilter, setFailuresFilter ] = useState("");

    const appPath = application.replace(":", "/");
    const typePath = (props.type === "tests") ? "run_test" : "compile";

    const fetchApplicationData = useCallback(
        () => {
            setApplicationData({});
            axios.get(`${murdockHttpBaseUrl}/results/${uid}/output/${typePath}/${appPath}/app.json`)
            .then(res => {
                setApplicationData(res.data);
            })
            .catch(error => {
                console.log("No application data found");
            });
        }, [uid, appPath, typePath]
    );

    useEffect(() => {
        if (!applicationData) {
            fetchApplicationData();
        }

        document.title = `Murdock - ${appPath} ${props.type}`;
    }, [applicationData, appPath, typePath, fetchApplicationData, props.type]);

    return (
        <div className="container">
            <div className="card m-1">
                <a className="btn p-0" type="button" href={`/details/${uid}`}>
                    <div className="card-body bg-light">
                        <div className="row align-items-center">
                            <div className="col-md-4 text-start">
                                <i className="bi-info-circle me-1"></i>{`${appPath} ${props.type}`}
                            </div>
                        </div>
                    </div>
                </a>
            </div>
            {(applicationData && applicationData.failures && applicationData.failures.length > 0) && (
            <div className="card border-danger m-1">
                <div className="card-header text-light bg-danger">
                    <div className="row align-items-center">
                        <div className="col-md-8">
                            Failed {props.type} {(applicationData && applicationData.failures) ? `(${applicationData.failures.length})` : ""}
                        </div>
                        <div className="col-md-4">
                            <input className="form-control" type="text" placeholder={`Filter failed ${props.type}`} onChange={(event) => {setFailuresFilter(event.target.value)}} />
                        </div>
                    </div>
                </div>
                <div className="card-body p-1">
                    {applicationData.failures
                        .filter(result => (result.board.includes(failuresFilter)))
                        .map(result => <Result key={`${result.application}-${result.board}-${result.toolchain}`} uid={uid} type={typePath} result={result} />)}
                </div>
            </div>
            )}
            {(applicationData && applicationData.jobs) && (
            <div className="card m-1">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col-md-8">{`${props.type.replace(/./, char => char.toUpperCase())}`}{(applicationData.jobs.length > 0) ? ` (${applicationData.jobs.length})` : ""}</div>
                        <div className="col-md-4">
                            <input className="form-control pull-right" type="text" placeholder="Filter builds" onChange={(event) => {setFilter(event.target.value)}} />
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    {applicationData.jobs
                        .filter(result => result.board.includes(filter))
                        .map(result => <Result key={`${result.application}-${result.board}-${result.toolchain}`} uid={uid} type={typePath} result={result} />)}
                </div>
            </div>
        )}
        </div>
    )
};

export default ApplicationResults;
