import { useParams } from "react-router-dom";

import Job from './Job';

const JobUid = (props) => {
    const { uid, tab } = useParams();

    return (
        <Job tab={tab} url={`${uid}`} />
    );
};

export default JobUid;
