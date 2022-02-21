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

const JobList = lazy(() => import('./JobList'));
const JobUid = lazy(() => import('./JobUid'));
const JobBranch = lazy(() => import('./JobBranch'));
const JobTag = lazy(() => import('./JobTag'));
const JobCommit = lazy(() => import('./JobCommit'));
const JobPr = lazy(() => import('./JobPr'));
const ApplicationResults = lazy(() => import('./ApplicationResults'));


const MurdockNavBar = (props) => {
    const location = useLocation();

    const role = (props.userPermissions === "push") ? "Maintainer" : "User";

    return (
        <>
          <nav className="navbar navbar-expand-lg sticky-top shadow navbar-dark bg-dark">
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
                    <a className="nav-link" href={`${process.env.REACT_APP_MURDOCK_HTTP_BASE_URL}/api`} target="_blank" rel="noopener noreferrer">API <i className="bi-box-arrow-up-right"></i></a>
                  </li>
                </ul>
                <div className="d-flex align-items-center">
                  <GithubUserButton user={props.user} role={role} onLoginSuccess={props.onLoginSuccess} onLoginFailure={props.onLoginFailure} onLogout={props.onLogout} />
                </div>
              </div>
            </div>
          </nav>
        </>
    );
}

class Murdock extends Component {
  constructor(props) {
    super(props);
    this.state = {
        user: getUserFromStorage(),
        userPermissions: "unknown",
        alerts: [],
    };
    this.onLoginSuccess = this.onLoginSuccess.bind(this);
    this.onLoginFailure = this.onLoginFailure.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.fetchUserPermissions = this.fetchUserPermissions.bind(this);
    this.notify = this.notify.bind(this);
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

  notify(uid, result, message) {
    const alertsList = this.state.alerts.slice();
    alertsList.push({uid: uid, result: result, message: message})
    this.setState({alerts: alertsList.reverse()});
    setTimeout(() => {
        const alertsList = this.state.alerts.filter(item => item.uid !== uid);
        this.setState({alerts: alertsList});
    }, 6000);
  }

  componentDidMount() {
    if (this.state.userPermissions === "unknown") {
      this.fetchUserPermissions(this.state.user);
    }
  };

  render() {
    return (
      <>
      <div className="position-fixed bottom-0 end-0 p-3" style={{zIndex:11}}>
      {
          this.state.alerts.map(item => (
              <div key={item.uid} className="toast show m-1" role="alert" aria-live="assertive" aria-atomic="true">
                  <div className={`toast-body text-${item.result}`}>
                      <i className={`bi-${(item.result === "danger") ? "x" : "info"}-circle-fill me-2`}></i>{item.message}
                  </div>
              </div>
          ))
      }
      </div>
      <Router>
          <MurdockNavBar user={this.state.user} userPermissions={this.state.userPermissions} onLoginSuccess={this.onLoginSuccess} onLoginFailure={this.onLoginFailure} onLogout={this.onLogout} />
          <Suspense fallback={<div className="container"><LoadingSpinner /></div>}>
              <Switch>
                  <Route exact path="/" render={() => <JobList user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/branch/:branch" render={() => <JobBranch user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/branch/:branch/:tab" render={() => <JobBranch user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/tag/:tag" render={() => <JobTag user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/tag/:tag/:tab" render={() => <JobTag user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/commit/:commit" render={() => <JobCommit user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/commit/:commit/:tab" render={() => <JobCommit user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/pr/:prnum" render={() => <JobPr user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/pr/:prnum/:tab" render={() => <JobPr user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/:uid" render={() => <JobUid user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/:uid/:tab" render={() => <JobUid user={this.state.user} userPermissions={this.state.userPermissions} notify={this.notify} />} />
                  <Route exact path="/details/:uid/builds/:application" render={() => <ApplicationResults type="builds" />} />
                  <Route exact path="/details/:uid/tests/:application" render={() => <ApplicationResults type="tests" />} />
              </Switch>
          </Suspense>
      </Router>
      </>
    )
  }
};

export default Murdock;
