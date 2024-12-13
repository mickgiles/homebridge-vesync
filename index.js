"use strict";

const { SUPPORTED_FANS, SUPPORTED_AIR_PURIFIERS, SUPPORTED_HUMIDIFIERS, SUPPORTED_LIGHT_BULBS } = require('./constants.js');

let EtekcityClient = require('./lib/client');
let Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-vesync-v2", "VesyncPlug", VeseyncPlugPlatform);
};

class VeseyncPlugPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.accessories = {};  // Keep as object for current version
        this.cache_timeout = 10; // seconds
        this.debug = config['debug'] || false;
        this.username = config['username'];
        this.password = config['password'];
        this.exclude = config['exclude']?.split(',') || [];

        if (api) {
            this.api = api;
            this.api.on('didFinishLaunching', () => {
                this.deviceDiscovery();
                setInterval(() => this.deviceDiscovery(), this.cache_timeout * 6000);
            });
        }

        this.client = new EtekcityClient(log, this.exclude);
    }

    configureAccessory(accessory) {
        const accessoryId = accessory.context.id;
        if (this.debug) this.log("Configuring accessory: " + accessoryId);

        // Handle rename case
        if (this.accessories[accessoryId]) {
            this.log("Duplicate accessory detected, removing existing one");
            try {
                this.removeAccessory(this.accessories[accessoryId]);
                this.setService(accessory);
            } catch (error) {
                this.removeAccessory(accessory);
                accessory = this.accessories[accessoryId];
            }
        } else {
            this.setService(accessory);
        }

        this.accessories[accessoryId] = accessory;
    }

    removeAccessory(accessory, accessoryId = undefined) {
        if (!accessory) return;

        const id = accessoryId ?? accessory.context?.id;
        if (this.debug) this.log("Removing accessory: " + id);

        try {
            this.api.unregisterPlatformAccessories("homebridge-vesync-v2", "VesyncPlug", [accessory]);
        } catch (error) {
            this.log("Error removing accessory: " + error);
        }

        if (id) {
            delete this.accessories[id];
        }
    }

    addAccessory(data) {
        if (!this.accessories[data.id]) {
            const uuid = UUIDGen.generate(data.id);
            const newAccessory = new Accessory(data.name, uuid);

            newAccessory.context = {
                name: data.name,
                id: data.id,
                type: data.type  // Add type to context for service identification
            };

            // Add appropriate service based on device type
            if (this.isDeviceType(data.type, 'fan')) {
                newAccessory.addService(Service.Fan, data.name);
            } else if (this.isDeviceType(data.type, 'airPurifier')) {
                newAccessory.addService(Service.AirPurifier, data.name);
            } else if (this.isDeviceType(data.type, 'humidifier')) {
                newAccessory.addService(Service.HumidifierDehumidifier, data.name);
            } else if (this.isDeviceType(data.type, 'lightbulb')) {
                newAccessory.addService(Service.Lightbulb, data.name);
            } else {
                // Default to outlet for all other devices (smart plugs, power strips)
                newAccessory.addService(Service.Outlet, data.name);
            }

            this.setService(newAccessory);
            this.api.registerPlatformAccessories("homebridge-vesync-v2", "VesyncPlug", [newAccessory]);
        }

        const accessory = this.accessories[data.id];
        this.getInitState(accessory, data);
        this.accessories[data.id] = accessory;
    }

    isDeviceType(deviceType, category) {
        const deviceCategories = {
            fan: SUPPORTED_FANS,
            airPurifier: SUPPORTED_AIR_PURIFIERS,
            humidifier: SUPPORTED_HUMIDIFIERS,
            lightbulb: SUPPORTED_LIGHT_BULBS
        };

        return deviceCategories[category]?.some(type => 
            type === deviceType || deviceType?.startsWith(type)
        ) || false;
    }

    deviceDiscovery() {
        let me = this;
        if (me.debug) me.log("DeviceDiscovery invoked");

        this.client.login(this.username, this.password).then(() => {
            return this.client.getDevices();
        }).then(devices => {
            if (me.debug) me.log("Adding discovered devices");
            console.log(devices)
            for (let i in devices) {
                let existing = me.accessories[devices[i].id];

                if (!existing) {
                    me.log("Adding device: ", devices[i].id, devices[i].name);
                    me.addAccessory(devices[i]);
                } else {
                    if (me.debug) me.log("Skipping existing device", i);
                }
            }

            if (devices) {
                for (let index in me.accessories) {
                    var acc = me.accessories[index];
                    var found = devices.find((device) => {
                        return device.id == index;
                    });
                    if (!found) {
                        me.log("Previously configured accessory not found, removing", index);
                        me.removeAccessory(me.accessories[index]);
                    } else if (found.name != acc.context.name) {
                        me.log("Accessory name does not match device name, got " + found.name + " expected " + acc.context.name);
                        me.removeAccessory(me.accessories[index]);
                        me.addAccessory(found);
                        me.log("Accessory removed & readded!");
                    }
                }
            }

            if (me.debug) me.log("Discovery complete");
        }).catch((err) => {
            me.log("ERROR: " + err);
        });
    }

    setService(accessory) {
        let service;
        
        // Get the appropriate service based on device type
        if (this.isDeviceType(accessory.context.type, 'fan')) {
            service = accessory.getService(Service.Fan);
        } else if (this.isDeviceType(accessory.context.type, 'airPurifier')) {
            service = accessory.getService(Service.AirPurifier);
        } else if (this.isDeviceType(accessory.context.type, 'humidifier')) {
            service = accessory.getService(Service.HumidifierDehumidifier);
        } else if (this.isDeviceType(accessory.context.type, 'lightbulb')) {
            service = accessory.getService(Service.Lightbulb);
        } else {
            service = accessory.getService(Service.Outlet);
        }

        if (!service) {
            this.log("Could not find service for accessory", accessory.displayName);
            return;
        }

        // Set up power control characteristic for all devices
        service
            .getCharacteristic(Characteristic.On)
            .on('get', (callback) => {
                this.getPowerState(accessory.context, callback);
            })
            .on('set', (value, callback) => {
                this.setPowerState(accessory.context, value, callback);
            });

        // Additional characteristics could be added here for specific device types
    }

    getInitState(accessory, data) {
        let info = accessory.getService(Service.AccessoryInformation);

        accessory.context.manufacturer = "Etekcity";
        info.setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer);

        accessory.context.model = "ESW01-USA";
        info.setCharacteristic(Characteristic.Model, accessory.context.model);

        info.setCharacteristic(Characteristic.SerialNumber, accessory.context.id);

        accessory.getService(Service.Outlet)
            .getCharacteristic(Characteristic.On)
            .getValue();
    }

    setPowerState(thisPlug, powerState, callback) {
        let that = this;
        if (this.debug) this.log("Sending device status change");

        return this.client.login(this.username, this.password).then(() => {
            return this.client.getDevices();
        }).then(devices => {
            return devices.find((device) => {
                return device.name.includes(thisPlug.name);
            });
        }).then((device) => {
            thisPlug.status = device.status;
            if (device.status == 'on' && powerState == false) {
                return this.client.turnDevice(device, "off");
            }

            if ((device.status == 'off' || !device.status) && powerState == true) {
                return this.client.turnDevice(device, "on");
            }
        }).then(() => {
            callback();
        }).catch((err) => {
            if (err == 'Error: No Content') {
                callback();
                return;
            }
            this.log(err);
            this.log("Failed to set power state to", powerState);
            callback(err);
        });
    }

    getPowerState(thisPlug, callback) {
        if (this.accessories[thisPlug.id]) {
            return this.client.login(this.username, this.password).then(() => {
                return this.client.getDevices();
            }).then(devices => {
                return devices.find((device) => {
                    return device.name.includes(thisPlug.name);
                });
            }).then((device) => {
                if (typeof device === 'undefined') {
                    if (this.debug) this.log("Removing undefined device", thisPlug.name);
                    this.removeAccessory(thisPlug)
                } else {
                    thisPlug.status = device.status;
                    if (this.debug) this.log("getPowerState complete");
                    callback(null, device.status == 'on');
                }
            });
        } else {
            callback(new Error("Device not found"));
        }
    }

    identify(thisPlug, paired, callback) {
        this.log("Identify requested for " + thisPlug.name);
        callback();
    }
}
