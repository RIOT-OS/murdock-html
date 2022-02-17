import { useParams } from "react-router-dom";

import Job from './Job';

const JobTag = (props) => {
    const { tag, tab } = useParams();

    return (
        <Job tab={tab} url={`tag/${tag}`} {...props} />
    );
};

export default JobTag;
