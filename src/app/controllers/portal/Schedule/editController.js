define(['../../module', '../../../enums/platforms'], function (controllers, platforms) {
    'use strict';
    return controllers.controller('editController', ['$scope', '$stateParams', '$state',
        'SocialPosts', 'Alert', 'SocialAccounts', '$filter', 'Image', 'Action', 'SocialStacks',
        function ($scope, $stateParams, $state, SocialPosts, Alert, SocialAccounts, $filter, Image, Action, SocialStacks) {
            $scope.postId = $stateParams.postId;
            $scope.attachedImage = $stateParams.attachedImage;
            $scope.postInformation = $stateParams.postInformation;
            $scope.hashtag_lookups = 0;
            $scope.currentTime = new Date();
            $scope.pending = false;


            setTimeout(function () {
                $scope.hashtag_lookups = $scope.permissions_used.hashtag_lookups;
            }, 0);
            $scope.currentSocialPost = {
                pages: [],
                stacks: [],
                content: '',
                images: [],
                date: $scope.currentTime,
                maxLength: 280//Limit for Twitter. We wil adjust dynamically
            };
            $scope.platforms = platforms;
            // console.log($scope.currentSocialPost)


            $scope.validateTime = function (date, type) {
                // disable all Sundays in the Month View
                return date > $scope.currentTime;
            };

            $scope.choosePage = function (page_id) {
                $scope.currentSocialPost.pages = $scope.currentSocialPost.pages || [];
                if ($scope.currentSocialPost.pages.indexOf(page_id) != -1)
                    $scope.currentSocialPost.pages.splice($scope.currentSocialPost.pages.indexOf(page_id), 1);
                else
                    $scope.currentSocialPost.pages.push(page_id);
            };
            $scope.chooseStack = function (stack_id) {
                $scope.currentSocialPost.stacks = $scope.currentSocialPost.stacks || [];
                if ($scope.currentSocialPost.stacks.indexOf(stack_id) != -1)
                    $scope.currentSocialPost.stacks.splice($scope.currentSocialPost.stacks.indexOf(stack_id), 1);
                else
                    $scope.currentSocialPost.stacks.push(stack_id);
            };


            $scope.cancel = function () {
                $state.go('portal.schedule.table')
            };
            $scope.secondaryAction = function () {

                switch ($scope.currentSocialPost.state) {
                    case 'ACTIVE':
                        // Make it a draft now
                        SocialPosts.draftScheduledPost({id: $scope.postId}, function (message) {
                            // $state.go('portal.schedule.table', {});
                            $scope.currentSocialPost.post_time = $scope.currentSocialPost.date;
                            $scope.currentSocialPost._id = $scope.postId;

                            $state.transitionTo('portal.schedule.table', {
                                'updateId': $scope.postId,
                                'updateState': 'DRAFT',
                                'updateContent': $scope.currentSocialPost
                            });

                        }, function (status, message) {
                            Alert.error(message);
                        });

                        break;
                    case 'DRAFT':
                        // Delete the post.
                        SocialPosts.deletePost($scope.postId, function (message) {
                            $state.transitionTo('portal.schedule.table', {
                                'updateId': $scope.postId,
                                'updateState': 'DELETE',
                                'updateContent': null
                            });
                        }, function (status, message) {
                            Alert.error(message);
                        });
                        break;

                }
            };

            // $scope.archivePostToggle = function () {
            //     SocialPosts.archivePostToggle({
            //         id: $scope.postId
            //     }, function (postDetails) {
            //         $state.go('portal.schedule.table', {'updateId': $scope.postId, 'updateContent': postDetails});
            //
            //     }, function (status, message) {
            //         return Alert.error("Failed to archive post.");
            //     })
            // };

            $scope.changedForm = function () {
                SocialPosts.draftScheduledPost()
            };

            $scope.getHashtags = function (content, forceRefresh) {
                if (content.length > 0 && $scope.postId != null) {
                    Action.fetchHashtags(content, forceRefresh, $scope.postId, function (message, used) {
                        $scope.hashtags = message;
                        $scope.hashtag_lookups = used;
                    }, function (status, message) {
                        Alert.error(message);
                    })
                } else {
                    Alert.error("Must have some content to lookup.")
                }
            };

            $scope.draftUpdater = null;

            $scope.$watch("currentSocialPost", function (newValue, oldValue) {
                if (newValue !== oldValue && oldValue != null) {
                    if ($scope.draftUpdater != null)
                        clearTimeout($scope.draftUpdater);
                    try {
                        $scope.draftUpdater = setTimeout(function () {
                            if ($scope.currentSocialPost.state != "ACTIVE") {
                                $scope.applyDraft();
                            }
                        }, 500);
                    } catch (e) {
                        console.log(e)
                    }
                }
            }, true);

            $scope.applyDraft = function () {
                var image_ids = [];
                angular.forEach($scope.currentSocialPost.images, function (image) {
                    image_ids.push(image._id);
                });

                var params = {
                    pages: $scope.currentSocialPost.pages,
                    stacks: $scope.currentSocialPost.stacks,
                    content: $scope.currentSocialPost.content.length > 0 ? $scope.currentSocialPost.content : '',
                    images: image_ids
                };

                params.post_time = $scope.currentSocialPost.date;

                if ($scope.postId != null)
                    params.id = $scope.postId;
                if ($scope.postId) {
                    $scope.socket.emit('updateDraft', params);
                } else {
                    SocialPosts.draftScheduledPost(params, function (data) {
                        $scope.postId = data._id;
                        if ($stateParams.postId != $scope.postId) {
                            $state.go('portal.schedule.edit', {postId: $scope.postId}, {reload: false})

                        }
                    }, function (status, message) {
                        Alert.error("Failed to save draft")
                    });
                }
            };


            $scope.submitPost = function () {
                if ($scope.currentSocialPost.pages.length == 0)
                    return Alert.error("You must choose at least one platform.")
                else if ($scope.currentSocialPost.content.length == 0)
                    return Alert.error("You must have some content.");

                var image_ids = [];
                angular.forEach($scope.currentSocialPost.images, function (image) {
                    image_ids.push(image._id);
                });

                var params = {
                    pages: $scope.currentSocialPost.pages,
                    stacks: $scope.currentSocialPost.stacks,
                    content: $scope.currentSocialPost.content,
                    images: image_ids
                };

                params.post_time = $scope.currentSocialPost.date;

                if ($scope.postId != null)
                    params.id = $scope.postId;


                if (!$scope.pending) {
                    $scope.pending = true;
                    SocialPosts.submitScheduledPost(params, function (postDetails) {
                        $scope.pending = false;
                        Alert.success("Scheduled post on " + $filter('date')(postDetails.post_time, 'short'));
                        $state.transitionTo('portal.schedule.table', {
                            'updateId': null,
                            'updateState': 'ADD',
                            'updateContent': postDetails
                        });
                    }, function (status, message) {
                        $scope.pending = false;
                        Alert.error("Failed to submit: " + message)
                    });
                }
            };


            // Get the simple list which basically is the grouped up version?
            SocialStacks.getSocialStacks(true, false, 1, function (socialStacks) {
                $scope.allStacks = socialStacks.social_stacks;
                console.log($scope.allStacks);
                SocialAccounts.getSocialAccounts(null, null, function (socialAccounts) {
                    $scope.allPages = [];
                    for (let index in socialAccounts.pages) {
                        if (socialAccounts.pages[index].platform != 4) {
                            $scope.allPages.push(socialAccounts.pages[index]);
                        }
                    }

                    if ($scope.allPages.length == 0) {
                        Alert.error("You must add a social account first.");
                        $state.go('portal.accounts.home');
                    }
                    else {
                        setTimeout(function () {
                            $scope.step();
                        }, 0);
                        if ($scope.postId && !$scope.postInformation) {
                            // Editing social post
                            SocialPosts.getDetails($scope.postId,
                                function (socialPostDetails) {
                                    socialPostDetails = socialPostDetails.data;
                                    if (new Date(socialPostDetails.post_time).getTime() < new Date() && socialPostDetails.state != "DRAFT") {
                                        // Already posted
                                        Alert.info("You are unable to edit a posted social post.");
                                        $state.go('portal.schedule.table');
                                    }

                                    var chosenPlatforms = [];
                                    for (var socialPageIndex in socialPostDetails.pages) {
                                        var socialPage = socialPostDetails.pages[socialPageIndex];
                                        chosenPlatforms.push(socialPage);
                                    }
                                    $scope.currentSocialPost.stacks = socialPostDetails.stacks;
                                    $scope.currentSocialPost.state = socialPostDetails.state;
                                    $scope.currentSocialPost.pages = chosenPlatforms;
                                    $scope.currentSocialPost.images = socialPostDetails.images;
                                    $scope.currentSocialPost.content = socialPostDetails.content;
                                    // var time = new Date(socialPostDetails.post_time);
                                    if ($scope.attachedImage) {
                                        Image.getDetails($scope.attachedImage, function (data) {
                                            $scope.currentSocialPost.images.push(data.data);
                                        }, function (status, message) {
                                            console.log("Failed?", status, message)
                                        })
                                    }


                                    $scope.currentSocialPost.date = moment(socialPostDetails.post_time);
                                }, function (status, message) {
                                    // Failed to get details...
                                    console.log(message);
                                    $scope.postId = null;
                                    Alert.error("Failed to get details of this post. Creating new post.");

                                })
                        } else if ($scope.postInformation) {
                            console.log("Preset info", $scope.postInformation)
                            $scope.currentSocialPost = $scope.postInformation;
                            if ($scope.attachedImage) {
                                Image.getDetails($scope.attachedImage, function (data) {
                                    $scope.currentSocialPost.images.push(data.data);
                                }, function (status, message) {
                                    console.log("Failed?", status, message)
                                })
                            }
                        } else {
                            $scope.applyDraft();
                        }
                    }
                }, function (status, error) {
                    $scope.platforms = [];
                    Alert.error(error.code + ": Failed to get social accounts. ")
                });
            }, function (status, error) {
                $scope.platforms = [];
                Alert.error(error.code + ": Failed to get social stacks. ")
            });

        }]);
});

