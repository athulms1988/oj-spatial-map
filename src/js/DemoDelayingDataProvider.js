define(["require", "exports"], function (require, exports) {
    "use strict";
    const wrapPromise = (promise, delay) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                promise.then((result) => {
                    resolve(result);
                }, (reason) => {
                    reject(reason);
                });
            }, delay);
        });
    };
    const wrapFetchWithSignal = (baseDP, functionName, delay, params, signal) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                baseDP[functionName](params, signal).then((result) => {
                    resolve(result);
                }, (reason) => {
                    reject(reason);
                });
            }, delay);
        });
    };
    const wrapFetchFirst = (asyncIterator, delay, signal) => {
        return new Promise((resolve, reject) => {
            // track if this has been aborted during delay to avoid resolving or rejecting multiple times
            var aborted = false;
            setTimeout(() => {
                if (!aborted) {
                    asyncIterator.next().then((result) => {
                        if (!aborted) {
                            resolve(result);
                        }
                    }, (reason) => {
                        if (!aborted) {
                            reject(reason);
                        }
                    });
                }
            }, delay);
            if (signal) {
                signal.onabort = () => {
                    aborted = true;
                    reject(new DOMException(signal.reason, 'AbortError'));
                };
            }
        });
    };
    class WrappingAsyncIterator {
        constructor(asyncIterator, delay, signal) {
            this.next = () => {
                if (this._signal && this._signal.aborted) {
                    return Promise.reject(new DOMException(this._signal.reason, 'AbortError'));
                }
                return wrapFetchFirst(this._asyncIterator, this._delay, this._signal);
            };
            this._asyncIterator = asyncIterator;
            this._delay = delay;
            this._signal = signal;
        }
    }
    class DemoDelayingDataProvider {
        constructor(dataProvider, delay, delays) {
            this.fetchFirst = (params) => {
                const signal = params ? params.signal : undefined;
                const asyncIterable = this._dataProvider.fetchFirst(params);
                const asyncIterator = asyncIterable[Symbol.asyncIterator]();
                const fetchFirstDelay = this._delays?.fetchFirst;
                const delay = fetchFirstDelay ? fetchFirstDelay : this._delay;
                const wrappingAsyncIterator = new WrappingAsyncIterator(asyncIterator, delay, signal);
                asyncIterable[Symbol.asyncIterator] = () => {
                    return wrappingAsyncIterator;
                };
                return asyncIterable;
            };
            this.containsKeys = (params) => {
                return wrapPromise(this._dataProvider.containsKeys(params), this._delay);
            };
            this.fetchByKeys = (params) => {
                const signal = params ? params.signal : undefined;
                if (signal) {
                    if (signal.aborted) {
                        return Promise.reject(new DOMException(signal.reason, 'AbortError'));
                    }
                    return wrapFetchWithSignal(this._dataProvider, 'fetchByKeys', this._delay, params, signal);
                }
                return wrapPromise(this._dataProvider.fetchByKeys(params), this._delay);
            };
            this.fetchByOffset = (params) => {
                const signal = params ? params.signal : undefined;
                if (signal) {
                    if (signal.aborted) {
                        return Promise.reject(new DOMException(signal.reason, 'AbortError'));
                    }
                    return wrapFetchWithSignal(this._dataProvider, 'fetchByOffset', this._delay, params, signal);
                }
                return wrapPromise(this._dataProvider.fetchByOffset(params), this._delay);
            };
            this.getTotalSize = () => {
                return this._dataProvider.getTotalSize();
            };
            this.isEmpty = () => {
                return this._dataProvider.isEmpty();
            };
            this.addEventListener = (eventType, listener) => {
                return this._dataProvider.addEventListener(eventType, listener);
            };
            this.removeEventListener = (eventType, listener) => {
                return this._dataProvider.removeEventListener(eventType, listener);
            };
            this.dispatchEvent = (evt) => {
                return this._dataProvider.dispatchEvent(evt);
            };
            this.getCapability = (capabilityName) => {
                return this._dataProvider.getCapability(capabilityName);
            };
            this._dataProvider = dataProvider;
            this._delay = !delay && delay !== 0 ? 300 : delay;
            this._delays = delays;
            // define these methods only when the underlying DP supports them
            if (typeof this._dataProvider.createOptimizedKeyMap === 'function') {
                this.createOptimizedKeyMap = (initialMap) => this._dataProvider.createOptimizedKeyMap(initialMap);
            }
            if (typeof this._dataProvider.createOptimizedKeySet === 'function') {
                this.createOptimizedKeySet = (initialSet) => this._dataProvider.createOptimizedKeySet(initialSet);
            }
        }
    }
    return DemoDelayingDataProvider;
});
