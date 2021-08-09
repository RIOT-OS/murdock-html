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

import { Component } from 'react';
import Websocket from 'react-websocket';
import axios from 'axios';

import { PullRequestCard } from './PullRequestCard';
import { LoadingSpinner, ShowMore } from './components';
import { itemsDisplayedStep, murdockHttpBaseUrl, murdockWsUrl } from './constants';
import { defaultLoginUser, getUserFromStorage } from './userStorage';

class PullRequests extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isFetched: false,
            userPermissions: "unknown",
            user: defaultLoginUser,
            prsQueued: [],
            prsBuilding: [],
            prsFinished: [],
            prsFinishedDisplayedLimit: itemsDisplayedStep,
        };
        this.fetchPullRequests = this.fetchPullRequests.bind(this);
        this.handleWsData = this.handleWsData.bind(this);
        this.handleWsOpen = this.handleWsOpen.bind(this);
        this.handleWsClose = this.handleWsClose.bind(this);
        this.displayMore = this.displayMore.bind(this);
    }

    fetchPullRequests(limit) {
        axios.get(`${murdockHttpBaseUrl}/api/jobs?limit=${limit}`)
            .then(res => {
                const pulls = res.data;
                const queued = (pulls.queued) ? pulls.queued : [];
                const building = (pulls.building) ? pulls.building : [];
                const finished = (pulls.finished) ? pulls.finished : [];
                const newState = { 
                    isFetched : true,
                    prsQueued: queued,
                    prsBuilding: building,
                    prsFinished: finished,
                    prsFinishedDisplayedLimit: (limit !== this.state.prsFinishedDisplayedLimit) ? limit : this.state.prsFinishedDisplayedLimit
                }
                this.setState(newState);
            })
            .catch(error => {
                console.log(error);
                this.setState({ isFetched : true });
            });
    }

    getUserPermissions() {
        const user = getUserFromStorage();

        if (user.login === "anonymous") {
            this.setState({
                user: defaultLoginUser, userPermissions: "no",
            });
            return;
        }

        axios.get(
            `https://api.github.com/repos/${process.env.REACT_APP_GITHUB_REPO}`,
            { headers: {Authorization: `token ${user.token}`}},
        )
        .then(res => {
            if (res.data.permissions && res.data.permissions.push) {
                this.setState({
                    user: user, userPermissions: "push",
                });
            } else {
                this.setState({
                    user: user, userPermissions: "no",
                });
            }
        })
        .catch(error => {
            console.log(error);
            this.setState({
                user: defaultLoginUser, userPermissions: "no",
            });
        });
    };

    handleWsData(data) {
        const msg = JSON.parse(data);
        if (msg.cmd === "reload") {
            this.fetchPullRequests(this.state.prsFinishedDisplayedLimit);
        }
        else if (msg.cmd === "status" && this.state.isFetched) {
            if (this.state.prsBuilding.length) {
                let pulls = this.state.prsBuilding.slice();
                for (let idx = 0; idx < pulls.length; idx++) {
                    if (pulls[idx].commit === msg.commit) {
                        pulls[idx].status = msg.status;
                    }
                }
                this.setState({prsBuilding: pulls});
            }
        }
    }

    handleWsOpen() {
        console.log("Websocket opened");
    }

    handleWsClose() {
        console.log("Websocket closed");
    }

    displayMore() {
        this.fetchPullRequests(this.state.prsFinished.length + itemsDisplayedStep);
    }

    componentDidMount() {
        document.title = "Murdock - Pull Requests";
        if (!this.state.isFetched) {
            this.fetchPullRequests(this.state.prsFinishedDisplayedLimit);
        }
        if (this.state.userPermissions === "unknown") {
            this.getUserPermissions();
        }
    }

    render() {
        return (
            <div>
                <div className="container">
                    {(this.state.isFetched) ? (
                        <>
                        {this.state.prsQueued.map(pr => <PullRequestCard key={`queued_pr_${pr.prnum}_${pr.commit}`} pr_type="queued" pr={pr} user={this.state.user} permissions={this.state.userPermissions}/>)}
                        {this.state.prsBuilding.map(pr => <PullRequestCard key={`building_pr_${pr.prnum}_${pr.commit}`} pr_type="building" pr={pr} user={this.state.user} permissions={this.state.userPermissions}/>)}
                        {this.state.prsFinished.map(pr => <PullRequestCard key={`finished_pr_${pr.id}`} pr_type="finished" pr={pr} user={this.state.user} permissions={this.state.userPermissions}/>)}
                        </>
                    ) : <LoadingSpinner />
                    }
                    {(this.state.prsFinished.length && this.state.prsFinished.length === this.state.prsFinishedDisplayedLimit) ? <ShowMore onclick={this.displayMore} /> : null}
                </div>
                <Websocket
                    url={murdockWsUrl}
                    onOpen={this.handleWsOpen}
                    onMessage={this.handleWsData}
                    onClose={this.handleWsClose}
                />
            </div>
        );
    }
}

export default PullRequests;
