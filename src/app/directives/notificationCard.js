define(['./module'], directives => {
    directives.directive("notificationCard", [() => ({
        restrict: 'E',
        replace: false,

        scope: {
            type: "@",
            onDismiss: "&",
            canDismiss: "@"
        },

        transclude: true,
        template: require("compile-ejs-loader!views/_portal/directives/_notificationCard.ejs")(),

        link($scope, element, attrs) {
            $scope.dismissed = false;
            if ($scope.type.toLowerCase() === "error") {
                $scope.typeTheme = "md-warn";
            }
            else if ($scope.type.toLowerCase() === "info") {
                $scope.typeTheme = "md-primary";
            }
            else if ($scope.type.toLowerCase() === "warn") {
                $scope.typeTheme = "md-secondary";
            }

            $scope.dismissNotification = () => {
                $scope.dismissed = true;
                $scope.onDismiss();
            };

        }
    })]);
});