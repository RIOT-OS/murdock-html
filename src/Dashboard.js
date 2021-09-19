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

import { DashboardCard } from './DashboardCard';
import { LoadingSpinner, ShowMore } from './components';
import { itemsDisplayedStep, murdockHttpBaseUrl, murdockWsUrl } from './constants';

class Dashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            alerts: [],
            isFetched: false,
            jobsQueued: [],
            jobsRunning: [],
            jobsFinished: [],
            jobsFinishedDisplayedLimit: itemsDisplayedStep,
            jobType: "pr",
            prNumber: "",
            commitSha: "",
            commitAuthor: "",
        };
        this.fetchJobs = this.fetchJobs.bind(this);
        this.handleWsData = this.handleWsData.bind(this);
        this.handleWsOpen = this.handleWsOpen.bind(this);
        this.handleWsClose = this.handleWsClose.bind(this);
        this.displayMore = this.displayMore.bind(this);
        this.notify = this.notify.bind(this);
        this.search = this.search.bind(this);
        this.isPRClicked = this.isPRClicked.bind(this);
        this.isBranchClicked = this.isBranchClicked.bind(this);
        this.isTagClicked = this.isTagClicked.bind(this);
        this.prNumberChanged = this.prNumberChanged.bind(this);
        this.commitShaChanged = this.commitShaChanged.bind(this);
        this.commitAuthorChanged = this.commitAuthorChanged.bind(this);
        this.keyUp = this.keyUp.bind(this);
    }

    fetchJobs(jobType, limit) {
        let queryString = `limit=${limit}`;
        if (jobType === "pr") {
            queryString = `${queryString}&is_pr=true`
        }
        if (jobType === "branch") {
            queryString = `${queryString}&is_branch=true`
        }
        if (jobType === "tag") {
            queryString = `${queryString}&is_tag=true`
        }
        if (this.state.prNumber) {
            queryString = `${queryString}&prnum=${this.state.prNumber}`
        }
        if (this.state.commitSha) {
            queryString = `${queryString}&sha=${this.state.commitSha}`
        }
        if (this.state.commitAuthor) {
            queryString = `${queryString}&author=${this.state.commitAuthor}`
        }
        axios.get(`${murdockHttpBaseUrl}/jobs?${queryString}`)
            .then(res => {
                const jobs = res.data;
                const queued = (jobs.queued) ? jobs.queued : [];
                const running = (jobs.running) ? jobs.running : [];
                const finished = (jobs.finished) ? jobs.finished : [];
                const newState = { 
                    isFetched : true,
                    jobsQueued: queued,
                    jobsRunning: running,
                    jobsFinished: finished,
                    jobsFinishedDisplayedLimit: limit,
                    jobType: jobType,
                }
                this.setState(newState);
            })
            .catch(error => {
                console.log(error);
                this.setState({ isFetched : true });
            });
    }

    handleWsData(data) {
        const msg = JSON.parse(data);
        if (msg.cmd === "reload") {
            this.fetchJobs(this.state.jobType, this.state.jobsFinishedDisplayedLimit);
        }
        else if (msg.cmd === "status" && this.state.isFetched) {
            if (this.state.jobsRunning.length) {
                let jobs = this.state.jobsRunning.slice();
                for (let idx = 0; idx < jobs.length; idx++) {
                    if (jobs[idx].uid === msg.uid) {
                        jobs[idx].status = msg.status;
                    }
                }
                this.setState({jobsRunning: jobs});
            }
        }
        else if (msg.cmd === "output" && this.state.isFetched) {
            if (this.state.jobsRunning.length) {
                let jobs = this.state.jobsRunning.slice();
                for (let idx = 0; idx < jobs.length; idx++) {
                    if (jobs[idx].uid === msg.uid) {
                        jobs[idx].output += msg.line;
                    }
                }
                this.setState({jobsRunning: jobs});
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
        this.fetchJobs(this.state.jobType, this.state.jobsFinished.length + itemsDisplayedStep);
    }

    componentDidMount() {
        document.title = "Murdock - Dashboard";
        if (!this.state.isFetched) {
            this.fetchJobs(this.state.jobType, this.state.jobsFinishedDisplayedLimit);
        }
    }

    notify(uid, result, message) {
        const alertsList = this.state.alerts.slice();
        alertsList.push({uid: uid, result: result, message: message})
        this.setState({alerts: alertsList.reverse()});
        setTimeout(() => {
            const alertsList = this.state.alerts.filter(item => item.uid !== uid);
            this.setState({alerts: alertsList});
        }, 6000);
    }

    isPRClicked() {
        this.setState({isFetched: false});
        this.fetchJobs("pr", this.state.jobsFinishedDisplayedLimit);
    }

    isBranchClicked() {
        this.setState({isFetched: false});
        this.fetchJobs("branch", this.state.jobsFinishedDisplayedLimit);
    }

    isTagClicked() {
        this.setState({isFetched: false});
        this.fetchJobs("tag", this.state.jobsFinishedDisplayedLimit);
    }

    prNumberChanged(event) {
        this.setState({prNumber: event.target.value});
    }

    commitShaChanged(event) {
        this.setState({commitSha: event.target.value});
    }

    commitAuthorChanged(event) {
        this.setState({commitAuthor: event.target.value});
    }

    keyUp(event) {
        if (event.key === 'Enter') {
            this.search();
        }
    }

    search() {
        this.setState({isFetched: false});
        this.fetchJobs(this.state.jobType, this.state.jobsFinishedDisplayedLimit);
    }

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
                <div className="container">
                    {(this.state.isFetched) ? (
                        <>
                        <div className="btn-toolbar justify-content-center m-1" role="toolbar">
                            <div className="btn-group me-1" role="group">
                                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkPRs" onClick={this.isPRClicked} defaultChecked={this.state.jobType === "pr"} />
                                <label className="btn btn-outline-primary" htmlFor="checkPRs">PRs</label>
                                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkBranches" onClick={this.isBranchClicked} defaultChecked={this.state.jobType === "branch"} />
                                <label className="btn btn-outline-primary" htmlFor="checkBranches">Branches</label>
                                <input type="radio" name="jobTypeRadio" className="btn-check" id="checkTags" onClick={this.isTagClicked} defaultChecked={this.state.jobType === "tag"} />
                                <label className="btn btn-outline-primary" htmlFor="checkTags">Tags</label>
                            </div>
                            <div className="input-group me-1">
                                <div className="input-group-text" id="inputSearchPR">PR #</div>
                                <input type="text" className="form-control" placeholder="PR number" aria-label="PR number" aria-describedby="inputSearchPR" value={this.state.prNumber} onChange={this.prNumberChanged} onKeyUp={this.keyUp} />
                            </div>
                            <div className="input-group me-1">
                                <div className="input-group-text" id="inputSearchCommit"><i className="bi-tag"></i></div>
                                <input type="text" className="form-control" placeholder="Commit SHA" aria-label="Commit SHA" aria-describedby="inputSearchCommit" value={this.state.commitSha} onChange={this.commitShaChanged} onKeyUp={this.keyUp} />
                            </div>
                            <div className="input-group me-1">
                                <div className="input-group-text" id="inputSearchAuthor"><i className="bi-person"></i></div>
                                <input type="text" className="form-control" placeholder="Commit author" aria-label="Commit author" aria-describedby="inputSearchAuthor" value={this.state.commitAuthor} onChange={this.commitAuthorChanged} onKeyUp={this.keyUp} />
                            </div>
                        </div>
                        {this.state.jobsQueued.map(job => <DashboardCard key={job.uid} job_type="queued" job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
                        {this.state.jobsRunning.map(job => <DashboardCard key={job.uid} job_type="running" job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
                        {this.state.jobsFinished.map(job => <DashboardCard key={job.uid} job_type="finished" job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
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
            </>
        );
    }
}

export default Dashboard;
