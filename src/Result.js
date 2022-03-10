import axios from "axios";

import { useCallback, useState } from "react";
import { Collapse } from 'react-collapse';

import { murdockHttpBaseUrl, cardColor, cardIcon } from './constants';

export const Result = (props) => {
    const [output, setOutput] = useState("");
    const [outputVisible, setOutputVisible] = useState(false);

    const outputUrl = `${murdockHttpBaseUrl}/results/${props.uid}/output/${props.type}/${props.result.application}/${props.result.target}:${props.result.toolchain}.txt`;

    const hasDetailedinfo = props.result.target && props.result.toolchain && props.result.worker && props.result.runtime;

    const fetchOutput = useCallback(
        () => {
            axios.get(outputUrl)
            .then(res => {
                setOutput(res.data);
            })
            .catch(error => {
                console.log("No application data found");
            });
        }, [ outputUrl ]
    );

    const toggleOutput = () => {
        if (output === "") {
            fetchOutput();
        }
        setOutputVisible(!outputVisible);
    };

    return (
        <>
        {hasDetailedinfo &&
        <div className="card my-1">
            <button className="btn" type="button" onClick={toggleOutput} data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${outputVisible ? "Hide": "Show"} output`}>
                <div className="row row-cols-sm-1">
                    {(props.withApplication) && (
                    <div className="col col-sm-3 text-start" style={{ minWidth: "250px"}}>
                        <span className={`text-${cardColor[props.result.status ? "passed" : "errored"]} me-2`}>{cardIcon[props.result.status ? "passed" : "errored"]}</span>
                        {props.result.application}
                    </div>
                    )}
                    <div className={`col col-sm-${props.withApplication ? "3" : "6"} text-start`} style={{ minWidth: "250px"}}>
                        {(props.withApplication) ? (
                            <i className="bi-cpu me-1"></i>
                        ) : (
                            <span className={`text-${cardColor[props.result.status ? "passed" : "errored"]} me-2`}>{cardIcon[props.result.status ? "passed" : "errored"]}</span>
                        )}
                        {props.result.target}:{props.result.toolchain}
                    </div>
                    <div className="col col-sm-4 text-start" style={{ minWidth: "250px"}}>
                        <i className="bi-wrench me-1"></i>{props.result.worker}
                    </div>
                    <div className="col col-sm-2 text-start" style={{ minWidth: "200px"}}>
                        <i className="bi-clock me-1"></i>{props.result.runtime.toFixed(2)}s
                    </div>
                </div>
            </button>
            <Collapse isOpened={outputVisible}>
                <div className="bg-dark overflow-auto p-2 mb-1 position-relative">
                    <div className="btn-toolbar position-absolute top-0 end-0 m-2" role="toolbar">
                        <div className="btn-group justify-content-right" role="group">
                            <a type="button" className="btn btn-sm btn-outline-light" href={outputUrl} target="_blank" rel="noopener noreferrer" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Open in new tab">
                                <i className="bi-box-arrow-up-right"></i>
                            </a>
                        </div>
                    </div>
                    <pre className="text-white">{output}</pre>
                </div>
            </Collapse>
        </div>}
        {props.withApplication && props.result.application && !hasDetailedinfo &&
        <div className="row">
            <div className="col-sm-4">
                {props.result.application}
            </div>
        </div>}
        </>
    );
};
