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
            jobsQueued: [],
            jobsBuilding: [],
            jobsFinished: [],
            jobsFinishedDisplayedLimit: itemsDisplayedStep,
        };
        this.fetchJobs = this.fetchJobs.bind(this);
        this.handleWsData = this.handleWsData.bind(this);
        this.handleWsOpen = this.handleWsOpen.bind(this);
        this.handleWsClose = this.handleWsClose.bind(this);
        this.displayMore = this.displayMore.bind(this);
    }

    fetchJobs(limit) {
        axios.get(`${murdockHttpBaseUrl}/api/jobs?limit=${limit}`)
            .then(res => {
                const jobs = res.data;
                const queued = (jobs.queued) ? jobs.queued : [];
                const building = (jobs.building) ? jobs.building : [];
                const finished = (jobs.finished) ? jobs.finished : [];
                const newState = { 
                    isFetched : true,
                    jobsQueued: queued,
                    jobsBuilding: building,
                    jobsFinished: finished,
                    jobsFinishedDisplayedLimit: (limit !== this.state.jobsFinishedDisplayedLimit) ? limit : this.state.jobsFinishedDisplayedLimit
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
            this.fetchJobs(this.state.jobsFinishedDisplayedLimit);
        }
        else if (msg.cmd === "status" && this.state.isFetched) {
            if (this.state.jobsBuilding.length) {
                let jobs = this.state.jobsBuilding.slice();
                for (let idx = 0; idx < jobs.length; idx++) {
                    if (jobs[idx].prinfo.commit === msg.commit) {
                        jobs[idx].status = msg.status;
                    }
                }
                this.setState({jobsBuilding: jobs});
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
        this.fetchJobs(this.state.jobsFinished.length + itemsDisplayedStep);
    }

    componentDidMount() {
        document.title = "Murdock - Pull Requests";
        if (!this.state.isFetched) {
            this.fetchJobs(this.state.jobsFinishedDisplayedLimit);
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
                        {this.state.jobsQueued.map(job => <PullRequestCard key={job.uid} job_type="queued" job={job} user={this.state.user} permissions={this.state.userPermissions}/>)}
                        {this.state.jobsBuilding.map(job => <PullRequestCard key={job.uid} job_type="building" job={job} user={this.state.user} permissions={this.state.userPermissions}/>)}
                        {this.state.jobsFinished.map(job => <PullRequestCard key={job.uid} job_type="finished" job={job} user={this.state.user} permissions={this.state.userPermissions}/>)}
                        </>
                    ) : <LoadingSpinner />
                    }
                    {(this.state.jobsFinished.length && this.state.jobsFinished.length === this.state.jobsFinishedDisplayedLimit) ? <ShowMore onclick={this.displayMore} /> : null}
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
