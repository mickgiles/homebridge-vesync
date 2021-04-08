module.exports = class MeterFactory {

    /**
     * @param meterEndCallback - callback that gets hit on each meter end()
     * @param maxMeters - max number of points a meter can collect before it throws away FIFO
     */
    constructor(meterEndCallback, maxMeters) {

        this.meterEndCallback = meterEndCallback;

        this.MAX_METERS = maxMeters || 10000;

        this.savedMetricData = {};
    }

    meter(name) {
        let start = process.hrtime();
        let executed = false;
        return {
            end: () => {
                if(!executed) {
                    executed = true;
                    let end = process.hrtime(start);
                    this.calcMeter({
                        name: name,
                        start: start * 1e-6,
                        end: ((end[0] * 1e9 + end[1])) * 1e-6
                    });
                }
            }
        };
    }

    calcMeter(meter) {
        let atMeter = this.savedMetricData[meter.name];

        if (!atMeter) {
            atMeter = {
                min: 100000000,
                max: -100000000,
                datum: [],
                count: 0
            };
        }
        else if (atMeter.datum && atMeter.datum.length > this.MAX_METERS) {
            atMeter.datum.shift();
        }

        atMeter.datum.push(meter.end);

        this.savedMetricData[meter.name] = {
            min: (atMeter.min > meter.end) ? meter.end : atMeter.min,
            max: (atMeter.max < meter.end) ? meter.end : atMeter.max,
            count: ++atMeter.count,
            datum: atMeter.datum,
            stats: atMeter.stats
        };

        if (typeof this.meterEndCallback === 'function') {
            this.meterEndCallback({
                name: meter.name,
                diff: meter.end,
                min: this.savedMetricData[meter.name].min,
                max: this.savedMetricData[meter.name].max
            });
        }
        return meter.end;
    }

    getMeters() {
        return this.savedMetricData;
    }
};
