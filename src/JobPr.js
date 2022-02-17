import { useParams } from "react-router-dom";

import Job from './Job';

const JobPr = (props) => {
    const { prnum, tab } = useParams();

    return (
        <Job tab={tab} url={`pr/${prnum}`} {...props} />
    );
};

export default JobPr;
