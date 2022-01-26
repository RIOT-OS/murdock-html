import { murdockHttpBaseUrl } from './constants';
import SocialLogin from "./SocialLogin";


const GithubUserButton = (props) => {
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
                <ul className="dropdown-menu dropdown-menu-sm-end" aria-labelledby="userMenuButton">
                    <li><button className="dropdown-item" type="button" onClick={props.onLogout}><div className="text-center">Logout <i className="bi-box-arrow-right"></i></div></button></li>
                </ul>
            </div>
            </>
        )
    )
}

export default GithubUserButton;
