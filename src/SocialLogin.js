import React from "react";
import SocialLogin from "react-social-login";

class SocialLoginButton extends React.Component {
    render() {
        const { children, triggerLogin, ...props } = this.props;
        return (
            <button className="btn btn-outline-primary" onClick={triggerLogin} {...props}>
            {children}
            </button>
        );
    }
}

export default SocialLogin(SocialLoginButton);
