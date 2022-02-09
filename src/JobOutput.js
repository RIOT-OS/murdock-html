import axios from 'axios';
import $ from 'jquery';
import { useState, useEffect } from "react";

const jobOutputMaxHeight = "500px";

export const JobOutput = (props) => {
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
