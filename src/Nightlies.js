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
import axios from 'axios';

import { cardColor, cardIcon, linkColor, textColor, itemsDisplayedStep, nightliesRootUrl } from './constants';
import { LoadingSpinner, CommitCol, DateCol, ShowMore } from './components';

const NightlyJob = (props) => {
    const dateSince = new Date(props.job.creation_time * 1000);
    const date = new Date(props.job.creation_time * 1000).toLocaleDateString(
        navigator.language,
        {weekday: "short", year: "numeric", month: "short", day: "numeric"}
    );
    const type = props.job.result;
    const resultUrl = `https://ci.riot-os.org/${process.env.REACT_APP_GITHUB_REPO}/${props.branch}/${props.job.commit}/output.html`;

    return (
        <div>
            <div className={`card m-2 border-${cardColor[type]}`}>
                <div className={`card-header text-${textColor[type]} bg-${cardColor[type]}`}>
                    <span className="me-1">{cardIcon[type]}</span>
                    <span className="m-1">
                        <a className="link-light link-underline-hover" href={resultUrl} target="_blank" rel="noreferrer noopener">
                        {date} ({props.job.commit.substring(0, 7)})
                        </a>
                    </span>
                </div>
                <div className="card-body">
                    <div className="row">
                        <CommitCol color={`${linkColor[type]}`} commit={props.job.commit} />
                        <DateCol date={dateSince} />
                    </div>
                </div>
            </div>
        </div>
    );
}

const BranchMenuItem = (props) => {
    return (
        <li className="nav-item m-1">
            <button className="btn btn-primary" aria-current="page" onClick={props.onclick}>
                {props.branch}
            </button>
        </li>
    )
}

class Nightlies extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fetched: false,
            currentIndex: 0,
            nightlies: [{"branch": "master", "jobs": []}],
            jobsDisplayedLimit: itemsDisplayedStep,
        };
        this.fetchNightlies = this.fetchNightlies.bind(this);
        this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
        this.displayMore = this.displayMore.bind(this);
    }

    fetchNightlies(index) {
        const nightliesUrl = `${nightliesRootUrl}/${this.state.nightlies[index].branch}/nightlies.json`;
        axios.get(nightliesUrl).then(res => {
            let nightliesCloned = this.state.nightlies.slice();
            nightliesCloned[index].jobs = res.data;
            this.setState({
                fetched: true,
                currentIndex: index,
                nightlies: nightliesCloned,
            })
        })
        .catch(function (error) {
            console.log(error);
        });
    }

    handleMenuItemClick(index) {
        if (index !== this.state.currentIndex) {
            if (!this.state.nightlies[index].jobs.length) {
                this.fetchNightlies(index);
            }
            else {
                this.setState({currentIndex: index})
            }
        }
    }

    displayMore() {
        this.setState({jobsDisplayedLimit: this.state.jobsDisplayedLimit + itemsDisplayedStep})
    }

    componentDidMount() {
        document.title = "Murdock - Nightlies"
        this.fetchNightlies(0);
    }

    render() {
        return (
            <>
                <div className="container">
                {(this.state.fetched) ? (
                    <ul className="nav nav-pills">
                        {this.state.nightlies.map((nightliesItem, index) => <BranchMenuItem key={`menu_${nightliesItem.branch}_${index}`} branch={nightliesItem.branch} onclick={this.handleMenuItemClick(index)} />)}
                    </ul>
                ) : null}
                {(this.state.fetched) ? (
                    this.state.nightlies[this.state.currentIndex].jobs.slice(0, this.state.jobsDisplayedLimit).map((job, index) => <NightlyJob key={`job_${index}`} job={job} branch={this.state.nightlies[this.state.currentIndex].branch} />)
                ) : (
                    <LoadingSpinner />
                )}
                {(this.state.nightlies[this.state.currentIndex].jobs.length && this.state.nightlies[this.state.currentIndex].jobs.length > itemsDisplayedStep) ? <ShowMore onclick={this.displayMore} /> : null}
                </div>
            </>
        );
    }
}

export default Nightlies;
