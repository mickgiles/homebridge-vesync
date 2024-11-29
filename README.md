# homebridge-vesync
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[Homebridge](https://github.com/nfarina/homebridge) platform plugin for VeSync smart devices.

This plugin uses the existing VeSync app infrastructure to allow you to control your VeSync devices.

Provide your username and password and register as a platform, and it will auto-detect the devices you have registered.

# Supported Devices & Features

## Smart Plugs
- ESW15-USA (15A WiFi Smart Plug)
  - Power On/Off
  - Power state monitoring
- ESW15-EU (15A WiFi Smart Plug - European)
  - Power On/Off
  - Power state monitoring
- ESW03-USA (10A WiFi Smart Plug)
  - Power On/Off
  - Power state monitoring
- ESW03-EU (10A WiFi Smart Plug - European)
  - Power On/Off
  - Power state monitoring
- ESO15-TB (Outdoor Smart Plug)
  - Power On/Off
  - Power state monitoring
- wifi-switch-1.3 (Legacy WiFi Smart Plug)
  - Power On/Off
  - Power state monitoring

## Air Purifiers
All air purifier models support basic power control (On/Off) only:
- LV-PUR131S
- Core100S
- Core200S
- Core300S
- Core400S
- Core600S

*Note: Additional features like fan speed, air quality monitoring, and modes are available in the VeSync app but not currently supported in this plugin.*

## Humidifiers
All humidifier models support basic power control (On/Off) only:
- Classic300S
- Classic200S
- Dual200S
- OasisMist500S
- LUH-D301S-WUS

*Note: Additional features like humidity level, mist level, auto mode, and timer settings are available in the VeSync app but not currently supported in this plugin.*

## Wall Switches
- ESWD16 (Dimmer Switch)
  - Power On/Off
  - *Dimming functionality available in app only*
- ESWL01 (In-Wall Switch)
  - Power On/Off
- ESWL03 (In-Wall Switch)
  - Power On/Off

## Power Strips
- WiFiPowerStrip
  - Power On/Off for each outlet
  - Status monitoring for each outlet

## Smart Light Bulbs
- ESL100 series
  - Power On/Off
  - *Color and brightness controls available in app only*

# Feature Support Notes
1. Power Usage Monitoring: Available in the VeSync app but not synced to HomeKit
2. Schedules and Timers: Must be configured through the VeSync app
3. Device Settings: Must be configured through the VeSync app
4. Advanced Features: Features like humidity levels, fan speeds, and light colors must be controlled through the VeSync app

# Known Limitations
1. This plugin currently focuses on basic power control (On/Off) functionality
2. Advanced device features are not exposed to HomeKit
3. Some device-specific features may require the VeSync app for configuration
4. Power consumption data is only available in the VeSync app

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-vesync-v2`
3. Update your configuration file. See below for a sample.

# Configuration

Configuration sample:

```json
"platforms": [
    {
        "platform": "VesyncPlug",
        "name": "VesyncPlug",
        "username": "***",
        "password": "***"
    }
]
```

## Optional parameters

- `debug`: Enable more logging information from the plugin
  ```json
  "debug": "True"
  ```

- `exclude`: Comma-separated list of device types to exclude
  ```json
  "exclude": "Classic300S,Core300S"
  ```

# Homebridge Compatibility

- Supports Homebridge 1.0 and later
- Ready for Homebridge 2.0 (upcoming)
  - Uses modern JavaScript features
  - Improved error handling
  - Better device type support
  - Enhanced stability and performance

# Power Usage Data

Power usage data is not synced over, but is still available in the VeSync app.

# Credits

- AlakhaiVaynard - Initial Code
- KaidenR - Bug Fix, Issue #1
- rossmckelvie - Code Improvements, Bug Fix Issue #3
- Danimal4326 / NorthernMan54 - Used [homebridge-ecoplug](https://github.com/NorthernMan54/homebridge-ecoplug) as template
- dirwin517 / keatontaylor - Used [etekcity-smartplug](https://github.com/arupex/etekcity-smartplug) as template
- micktron - Updated api to version 2, added support for ESO15-TB
- dotfortun3-code - Change accessory name to vesync name when creating
