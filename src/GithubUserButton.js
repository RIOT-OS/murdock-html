import { Component } from "react";

import { murdockHttpBaseUrl } from './constants';
import SocialLogin from "./SocialLogin";
import {
    defaultLoginUser,
    getUserFromStorage, removeUserFromStorage, storeUserToStorage
} from './userStorage';


class GithubUserButton extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: getUserFromStorage(),
        };
        this.onLoginSuccess = this.onLoginSuccess.bind(this);
        this.onLoginFailure = this.onLoginFailure.bind(this);
        this.logout = this.logout.bind(this);
    }

    onLoginSuccess(response) {
        const user = {
            login: response.profile.name,
            avatarUrl: response.profile.profilePicURL,
            token: response.token.accessToken,
            expiresAt: response.token.expiresAt,
        }
        storeUserToStorage(user);
        window.location.reload();
    }

    onLoginFailure(error) {
        console.error(error);
        this.setState({user: defaultLoginUser});
    }

    logout() {
        removeUserFromStorage(this.state.user);
        window.location.reload();
    }

    render() {
        return (
            (this.state.user.login === "anonymous") ? (
            <SocialLogin
                provider="github"
                appId={process.env.REACT_APP_MURDOCK_GITHUP_APP_CLIENT_ID}
                gatekeeper={`${murdockHttpBaseUrl}/github`}
                redirect={window.location.href}
                autoCleanUri={true}
                onLoginSuccess={this.onLoginSuccess}
                onLoginFailure={this.onLoginFailure}
            >
            <i className="bi-github me-1"></i>Login with GitHub
            </SocialLogin>
            ) : (
                <>
                <div className="dropdown">
                    <div className="dropdown-toggle" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                        <img className="rounded" src={this.state.user.avatarUrl} alt="GitHub Avatar" height="24" data-bs-toggle="tooltip" data-bs-placement="bottom" title={this.state.user.login}></img>
                    </div>
                    <ul className="dropdown-menu dropdown-menu-sm-end" aria-labelledby="userMenuButton">
                        <li><button className="dropdown-item" type="button" onClick={this.logout}><div className="text-center">Logout</div></button></li>
                    </ul>
                </div>
                </>
            )
        )
    }
}

export default GithubUserButton;
