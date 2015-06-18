/*****************************************************************************
 * Open MCT Web, Copyright (c) 2014-2015, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT Web is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT Web includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
/*global define*/

define(
    [],
    function () {
        "use strict";

        /**
         * A telemetry handle acts as a helper in issuing requests for
         * new telemetry as well as subscribing to real-time updates
         * for the same telemetry series. This is exposed through the
         * `telemetryHandler` service.
         * @param $q Angular's $q, for promises
         * @param {TelemetrySubscription} subscription a subscription
         *        to supplied telemetry
         */
        function TelemetryHandle($q, subscription) {
            var seriesMap = {},
                self = Object.create(subscription);

            // Request a telemetry series for this specific object
            function requestSeries(telemetryObject, request, callback) {
                var id = telemetryObject.getId(),
                    telemetry = telemetryObject.getCapability('telemetry');

                function receiveSeries(series) {
                    // Store it for subsequent lookup
                    seriesMap[id] = series;
                    // Notify callback of new series data, if there is one
                    if (callback) {
                        callback(telemetryObject, series);
                    }
                    // Pass it along for promise-chaining
                    return series;
                }

                // Issue the request via the object's telemetry capability
                return telemetry.requestData(request).then(receiveSeries);
            }


            /**
             * Get the most recently obtained telemetry data series associated
             * with this domain object.
             * @param {DomainObject} the domain object which has telemetry
             *        data associated with it
             * @return {TelemetrySeries} the most recent telemetry series
             *         (or undefined if there is not one)
             */
            self.getSeries = function (domainObject) {
                var id = domainObject.getId();
                return seriesMap[id];
            };


            /**
             * Change the request duration.
             * @param {object|number} request the duration of historical
             *        data to look at; or, the request to issue
             * @param {Function} [callback] a callback that will be
             *        invoked as new data becomes available, with the
             *        domain object for which new data is available.
             */
            self.request = function (request, callback) {
                // Issue (and handle) the new request from this object
                function issueRequest(telemetryObject) {
                    return requestSeries(telemetryObject, request, callback);
                }

                // Map the request to all telemetry objects
                function issueRequests(telemetryObjects) {
                    return $q.all(telemetryObjects.map(issueRequest));
                }

                // If the request is a simple number, treat it as a duration
                request = (typeof request === 'number') ?
                        { duration: request } : request;

                // Look up telemetry-providing objects from the subscription,
                // then issue new requests.
                return subscription.promiseTelemetryObjects()
                    .then(issueRequests);
            };

            return self;
        }

        return TelemetryHandle;

    }
);