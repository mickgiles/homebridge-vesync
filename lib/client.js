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

    async login(username, password) {
        try {
            // If token is still valid, skip login
            if (this.lastLogin.isAfter(moment().subtract(24, 'hours'))) {
                return Promise.resolve();
            }

            const md5passwd = crypto.createHash('md5').update(password).digest('hex');
            const response = await this.client.post('/user/api/accountManage/v3/appLoginV3', {
                headers: {
                    accept: '*/*',
                    'content-type': 'application/json',
                    'user-agent': 'VeSync/5.0.50 (iOS 16.7.2)'
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
                        clientInfo: 'Homebridge',
                        traceId: this.traceId,
                        accountID: '.',
                        clientType: 'vesyncApp',
                        userCountryCode: 'US',
                        method: 'appLoginV3',
                        clientVersion: 'VeSync 5.0.50',
                        acceptLanguage: 'en',
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        debugMode: false,
                    }
                }
            });

            if (!response?.result?.token) {
                throw new Error("Login failed: Invalid credentials");
            }

            this.token = response.result.token;
            this.uniqueId = response.result.accountID;
            this.lastLogin = moment();

        } catch (error) {
            this.log(`Login error: ${error.message}`);
            throw error;
        }
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
        let body = {
            'accountID': this.uniqueId,
            'timeZone': 'America/Chicago',
            'token': this.token,
            'status': on_off,
            'uuid': device.uuid,
            'switchNo': device.subDeviceNo
        };
        
        // Humidifiers
        if (device.type === 'Classic300S' || device.type === 'Classic200S' || 
            device.type === 'Dual200S' || device.type === 'OasisMist500S' ||
            device.type === 'LUH-D301S-WUS' || device.type === 'LV600S' ||
            device.type === 'Dual100S' || device.type === 'LUH-A601S-WUSR') {
            uri = '/cloud/v2/deviceManaged/bypassV2';
            body = {
                'accountID': this.uniqueId,
                'timeZone': 'America/Chicago',
                'token': this.token,
                'uuid': device.uuid,
                'deviceType': device.type,
                'method': 'bypassV2',
                'data': {
                    'enabled': on_off === 'on',
                    'id': 0,
                    'type': 'power'
                }
            };
        }
        // Air Purifiers
        else if (device.type === 'LV-PUR131S' || device.type === 'Core200S' || 
            device.type === 'Core300S' || device.type === 'Core400S' ||
            device.type === 'Core600S' || device.type === 'Core100S' ||
            device.type === 'LAP-C201S-AUSR' || device.type === 'LAP-C202S-WUSR' ||
            device.type === 'Vital100S' || device.type === 'Vital200S') {
            uri = '/131airPurifier/v1/device/deviceStatus';
        }
        // Smart Plugs
        else if (device.type === 'wifi-switch-1.3') {
            uri = '/v1/wifi-switch-1.3/' + device.id + '/status/' + on_off;
        }
        else if (device.type === 'ESO15-TB') {
            uri = '/outdoorsocket15a/v1/device/devicestatus';
        }
        else if (device.type === 'ESW15-USA' || device.type === 'ESW15-EU') {
            uri = '/15a/v1/device/devicestatus';
        }
        else if (device.type === 'ESW03-USA' || device.type === 'ESW03-EU' ||
                 device.type === 'ESW01-EU') {
            uri = '/10a/v1/device/devicestatus';
        }
        else if (device.type === 'BSD29' || device.type === 'BSD33' ||
                 device.type === 'BSD37') {
            uri = '/smartplug/v1/device/devicestatus';
        }
        // Wall Switches
        else if (device.type === 'ESWD16') {
            uri = '/dimmer/v1/device/devicestatus';
        }
        else if (device.type === 'ESWL01' || device.type === 'ESWL03' ||
                 device.type === 'WS02') {
            uri = '/inwallswitch/v1/device/devicestatus';
        }
        // Power Strips
        else if (device.type === 'WiFiPowerStrip' || device.type === 'ESW03-04') {
            uri = '/powerstrip/v1/device/devicestatus';
        }
        // Smart Light Bulbs
        else if (device.type.startsWith('ESL100') || 
                 device.type === 'ESL100CW' || device.type === 'ESL100MC') {
            uri = '/smartlight/v1/device/devicestatus';
        }

        return this.client.put(uri, {
            headers: {
                tk: this.token,
                accountid: this.uniqueId,
                'content-type': 'application/json',
                'tz': 'America/Chicago',
                'user-agent': 'HomeBridge-Vesync'
            },
            body: body
        }).then((response) => {
            //this.log(response);
            return response;
        });
    }
};
