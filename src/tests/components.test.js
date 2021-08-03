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

import moment from 'moment'
import { fireEvent, render, screen } from '@testing-library/react'
import { CommitCol, DateCol, LinkCol, LoadingSpinner, RuntimeCol, ShowMore, UserCol } from '../components'

test('loading spinner', async () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeDefined();
})

test('show more button', async () => {
    render(<div><ShowMore onclick={() => {document.getElementById("test").innerHTML = "clicked"}} /><div id="test">test</div></div>);
    expect(screen.getByText('Show more')).toBeDefined();
    expect(screen.getByText('test')).toBeDefined();
    fireEvent.click(screen.getByText('Show more'))
    expect(screen.getByText('clicked')).toBeDefined();
})

test('link column', async () => {
    render(<LinkCol color="danger" url="http://localhost/test" title="test" />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-danger" &&
            element.href === "http://localhost/test" &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "test"
        )
      })).toBeDefined();
})

test('commit column', async () => {
    render(<CommitCol color="success" commit="123456789abcdef" />);
    expect(screen.getByText((content, element) => {
        return (
            element.className === "link-underline-hover text-success" &&
            element.href === `https://github.com/${process.env.REACT_APP_GITHUB_REPO}/commit/123456789abcdef` &&
            element.target === "_blank" &&
            element.rel === "noreferrer noopener" &&
            content === "1234567"
        )
      })).toBeDefined();
})

test('date column', async () => {
    const date = new Date(123456000);
    render(<DateCol date={date} />);
    expect(screen.getByText(`${date.toLocaleString()} (${moment(date).fromNow()})`)).toBeDefined();
})

test('runtime column', async () => {
    render(<RuntimeCol runtime="42.3" />);
    expect(screen.getByText("42.3")).toBeDefined();
})

test('user column', async () => {
    render(<UserCol user="toto" />);
    expect(screen.getByText("toto")).toBeDefined();
})
