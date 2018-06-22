define(['./module'], function (services) {
    'use strict';
    services.factory('Dashboard', ['Request',
        function (Request) {
            return {
                getDashboardPosts: function (paging, cbSuccess, cbFail) {
                    if (paging && parseInt(paging) == null)
                        return cbFail(400, 'Failed to fetch dashboard information.');

                    return Request.get('portal/dashboard',
                         function (message) {
                            return cbSuccess(message.data);
                        }, function (status, message) {
                            return cbFail(status, message);
                        });
                },
            };
        }]);
});
