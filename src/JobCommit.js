import { useParams } from "react-router-dom";

import Job from './Job';

const JobCommit = (props) => {
    const { commit, tab } = useParams();

    return (
        <Job tab={tab} url={`commit/${commit}`} {...props} />
    );
};

export default JobCommit;
