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

export const nightliesRootUrl = process.env.REACT_APP_NIGHTLIES_ROOT_URL;
export const murdockHttpBaseUrl = process.env.REACT_APP_MURDOCK_HTTP_BASE_URL;
export const murdockWsUrl = process.env.REACT_APP_MURDOCK_WS_URL;

export const itemsDisplayedStep = parseInt(process.env.REACT_APP_ITEM_DISPLAYED_STEP);

export const cardColor = {
    "errored": "danger",
    "passed": "success",
    "queued": "info",
    "running": "warning",
    "stopped": "secondary",
};

export const cardIcon = {
    "errored": (<i className="bi-x-circle-fill me-2"></i>),
    "passed": (<i className="bi-check-circle-fill me-2"></i>),
    "queued": (<i className="bi-inbox me-2"></i>),
    "running": (<span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>),
    "stopped": (<i className="bi-dash-circle-fill me-2"></i>),
};

export const jobColor = {
    "errored": "danger",
    "passed": "success",
    "queued": "dark",
    "running": "dark",
    "stopped": "secondary",
};

export const linkColor = {
    "errored": "danger",
    "passed": "success",
    "queued": "primary",
    "running": "primary",
    "stopped": "secondary",
};

export const textColor = {
    "errored": "light",
    "passed": "light",
    "queued": "dark",
    "running": "dark",
    "stopped": "light",
};

export const stateBadge = {
    "errored": (<span className="badge text-light bg-danger">Failed</span>),
    "passed": (<span className="badge text-light bg-success">Success</span>),
    "queued": (<span className="badge text-dark bg-info">Queued</span>),
    "running": (<span className="badge text-dark bg-warning">Running</span>),
    "stopped": (<span className="badge text-light bg-secondary">Stopped</span>),
};
