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

export const defaultLoginUser = {
    login: 'anonymous',
    avatarUrl: '',
    token: '',
    expiresAt: '',
};

export const getUserFromStorage = () => {
    if (!localStorage.getItem('userLogin')) {
        return defaultLoginUser;
    }

    const expiresAt = localStorage.getItem('userExpiresAt');
    if (expiresAt !== Infinity) {
        const expirationDate = new Date(expiresAt);
        if (expirationDate < Date.now()) {
            return defaultLoginUser;
        }
    }

    return {
        login: localStorage.getItem('userLogin'),
        avatarUrl: localStorage.getItem('userAvatarUrl'),
        token: localStorage.getItem('userToken'),
        expiresAt: localStorage.getItem('userExpiresAt'),
    }
};

export const storeUserToStorage = (user) => {
    localStorage.setItem('userLogin', user.login);
    localStorage.setItem('userAvatarUrl', user.avatarUrl);
    localStorage.setItem('userToken', user.token);
    localStorage.setItem('userExpiresAt', user.expiresAt);
};

export const removeUserFromStorage = () => {
    localStorage.removeItem('userLogin');
    localStorage.removeItem('userAvatarUrl');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userExpiresAt');
};
