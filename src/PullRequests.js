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
import { itemsDisplayedStep, prApiUrl, wsUrl } from './constants';
import { prNumberFromUrl } from './utils';

class PullRequests extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isFetched: false,
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

    fetchPullRequests() {
        axios.get(prApiUrl)
            .then(res => {
                const pulls = res.data;
                const queued = (pulls.queued) ? pulls.queued.sort((a, b) => b.since - a.since) : [];
                const building = (pulls.building) ? pulls.building.sort((a, b) => b.since - a.since) : [];
                const finished = (pulls.finished) ? pulls.finished.sort((a, b) => b.since - a.since) : [];
                const newState = { 
                    isFetched : true,
                    prsQueued: queued,
                    prsBuilding: building,
                    prsFinished: finished,
                }
                this.setState(newState);
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    handleWsData(data) {
        const msg = JSON.parse(data);
        if (msg.cmd === "reload_prs") {
            this.fetchPullRequests();
        }
        else if (msg.cmd === "prstatus" && this.state.isFetched) {
            if (this.state.prsBuilding.length) {
                let pulls = this.state.prsBuilding.slice();
                for (let idx = 0; idx < pulls.length; idx++) {
                    let prNum = prNumberFromUrl(pulls[idx].url);
                    if (prNum === msg.prnum) {
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
        this.setState({prsFinishedDisplayedLimit: this.state.prsFinishedDisplayedLimit + itemsDisplayedStep});
    }

    componentDidMount() {
        document.title = "Murdock - Pull Requests";
        if (!this.state.isFetched) {
            this.fetchPullRequests();
        }
    }

    render() {
        return (
            <div>
                <div className="container">
                    {(this.state.isFetched) ? (
                        <>
                        {this.state.prsQueued.map((pr, index) => <PullRequestCard key={`queued_pr_${prNumberFromUrl(pr.url)}_${index}`} pr_type="queued" pr={pr} />)}
                        {this.state.prsBuilding.map(pr => <PullRequestCard key={`building_pr_${prNumberFromUrl(pr.url)}`} pr_type="building" pr={pr} />)}
                        {this.state.prsFinished.slice(0, this.state.prsFinishedDisplayedLimit).map((pr, index) => <PullRequestCard key={`finished_pr_${prNumberFromUrl(pr.url)}_${index}`} pr_type="finished" pr={pr} />)}
                        </>
                    ) : <LoadingSpinner />
                    }
                    {(this.state.prsFinished.length && this.state.prsFinished.length > itemsDisplayedStep) ? <ShowMore onclick={this.displayMore} /> : null}
                </div>
                <Websocket
                    url={wsUrl}
                    onOpen={this.handleWsOpen}
                    onMessage={this.handleWsData}
                    onClose={this.handleWsClose}
                />
            </div>
        );
    }
}

export default PullRequests;
