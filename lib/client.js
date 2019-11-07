let moment = require('moment');
const HyperRequest = require('hyper-request');
const crypto = require('crypto');

module.exports = class EtekCityClient {

    constructor(log) {
        this.client = new HyperRequest({
            baseUrl: 'https://smartapi.vesync.com',
            disablePipe: true,
            respondWithProperty: false,
            parserFunction: function (data) {
                return JSON.parse(data.replace(/\\/g, '').replace('"[', '[').replace(']"', ']'));
            }
        });
        this.log = log;
        this.lastLogin = moment('2000-01-01');
        this.traceId = Math.random();
    }

    login(username, password) {
        // If token has been set in last 24 hours, don't log in again
        if (this.lastLogin.isAfter(moment().subtract(24, 'hours'))) {
            return Promise.resolve();
        }
        let md5passwd = crypto.createHash('md5').update(password).digest('hex');

        return this.client.post('/vold/user/login', {
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                'accountID': '',
                'account': username,
                'password': md5passwd,
                'timeZone': 'America/Chicago',
                'token': ''
            }
        }).then((response) => {
            //this.log(response);
            this.token = response.tk;
            this.uniqueId = response.accountID;
            this.lastLogin = moment();
        });
    }

    getDevices() {
        return this.client.post('/cloud/v2/deviceManaged/devices', {
            headers: {
                tk: this.token,
                accountid: this.uniqueId,
                'content-type': 'application/json',
                'tz': 'America/Chicago',
                'user-agent': 'HomeBridge-Vesync'
            },
            body: {
                'acceptLanguage': 'en',
                'accountID': this.uniqueId,
                'appVersion': '1.1',
                'method': 'devices',
                'pageNo': 1,
                'pageSize': 1000,
                'phoneBrand': 'HomeBridge-Vesync',
                'phoneOS': 'HomeBridge-Vesync',
                'timeZone': 'America/Chicago',
                'token': this.token,
                'traceId': this.traceId,
            }
        }).then((response) => {
            //this.log(response);
            let devices = response.result.list.map((device) => {
                return {
                    id: device.cid,
                    name: device.deviceName,
                    type: device.deviceType,
                    status: device.deviceStatus,
                    uuid: device.uuid
                };
            });
            return devices;
        });
    }

    turnDevice(device, on_off) {
        let uri = '/10a/v1/device/devicestatus';
        if (device.type == 'wifi-switch-1.3') {
            uri = '/v1/wifi-switch-1.3/' + device.id + '/status/' + on_off;
        }

        return this.client.put(uri, {
            headers: {
                tk: this.token,
                accountid: this.uniqueId,
                'content-type': 'application/json',
                'tz': 'America/Chicago',
                'user-agent': 'HomeBridge-Vesync'
            },
            body: {
                'accountID': this.uniqueId,
                'timeZone': 'America/Chicago',
                'token': this.token,
                'status': on_off,
                'uuid': device.uuid
            }
        }).then((response) => {
            //this.log(response);
            return response;
        });
    }
};