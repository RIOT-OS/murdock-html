import { murdockHttpBaseUrl } from './constants';
import SocialLogin from "./SocialLogin";


const GithubUserButton = (props) => {
    const roleTooltip = (props.role === "Maintainer") ? (
        "You have access to extra controls: cancel queued jobs, stop running jobs or restart a stoppped/failed/success job"
    ) : (
        "You have no extra feature, just your github logo visible in the navbar!"
    );

    return (
        (props.user.login === "anonymous") ? (
        <SocialLogin
            provider="github"
            appId={process.env.REACT_APP_MURDOCK_GITHUP_APP_CLIENT_ID}
            gatekeeper={`${murdockHttpBaseUrl}/github`}
            redirect={window.location.href}
            autoCleanUri={true}
            onLoginSuccess={props.onLoginSuccess}
            onLoginFailure={props.onLoginFailure}
            scope={"read:user"}
        >
        <i className="bi-github me-1"></i>Login with GitHub
        </SocialLogin>
        ) : (
            <>
            <div className="dropdown">
                <div className="dropdown-toggle" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                    <img className="rounded" src={props.user.avatarUrl} alt="GitHub Avatar" height="28" data-bs-toggle="tooltip" data-bs-placement="bottom" title={props.user.login}></img>
                </div>
                <ul className="dropdown-menu dropdown-menu-sm-end" style={{minWidth: "20px"}} aria-labelledby="userMenuButton">
                    <li>
                        <div className="dropdown-item text-left" data-bs-toggle="tooltip" data-bs-placement="bottom" title={roleTooltip}>
                            <i className={`bi-${(props.role === "Maintainer") ? "shield-shaded" : "person"} me-1`}></i>
                            {props.role}
                        </div>
                    </li>
                    <li>
                        <button className="dropdown-item text-left" type="button" onClick={props.onLogout}>
                            <i className="bi-box-arrow-right me-1"></i>Logout
                        </button>
                    </li>
                </ul>
            </div>
            </>
        )
    )
}

export default GithubUserButton;
