/*

 MIT License

 Copyright (c) 2020 Looker Data Sciences, Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */

import {
  AuthSession,
  AuthToken,
  IAccessToken,
  IApiSettings,
  IRequestProps,
  ITransport,
  sdkError,
} from '@looker/sdk-rtl/lib/browser'
import { ExtensionSDK } from '@looker/extension-sdk'
import { defaultScopes } from '@looker/wholly-sheet'

export class GAuthToken extends AuthToken {
  constructor(access_token?: string, expiry_date?: Date) {
    let token = {} as IAccessToken
    if (access_token && expiry_date) {
      const expSeconds = expiry_date.getSeconds() - new Date().getSeconds()
      token = {
        access_token,
        token_type: 'Bearer',
        expires_in: expSeconds,
      }
    }
    super(token)
  }
}

// TODO make this an extension parameter
const ACCESS_SERVER_URL = 'http://localhost:8081'

export class GAuthSession extends AuthSession {
  activeToken = new GAuthToken()
  sudoId = ''

  protected constructor(
    protected readonly extensionSDK: ExtensionSDK,
    public settings: IApiSettings,
    public transport: ITransport
  ) {
    super(settings, transport)
  }

  async authenticate(props: IRequestProps) {
    const token = await this.getToken()
    if (token && token.access_token) {
      props.headers.Authorization = `Bearer ${token.access_token}`
    }
    return props
  }

  async getToken() {
    if (!this.isAuthenticated()) {
      await this.login()
    }
    return this.activeToken
  }

  isAuthenticated(): boolean {
    return this.activeToken.isActive()
  }

  async login(_sudoId?: string | number) {
    const requestBody = {
      client_id: this.extensionSDK.createSecretKeyTag('looker_client_id'),
      client_secret: this.extensionSDK.createSecretKeyTag(
        'looker_client_secret'
      ),
      scope: defaultScopes.join(' '),
    }
    try {
      const response = await this.extensionSDK.serverProxy(
        `${ACCESS_SERVER_URL}/access_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )
      const { access_token, expiry_date } = response.body
      this.activeToken = new GAuthToken(access_token, expiry_date)
    } catch (error) {
      throw sdkError({ message: error.message })
    }
  }

  reset() {
    this.sudoId = ''
    this.activeToken.reset()
  }
}