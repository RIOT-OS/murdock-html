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

class PullRequests extends Component {
    constructor(props) {
        super(props);
        this.state = {
            alerts: [],
            isFetched: false,
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
        this.notify = this.notify.bind(this);
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
    }

    notify(uid, result, message) {
        const alertsList = this.state.alerts.slice();
        alertsList.push({uid: uid, result: result, message: message})
        this.setState({alerts: alertsList.reverse()});
        setTimeout(() => {
            const alertsList = this.state.alerts.filter(item => item.uid !== uid);
            this.setState({alerts: alertsList});
        }, 4000);
    }

    render() {
        return (
            <div>
                <div className="position-fixed bottom-0 end-0" style={{zIndex:1000}}>
                    {this.state.alerts.map(item => <div key={item.uid} className={`alert alert-${item.result} alert-dismissible shadow fade show me-2`} role="alert">{item.message}</div>)}
                </div>
                <div className="container">
                    {(this.state.isFetched) ? (
                        <>
                        {this.state.jobsQueued.map(job => <PullRequestCard key={job.uid} job_type="queued" job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
                        {this.state.jobsBuilding.map(job => <PullRequestCard key={job.uid} job_type="building" job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
                        {this.state.jobsFinished.map(job => <PullRequestCard key={job.uid} job_type="finished" job={job} user={this.props.user} permissions={this.props.userPermissions} notify={this.notify}/>)}
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
