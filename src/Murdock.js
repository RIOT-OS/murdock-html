/*
 * Copyright (C) 2021 Inria
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Alexandre Abadie <alexandre.abadie@inria.fr>
 */

import { Suspense, lazy, Component } from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    useLocation
  } from 'react-router-dom';

import axios from 'axios';
import GithubUserButton from './GithubUserButton';

import {
  defaultLoginUser,
  getUserFromStorage, removeUserFromStorage, storeUserToStorage
} from './userStorage';
import { LoadingSpinner } from './components';

const Dashboard = lazy(() => import('./Dashboard'));
const Nightlies = lazy(() => import('./Nightlies'));

const MurdockNavBar = (props) => {
    const location = useLocation();

    return (
        <div>
          <nav className="navbar navbar-expand-lg sticky-top navbar-dark bg-dark">
            <div className="container-fluid">
              <a className="navbar-brand" href={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"><i className="bi-github me-1"></i>{process.env.REACT_APP_GITHUB_REPO}</a>
              <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
              </button>
              <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll">
                  <li className="nav-item">
                    <Link to="/" className={location.pathname === "/" ? "nav-link active": "nav-link"}>Dashboard</Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/nightlies" className={location.pathname === "/nightlies" ? "nav-link active": "nav-link"}>Nightlies</Link>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href={`${process.env.REACT_APP_MURDOCK_HTTP_BASE_URL}/api`} target="_blank" rel="noopener noreferrer">API <i className="bi-box-arrow-up-right"></i></a>
                  </li>
                </ul>
                <div className="d-flex align-items-center">
                  <GithubUserButton user={props.user} onLoginSuccess={props.onLoginSuccess} onLoginFailure={props.onLoginFailure} onLogout={props.onLogout} />
                </div>
              </div>
            </div>
          </nav>
        </div>
    );
}

class Murdock extends Component {
  constructor(props) {
    super(props);
    this.state = {
        user: getUserFromStorage(),
        userPermissions: "unknown",
    };
    this.onLoginSuccess = this.onLoginSuccess.bind(this);
    this.onLoginFailure = this.onLoginFailure.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.fetchUserPermissions = this.fetchUserPermissions.bind(this);
  };

  onLoginSuccess(response) {
    const loggedUser = {
        login: response.profile.name,
        avatarUrl: response.profile.profilePicURL,
        token: response.token.accessToken,
        expiresAt: response.token.expiresAt,
    }
    storeUserToStorage(loggedUser);
    this.fetchUserPermissions(loggedUser);
  };

  onLoginFailure(error) {
    console.error(error);
    this.setState({user: defaultLoginUser, userPermissions: "no"});
  };

  onLogout() {
    removeUserFromStorage(this.state.user);
    this.setState({user: defaultLoginUser, userPermissions: "no"});
  };

  fetchUserPermissions(loggedUser) {
    if (loggedUser === "anonymous") {
      this.setState({user: defaultLoginUser, userPermissions: "no"});
      return;
    }

    axios.get(
      `https://api.github.com/repos/${process.env.REACT_APP_GITHUB_REPO}`,
      { headers: {Authorization: `token ${loggedUser.token}`}},
    )
    .then(res => {
      if (res.data.permissions && res.data.permissions.push) {
        this.setState({user: loggedUser, userPermissions: "push"});
      } else {
        this.setState({user: loggedUser, userPermissions: "no"});
      }
    })
    .catch(error => {
      console.log(error);
      this.setState({user: loggedUser, userPermissions: "no"});
    });
  };

  componentDidMount() {
    if (this.state.userPermissions === "unknown") {
      this.fetchUserPermissions(this.state.user);
    }
  };

  render() {
    return (
      <Router>
          <MurdockNavBar user={this.state.user} onLoginSuccess={this.onLoginSuccess} onLoginFailure={this.onLoginFailure} onLogout={this.onLogout} />
          <Suspense fallback={<div className="container"><LoadingSpinner /></div>}>
              <Switch>
                  <Route exact path="/" render={() => <Dashboard user={this.state.user} userPermissions={this.state.userPermissions} />} />
                  <Route path="/nightlies" component={Nightlies}/>
              </Switch>
          </Suspense>
      </Router>
    )
  }
};

export default Murdock;
