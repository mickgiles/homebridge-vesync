let moment = require('moment');
const HyperRequest = require('./hrequest');
const crypto = require('crypto');

module.exports = class EtekCityClient {

    constructor(log, exclude) {
        this.client = new HyperRequest({
            baseUrl: 'https://smartapi.vesync.com',
            enablePipe : false,
            respondWithProperty: false,
            failWhenBadCode : false,
            parserFunction: function (data) {
                try {
                    return JSON.parse(data.replace(/\\/g, '').replace('"[', '[').replace(']"', ']'));
                } catch (e) {
                    log(data);
                    return null;
                }
            }
        });
        this.log = log;
        this.exclude = exclude;
        this.lastLogin = moment('2000-01-01');
        this.traceId = Math.random();
        this.terminalId = crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    login(username, password) {
        // If token has been set in last 24 hours, don't log in again
        if (this.lastLogin.isAfter(moment().subtract(24, 'hours'))) {
            return Promise.resolve();
        }
        let md5passwd = crypto.createHash('md5').update(password).digest('hex');

        return this.client.post('/user/api/accountManage/v3/appLoginV3', {
            headers: {
                accept: '*/*',
                'content-type': 'application/json',
                'user-agent': 'VeSync/5.0.50 (com.etekcity.vesyncPlatform; build:16; iOS 16.7.2) Alamofire/5.2.1'
            },
            body: {
                data: {
                    userType: 1,
                    email: username,
                    password: md5passwd,
                },
                context: {
                    token: '.',
                    terminalId: this.terminalId,
                    osInfo: 'iOS16.7.2',
                    clientInfo: 'ioBroker',
                    traceId: '',
                    accountID: '.',
                    clientType: 'vesyncApp',
                    userCountryCode: 'US',
                    method: 'appLoginV3',
                    clientVersion: 'VeSync 5.0.50 build16',
                    acceptLanguage: 'en',
                    timeZone: 'America/Chicago',
                    debugMode: false,
                  }
            }
        }).then((response) => {
            if (response == null || response.result == null || response.result.token == null) {
                this.log("Login to Vesync failed! Please check your username and password");
            } else {
                //this.log(response);
                this.token = response.result.token;
                this.uniqueId = response.result.accountID;
                this.lastLogin = moment();
            }
        });
    }

    getDevices() {
        return this.client.post('/cloud/v2/deviceManaged/devices', {
            headers: {
                'content-type': 'application/json',
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
            if (response == null || response.result == null) {
                this.log("Connecting to Vesync failed!");
                return null;
            } else {
                let devices = response.result.list.filter((dev) => {
                    return !this.exclude.includes(dev.deviceType); 
                }).map((device) => {
                    let id = device.cid;
                    if (device.subDeviceNo) {
                        id = device.cid + device.subDeviceNo;
                    }
                    return {
                        id: id,
                        name: device.deviceName,
                        type: device.deviceType,
                        status: device.deviceStatus,
                        uuid: device.uuid,
                        subDeviceNo: device.subDeviceNo
                    };
                });
                return devices;
            }
        });
    }

    turnDevice(device, on_off) {
        let uri = '/10a/v1/device/devicestatus';
        if (device.type == 'wifi-switch-1.3') {
            uri = '/v1/wifi-switch-1.3/' + device.id + '/status/' + on_off;
        } else if (device.type == 'ESO15-TB') {
            uri = uri = '/outdoorsocket15a/v1/device/devicestatus';
        } else if (device.type == 'ESW15-USA') {
            uri = uri = '/15a/v1/device/devicestatus';
        } else if (device.type == 'LV-PUR131S') {
            uri = uri = '/131airPurifier/v1/device/deviceStatus';
        } else if (device.type == 'ESWD16') {
            uri = uri = '/dimmer/v1/device/devicestatus';
        } else if (device.type == 'ESWL01' || device.type == 'ESWL03') {
            uri = uri = '/inwallswitch/v1/device/devicestatus';
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
                'uuid': device.uuid,
                'switchNo': device.subDeviceNo
            }
        }).then((response) => {
            //this.log(response);
            return response;
        });
    }
};
