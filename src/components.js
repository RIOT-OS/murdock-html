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

import moment from 'moment';

export const LoadingSpinner = () => {
    return (
        <div className="row my-5 justify-content-center">
            <div className="col col-md-3">
                <button className="btn btn-secondary mx-auto" style={{ width: "100%" }} type="button" disabled>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span className="m-2">Loading...</span>
                </button>
            </div>
        </div>
    );
};

export const ShowMore = (props) => {
    return (
        <div className="row justify-content-center">
            <div className="col col-md-2">
                <button type="button" className="btn btn-secondary my-2" style={{ width: "100%" }} onClick={props.onclick}>Show more</button>
            </div>
        </div>
    );
};

export const UserCol = (props) => {
    return (
        <div className="col col-sm-2">
            <i className="bi-person me-1"></i>{props.user}
        </div>
    );
};

export const LinkCol = (props) => {
    return (
        <div className="col col-sm-2">
            <i className="bi-link-45deg me-1"></i>
            <a className={`link-underline-hover text-${props.color}`} href={props.url} target="_blank" rel="noreferrer noopener">{props.title}</a>
        </div>
    );
};

export const CommitCol = (props) => {
    return (
        <div className="col col-sm-2">
            <i className="bi-tag me-1"></i>
            <a className={`link-underline-hover text-${props.color}`} href={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/${props.commit}`} target="_blank" rel="noreferrer noopener">{props.commit.substring(0, 7)}</a>
        </div>
    );
};

export const DateCol = (props) => {
    return (
        <div className="col col-sm-3" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${moment(props.date).fromNow()}`}>
            <i className="bi-calendar2 me-1"></i>
            {`${props.date.toLocaleString()}`}
        </div>
    );
};

export const RuntimeCol = (props) => {
    return (
        <div className="col col-sm-2">
            <i className="bi-clock me-1"></i>{props.runtime}
        </div>
    );
};

export const GithubCol = (props) => {
    return (
        <div className="col col-sm-2">
            <i className="bi-github me-1"></i>
            <a className={`link-underline-hover text-${props.color}`} href={props.url} target="_blank" rel="noreferrer noopener">{props.title}</a>
        </div>
    );
};

export const CommitWithAuthorCol = (props) => {
    return (
        <div className="col col-sm-5">
            <i className="bi-tag me-1"></i>
            <a className={`link-underline-hover text-${props.color} me-1`} href={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/${props.commit}`} target="_blank" rel="noreferrer noopener">{props.commit.substring(0, 7)}</a>
            (<i className="bi-person me-1"></i>{props.author})
        </div>
    );
};

export const DateShortElem = (props) => {
    return (
        <span className="align-middle" data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${moment(props.date).fromNow()}`}>
            <i className="bi-calendar2 me-1"></i>{props.date.toLocaleString()}
        </span>
    );
};

export const DateElem = (props) => {
    return (
        <div data-bs-toggle="tooltip" data-bs-placement="bottom" title={`${moment(props.date).fromNow()}`}>
            <i className="bi-calendar2 me-1"></i>
            {`${props.date.toLocaleString()} (${moment(props.date).fromNow()})`}
        </div>
    );
};

export const DateCompleteCol = (props) => {
    return (
        <div className="col col-sm-4" >
            <DateElem date={props.date} />
        </div>
    );
};
