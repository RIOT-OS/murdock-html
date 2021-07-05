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

import { useState, useEffect } from 'react';
import Websocket from 'react-websocket';
import axios from 'axios';

import { PullRequestCard } from './PullRequestCard';
import { LoadingSpinner, ShowMore } from './components';
import { itemsDisplayedStep } from './constants';
import { prNumberFromUrl } from './utils';

const PullRequests = () => {
    const [pullRequestsFetched, setPullRequestsFetched] = useState(false);
    const [pullRequestsQueued, setPullRequestsQueued] = useState([]);
    const [pullRequestBuilding, setPullRequestBuilding] = useState([]);
    const [pullRequestsFinished, setPullRequestsFinished] = useState([]);
    const [pullRequestsFinishedDisplayedLimit, setPullRequestsFinishedDisplayedLimit] = useState(itemsDisplayedStep);

    const fetchPullRequests = () => {
        axios.get(process.env.REACT_APP_MURDOCK_PR_API_URL)
            .then(res => {
                const pulls = res.data;
                (pulls.queued) ? 
                    setPullRequestsQueued(pulls.queued.sort((a, b) => b.since - a.since)) :
                    setPullRequestsQueued([]);
                (pulls.building) ?
                    setPullRequestBuilding(pulls.building.sort((a, b) => b.since - a.since)) :
                    setPullRequestBuilding([]);
                (pulls.finished) ?
                    setPullRequestsFinished(pulls.finished.sort((a, b) => b.since - a.since)) :
                    setPullRequestsFinished([]);
            })
            .catch(function (error) {
                console.log(error);
            });
        setPullRequestsFetched(true);
    }

    const handleWsData = (data) => {
        const msg = JSON.parse(data);
        if (msg.cmd === "reload_prs") {
            fetchPullRequests();
        }
        else if (msg.cmd === "prstatus" && pullRequestsFetched) {
            if (pullRequestBuilding.length) {
                let prBuilding = pullRequestBuilding.slice();
                prBuilding[0].status = msg.status;
                setPullRequestBuilding(prBuilding);
            }
        }
    }

    const handleWsOpen = () => {
        console.debug("Websocket opened");
        fetchPullRequests();
    }

    const handleWsClose = () => {
        console.debug("Websocket closed");
    }

    const displayMore = () => {
        let prFinishedDisplayedLimit = pullRequestsFinishedDisplayedLimit;
        setPullRequestsFinishedDisplayedLimit(prFinishedDisplayedLimit + itemsDisplayedStep);
    }

    useEffect(() => {
        document.title = "Murdock - Pull Requests"
    });

    const prList = (
        <div>
        {pullRequestsQueued.map(pr => <PullRequestCard key={`pr_${prNumberFromUrl(pr.url)}`} pr_type="queued" pr={pr} />)}
        {pullRequestBuilding.map(pr => <PullRequestCard key={`pr_${prNumberFromUrl(pr.url)}`} pr_type="building" pr={pr} />)}
        {pullRequestsFinished.slice(0, pullRequestsFinishedDisplayedLimit).map(pr => <PullRequestCard key={`pr_${prNumberFromUrl(pr.url)}`} pr_type="finished" pr={pr} />)}
        </div>
    );

    return (
        <div>
            <div className="container">
                {(pullRequestsFetched) ? (
                    <div>
                    {prList}
                    </div>
                ) : (
                    <LoadingSpinner />
                )
                }
                {(pullRequestsFinished.length && pullRequestsFinished.length > itemsDisplayedStep) ? <ShowMore onclick={displayMore} /> : null}
            </div>
            <Websocket
                url={process.env.REACT_APP_MURDOCK_WS_URL}
                onOpen={handleWsOpen}
                onMessage={handleWsData}
                onClose={handleWsClose}
            />
        </div>
    );
}

export default PullRequests;
