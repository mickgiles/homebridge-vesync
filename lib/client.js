let moment = require('moment');
const HyperRequest = require('hyper-request');
const crypto = require('crypto');

module.exports = class EtekCityClient {

    constructor(log) {
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
            if (response == null || response.tk == null) {
                this.log("Login to Vesync failed! Please check your username and password")
            } else {
                //this.log(response);
                this.token = response.tk;
                this.uniqueId = response.accountID;
                this.lastLogin = moment();
            }
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
            var supportedDevices = ['wifi-switch-1.3', 'ESW01-USA', 'ESW03-USA', 'ESW01-EU', 'ESW15-USA', 'ESO15-TB'];

            let devices = response.result.list.filter((dev) => {
                return true; //supportedDevices.includes(dev.deviceType); 
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
