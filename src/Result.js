import axios from "axios";

import { useCallback, useState } from "react";

import { murdockHttpBaseUrl, cardColor, cardIcon } from './constants';

export const Result = (props) => {
    const [output, setOutput] = useState("");
    const [outputVisible, setOutputVisible] = useState(false);

    const fetchOutput = useCallback(
        () => {
            axios.get(`${murdockHttpBaseUrl}/results/${props.uid}/output/${props.type}/${props.result.application}/${props.result.board}:${props.result.toolchain}.txt`)
            .then(res => {
                setOutput(res.data);
            })
            .catch(error => {
                console.log("No application data found");
            });
        }, [
            props.uid, props.type, props.result.application, props.result.board,
            props.result.toolchain
        ]
    );

    const toggleOutput = () => {
        if (output === "") {
            fetchOutput();
        }
        setOutputVisible(!outputVisible);
    };

    return (
        <div className="card my-1">
            {/* <button className="btn" type="button" href={`${murdockHttpBaseUrl}/results/${props.uid}/output/${props.type}/${props.job.application}/${props.job.board}:${props.job.toolchain}.txt`} target="_blank" rel="noreferrer noopener"> */}
            <button className="btn" type="button" onClick={toggleOutput}>
            <div className="row">
                <div className="col col-md-7 text-start">
                    <span className={`text-${cardColor[props.result.status ? "passed" : "errored"]}`}>{cardIcon[props.result.status ? "passed" : "errored"]}</span>
                    {props.result.board}:{props.result.toolchain}
                </div>
                <div className="col col-md-4 text-start">
                    <i className="bi-wrench me-1"></i>{props.result.worker}
                </div>
                <div className="col col-md-1 text-start">
                    <i className="bi-clock me-1"></i>{props.result.runtime.toFixed(2)}s
                </div>
            </div>
            </button>
            <div className={`collapse ${outputVisible ? "show": "hide"}`}>
                <div className="bg-dark overflow-auto p-2 mb-1">
                    <pre className="text-white">{output}</pre>
                </div>
            </div>
        </div>
    );
};
