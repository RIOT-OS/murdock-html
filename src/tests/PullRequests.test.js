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

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { fireEvent, render, screen, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import WS from 'jest-websocket-mock';

import PullRequests from '../PullRequests';

const server = setupServer(
    rest.get('/api/jobs', (req, res, ctx) => {
        const limit = req.url.searchParams.get('limit')
        let finished = [
            {
                "id": "123",
                "output_url": "https://ci.riot-os.org/RIOT-OS/RIOT/16620/951822c41b34cf62ed29ab58ed1e34cbbcd3894b/output.html",
                "result": "passed",
                "runtime": 2392.292683839798,
                "status": {},
                "prinfo": {
                    "title": "drivers/sx126x: fix netdev send and recv function [backport 2021.07]",
                    "user": "MrKevinWeiss",
                    "number": "16620",
                    "url": "https://github.com/RIOT-OS/RIOT/pull/16620",
                    "commit": "951822c41b34cf62ed29ab58ed1e34cbbcd3894b",
                },
                "since": 1625648719.7717128
            },
            {
                "id": "1234",
                "output_url": "https://ci.riot-os.org/RIOT-OS/RIOT/15030/1dc94b981680ab30351df64b3f5a2c1e6e8cc9b0/output.html",
                "result": "errored",
                "runtime": 2488.577573299408,
                "status": {
                    "failed_jobs": [
                        {
                            "name": "compile/tests/driver_sx127x/samr21-xpro:gnu",
                            "href": "https://ci.riot-os.org/RIOT-OS/RIOT/15030/1dc94b981680ab30351df64b3f5a2c1e6e8cc9b0/output/compile/tests/driver_sx127x/samr21-xpro:gnu.txt"
                        }
                    ]
                },
                "prinfo": {
                    "title": "drivers/sx127x: remove ZTIMER_USEC dependency",
                    "user": "jia200x",
                    "number": "15030",
                    "url": "https://github.com/RIOT-OS/RIOT/pull/15030",
                    "commit": "1dc94b981680ab30351df64b3f5a2c1e6e8cc9b0",
                },
                "since": 1625238690.1669567
            },
        ]
        return res(ctx.json(
            {
                "building": [
                    {
                        "prinfo": {
                            "title": "netdev/lora: fix size of NETOPT_RX_SYMBOL_TIMEOUT [backport 2021.07]",
                            "user": "MrKevinWeiss",
                            "number": "16621",
                            "url": "https://github.com/RIOT-OS/RIOT/pull/16621",
                            "commit": "5ef4c0a778ab7d4f625d63fdafe5e8347bfe479d",
                        },
                        "since": 1625648720.3770814
                    }
                ],
                "queued": [
                    {
                        "prinfo": {
                            "title": "gnrc_lorawan: fix gnrc_pktbuf_release_error (introduced by #16080) [backport 2021.07",
                            "user": "jia200x",
                            "number": "16622",
                            "url": "https://github.com/RIOT-OS/RIOT/pull/16622",
                            "commit": "13274da74ab861830ed4f1216aceccf50548b27d",
                        },
                        "since": 1625646859.5628495
                    }
                ],
                "finished": finished.slice(0, limit)
            }
        ));
    })
)

const wsServer = new WS("ws://localhost:1234/ws/status");

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('fetch and display pull requests', async () => {
    await waitFor(() => render(<PullRequests />));
    await waitFor(() => screen.queryByText((content, element) => {
        return element.className === "card m-2 border-info";
    }));
    expect(screen.getByText((content, element) => {
        return element.className === "card m-2 border-warning";
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return element.className === "card m-2 border-info";
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return element.className === "card m-2 border-success";
    })).toBeDefined();
    expect(screen.queryByText((content, element) => {
        return element.className === "card m-2 border-danger";
    })).toBeNull();

    expect(screen.getByText('Show more')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Show more'));
    await waitFor(() => screen.getByText((content, element) => {
        return element.className === "card m-2 border-danger";
    }));

    await waitFor(() => wsServer.send('{"cmd": "reload"}'));
    await waitFor(() => screen.queryByText((content, element) => {
        return element.className === "card m-2 border-info";
    }));
    expect(screen.getByText((content, element) => {
        return element.className === "card m-2 border-warning";
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return element.className === "card m-2 border-info";
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return element.className === "card m-2 border-success";
    })).toBeDefined();
    expect(screen.getByText((content, element) => {
        return element.className === "card m-2 border-danger";
    })).toBeDefined();

    // send pr_status command via websocket
    await waitFor(() => wsServer.send('{"cmd" : "status", "commit" : "5ef4c0a778ab7d4f625d63fdafe5e8347bfe479d", "status" : {"status": "working"}}'));
    expect(screen.getByText("working")).toBeDefined();

    // smoke test to trigger the websocket client on close callback function
    await waitFor(() => wsServer.close());
})
