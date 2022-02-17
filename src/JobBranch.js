import { useParams } from "react-router-dom";

import Job from './Job';

const JobBranch = (props) => {
    const { branch, tab } = useParams();

    return (
        <Job tab={tab} url={`branch/${branch}`} {...props} />
    );
};

export default JobBranch;
