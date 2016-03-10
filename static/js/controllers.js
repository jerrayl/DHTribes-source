'use strict';

//Root activityApp module
var activityApp = activityApp || {};

//Angular module for controllers.
activityApp.controllers = angular.module('activityControllers', ['ui.bootstrap']);

//A controller used for the Tribes page.
activityApp.controllers.controller('TribesCtrl', function ($scope, $log, oauth2Provider, HTTP_ERRORS) {

    $scope.is_Empty = function () {
        if ($scope.tribe.tribename.length == 10) {
            return true;
            }
            return false;
        }
		
//Retrieves the tribes by calling the getTribes method.
    $scope.queryTribes = function () {
        $scope.loading = true;
        gapi.client.activity.queryTribes().
            execute(function (resp) {
                $scope.$apply(function () {
                    $scope.loading = false;
                    if (resp.error) {
                        // The request has failed.
                        var errorMessage = resp.error.message || '';
                        $scope.messages = 'Failed to query tribes : ' + errorMessage;
                        $scope.alertStatus = 'warning';
                        $log.error($scope.messages + ' filters : ');
                    } else {
                        // The request has succeeded.
                        $scope.submitted = false;
                        $scope.messages = 'Query succeeded : Tribes';
                        $scope.alertStatus = 'success';
                        $log.info($scope.messages);

                        $scope.tribes = [];
						angular.forEach(resp.items, function (tribe) {
                           $scope.tribes.push(tribe);
                        });
                    }
                    $scope.submitted = true;
                });
            });
    }
	$scope.queryTribes();


//Invokes the activity.createTribe API.
        $scope.createTribe = function (tribeForm) {
			if ($scope.is_Empty()) {
                return;
            }
            $scope.loading = true;
            gapi.client.activity.createTribe($scope.tribe).
                execute(function (resp) {
                    $scope.$apply(function () {
                        $scope.loading = false;
                        if (resp.error) {
                            // The request has failed.
                            var errorMessage = resp.error.message || '';
                            $scope.messages = 'Failed to create a tribe : ' + errorMessage;
                            $scope.alertStatus = 'warning';
                            $log.error($scope.messages + ' tribe : ' + JSON.stringify($scope.activity));
							
                        } else {
                            // The request has succeeded.
                            $scope.messages = 'The tribe has been created '
                            $scope.alertStatus = 'success';
                            $scope.submitted = false;
                            $scope.activity = {};
                            $log.info($scope.messages + ' : ' + JSON.stringify(resp.result));
							$scope.queryTribes();
                        }
                    });
                });
        };
 });

	
//A controller used for the My Profile page.
activityApp.controllers.controller('MyProfileCtrl',
    function ($scope, $log, oauth2Provider, HTTP_ERRORS) {
        $scope.submitted = false;
        $scope.loading = false;

        $scope.initialProfile = {};

        $scope.isValidPhoneNumber = function () {
            if (!$scope.profile.phoneNumber || $scope.profile.phoneNumber.length == 0) {
                return true;
            }
            return /^[\d]+$/.test($scope.profile.phoneNumber) && $scope.profile.phoneNumber >= 0;
        }
        
		$scope.isValidProfile = function (ProfileForm) {
            return !profileForm.$invalid &&
                $scope.isValidPhoneNumber();
               
        }
		
//Initialization   
        $scope.init = function () {
            var retrieveProfileCallback = function () {
                $scope.profile = {};
                $scope.loading = true;
                gapi.client.activity.getProfile().
                    execute(function (resp) {
                        $scope.$apply(function () {
                            $scope.loading = false;
                            if (resp.error) {
                                // Failed to get a user profile.
                            } else {
                                // Succeeded to get the user profile.
                                $scope.profile.displayName = resp.result.displayName;
                                $scope.profile.phoneNumber = resp.result.phoneNumber;
                                $scope.initialProfile = resp.result;
                            }
                        });
                    }
                );
            };
            if (!oauth2Provider.signedIn) {
                var modalInstance = oauth2Provider.showLoginModal();
                modalInstance.result.then(retrieveProfileCallback);
            } else {
                retrieveProfileCallback();
            }
        };

//Save Profile
        $scope.saveProfile = function (profileForm) {
			   if (!$scope.isValidProfile(profileForm)) {
                return;
            }
            $scope.submitted = true;
            $scope.loading = true;
            gapi.client.activity.saveProfile($scope.profile).
                execute(function (resp) {
                    $scope.$apply(function () {
                        $scope.loading = false;
                        if (resp.error) {
                            // The request has failed.
                            var errorMessage = resp.error.message || '';
                            $scope.messages = 'Failed to update a profile : ' + errorMessage;
                            $scope.alertStatus = 'warning';
                            $log.error($scope.messages + 'Profile : ' + JSON.stringify($scope.profile));

                            if (resp.code && resp.code == HTTP_ERRORS.UNAUTHORIZED) {
                                oauth2Provider.showLoginModal();
                                return;
                            }
                        } else {
                            // The request has succeeded.
                            $scope.messages = 'The profile has been updated';
                            $scope.alertStatus = 'success';
                            $scope.submitted = false;
                            $scope.initialProfile = {
                                displayName: $scope.profile.displayName,
                                phoneNumber: $scope.profile.phoneNumber
                            };

                            $log.info($scope.messages + JSON.stringify(resp.result));
                        }
                    });
                });
        };
    })
;


//A controller used for the Create activity page.

 activityApp.controllers.controller('CreateActivityCtrl',
    function ($scope, $log, oauth2Provider, HTTP_ERRORS) {

        $scope.activity = $scope.activity || {};

		$scope.tribes = [];
		$scope.tribenames=[];
		
		$scope.queryTribes = function () {
        $scope.loading = true;
        gapi.client.activity.queryTribes().
            execute(function (resp) {
                $scope.$apply(function () {
                    $scope.loading = false;
                    if (resp.error) {
                        // The request has failed.
                        var errorMessage = resp.error.message || '';
                        $scope.messages = 'Failed to query tribes : ' + errorMessage;
                        $scope.alertStatus = 'warning';
                        $log.error($scope.messages + ' filters : ');
                    } else {
                        // The request has succeeded.
                        $scope.submitted = false;
                        $scope.messages = 'Query succeeded : Tribes';
                        $scope.alertStatus = 'success';
                        $log.info($scope.messages);

						angular.forEach(resp.items, function (tribe) {
                           $scope.tribes.push(tribe);
                        });
						
						for (var i in $scope.tribes){
						$scope.tribenames.push($scope.tribes[i].tribename);
						};
                    }
                    $scope.submitted = true;
                });
            });
    };
	$scope.queryTribes();


	
	
		
//Tests if the arugment is an integer and not negative.
        $scope.isValidMaxParticipants = function () {
            if (!$scope.activity.maxParticipants || $scope.activity.maxParticipants.length == 0) {
                return true;
            }
            return /^[\d]+$/.test($scope.activity.maxParticipants) && $scope.activity.maxParticipants >= 0;
        }

//Tests if the time is valid.
		$scope.isValidTime = function () {
            if (!$scope.activity.time || $scope.activity.time.length == 0) {
                return true;
            }
            return /^[\d]+$/.test($scope.activity.time) && $scope.activity.time  < 1259 ;
        }
		
//Tests if activity is valid.
		$scope.isValidActivity = function (ActivityForm) {
            return !activityForm.$invalid &&
                $scope.isValidMaxParticipants() &&
				$scope.isValidTime();
               
        }
		
//Invokes the activity.createActivity API.
        $scope.createActivity = function (activityForm) {
            if (!$scope.isValidActivity(activityForm)) {
                return;
            }

            $scope.loading = true;
            gapi.client.activity.createActivity($scope.activity).
                execute(function (resp) {
                    $scope.$apply(function () {
                        $scope.loading = false;
                        if (resp.error) {
                            // The request has failed.
                            var errorMessage = resp.error.message || '';
                            $scope.messages = 'Failed to create a activity : ' + errorMessage;
                            $scope.alertStatus = 'warning';
                            $log.error($scope.messages + ' Activity : ' + JSON.stringify($scope.activity));

                            if (resp.code && resp.code == HTTP_ERRORS.UNAUTHORIZED) {
                                oauth2Provider.showLoginModal();
                                return;
                            }
                        } else {
                            // The request has succeeded.
                            $scope.messages = 'The activity has been created '
                            $scope.alertStatus = 'success';
                            $scope.submitted = false;
                            $scope.activity = {};
                            $log.info($scope.messages + ' : ' + JSON.stringify(resp.result));
                        }
                    });
                });
        };
    });
 
 
//A controller used for the View activity page.

activityApp.controllers.controller('ViewActivityCtrl', function ($scope, $log, oauth2Provider, HTTP_ERRORS) {

    $scope.submitted = false;

    $scope.selectedTab = 'ALL';

    $scope.activities = [];

    $scope.isOffcanvasEnabled = false;

	$scope.tribes = [];
	$scope.tribenames=["All Tribes"];
		
	$scope.queryTribes = function () {
		$scope.loading = true;
		gapi.client.activity.queryTribes().
			execute(function (resp) {
				$scope.$apply(function () {
					$scope.loading = false;
					if (resp.error) {
                       // The request has failed.
                       var errorMessage = resp.error.message || '';
                       $scope.messages = 'Failed to query tribes : ' + errorMessage;
                       $scope.alertStatus = 'warning';
                       $log.error($scope.messages + ' filters : ');
					} else {
                       // The request has succeeded.
                       $scope.submitted = false;
                       $scope.messages = 'Query succeeded : Tribes';
                       $scope.alertStatus = 'success';
                       $log.info($scope.messages);

						angular.forEach(resp.items, function (tribe) {
                          $scope.tribes.push(tribe);
						});
						
						for (var i in $scope.tribes){
						$scope.tribenames.push($scope.tribes[i].tribename);
						};
					}
					$scope.submitted = true;
				});
			});
    };
	
	$scope.queryTribes();
	
//Sets the selected tab to 'ALL'
    $scope.tabAllSelected = function () {
        $scope.selectedTab = 'ALL';
        $scope.queryActivities();
    };

//Sets the selected tab to 'YOU_HAVE_CREATED'
    $scope.tabYouHaveCreatedSelected = function () {
        $scope.selectedTab = 'YOU_HAVE_CREATED';
        if (!oauth2Provider.signedIn) {
            oauth2Provider.showLoginModal();
            return;
        }
        $scope.queryActivities();
    };

//Sets the selected tab to 'YOU_WILL_ATTEND'
    $scope.tabYouWillAttendSelected = function () {
        $scope.selectedTab = 'YOU_WILL_ATTEND';
        if (!oauth2Provider.signedIn) {
            oauth2Provider.showLoginModal();
            return;
        }
        $scope.queryActivities();
    };

//Toggles the status of the offcanvas.
    $scope.toggleOffcanvas = function () {
        $scope.isOffcanvasEnabled = !$scope.isOffcanvasEnabled;
    };

//Namespace for the pagination.
    $scope.pagination = $scope.pagination || {};
    $scope.pagination.currentPage = 0;
    $scope.pagination.pageSize = 20;

//Returns the number of the pages in the pagination.
    $scope.pagination.numberOfPages = function () {
        return Math.ceil($scope.activities.length / $scope.pagination.pageSize);
    };

//Returns an array including the numbers from 1 to the number of the pages.
    $scope.pagination.pageArray = function () {
        var pages = [];
        var numberOfPages = $scope.pagination.numberOfPages();
        for (var i = 0; i < numberOfPages; i++) {
            pages.push(i);
        }
        return pages;
    };

//Checks if the target element that invokes the click event has the "disabled" class.
    $scope.pagination.isDisabled = function (event) {
        return angular.element(event.target).hasClass('disabled');
    }

//Query the activities depending on the tab currently selected.
    $scope.queryActivities = function () {
        $scope.submitted = false;
        if ($scope.selectedTab == 'ALL') {
            $scope.queryActivitiesAll();
        } else if ($scope.selectedTab == 'YOU_HAVE_CREATED') {
            $scope.getActivitiesCreated();
        } else if ($scope.selectedTab == 'YOU_WILL_ATTEND') {
            $scope.getActivitiesAttend();
        }
    };



//Invokes the activity.queryActivities API.
    $scope.filterTribes = function () {
		var filter = $scope.filterForm.tribe.$viewValue;
		if (filter=="All Tribes"){
			 $scope.queryActivitiesAll();
		}else{
		var send_filter = {fil:filter};
        $scope.loading = true;
        gapi.client.activity.queryActivities(send_filter).
            execute(function (resp) {
                $scope.$apply(function () {
                    $scope.loading = false;
                    if (resp.error) {
                        // The request has failed.
                        var errorMessage = resp.error.message || '';
                        $scope.messages = 'Failed to query activities : ' + errorMessage;
                        $scope.alertStatus = 'warning';
                        $log.error($scope.messages + ' filters : ');
                    } else {
                        // The request has succeeded.
                        $scope.submitted = false;
                        $scope.messages = 'Query succeeded : Filtered activities';
                        $scope.alertStatus = 'success';
                        $log.info($scope.messages);

                        $scope.activities = [];
						angular.forEach(resp.items, function (activity) {
                           $scope.activities.push(activity);
                        });
                    }
                    $scope.submitted = true;
                });
            });
		}
    }
	
//Invokes the activity.queryActivity API.
    $scope.queryActivitiesAll = function () {
        $scope.loading = true;
        gapi.client.activity.queryActivities().
            execute(function (resp) {
                $scope.$apply(function () {
                    $scope.loading = false;
                    if (resp.error) {
                        // The request has failed.
                        var errorMessage = resp.error.message || '';
                        $scope.messages = 'Failed to query activities : ' + errorMessage;
                        $scope.alertStatus = 'warning';
                        $log.error($scope.messages + ' filters : ');
                    } else {
                        // The request has succeeded.
                        $scope.submitted = false;
                        $scope.messages = 'Query succeeded : All activities';
                        $scope.alertStatus = 'success';
                        $log.info($scope.messages);

                        $scope.activities = [];
						angular.forEach(resp.items, function (activity) {
                           $scope.activities.push(activity);
                        });
                    }
                    $scope.submitted = true;
                });
            });
    }

//Invokes the activity.getActivitiesCreated method.
    $scope.getActivitiesCreated = function () {
        $scope.loading = true;
        gapi.client.activity.getActivitiesCreated().
            execute(function (resp) {
                $scope.$apply(function () {
                    $scope.loading = false;
                    if (resp.error) {
                        // The request has failed.
                        var errorMessage = resp.error.message || '';
                        $scope.messages = 'Failed to query the activities created : ' + errorMessage;
                        $scope.alertStatus = 'warning';
                        $log.error($scope.messages);

                        if (resp.code && resp.code == HTTP_ERRORS.UNAUTHORIZED) {
                            oauth2Provider.showLoginModal();
                            return;
                        }
                    } else {
                        // The request has succeeded.
                        $scope.submitted = false;
                        $scope.messages = 'Query succeeded : Activities you have created';
                        $scope.alertStatus = 'success';
                        $log.info($scope.messages);

                        $scope.activities = [];
                        angular.forEach(resp.items, function (activity) {
                            $scope.activities.push(activity);
                        });
                    }
                    $scope.submitted = true;
                });
            });
    };

//Retrieves the activities to attend by calling the activity.getProfile method and invokes the activity.getActivity method one time for each activity to attend.
    $scope.getActivitiesAttend = function () {
        $scope.loading = true;
        gapi.client.activity.getActivitiesToAttend().
            execute(function (resp) {
                $scope.$apply(function () {
                    if (resp.error) {
                        // The request has failed.
                        var errorMessage = resp.error.message || '';
                        $scope.messages = 'Failed to query the activities to attend : ' + errorMessage;
                        $scope.alertStatus = 'warning';
                        $log.error($scope.messages);

                        if (resp.code && resp.code == HTTP_ERRORS.UNAUTHORIZED) {
                            oauth2Provider.showLoginModal();
                            return;
                        }
                    } else {
                        // The request has succeeded.
                        $scope.activities = resp.result.items;
                        $scope.loading = false;
                        $scope.messages = 'Query succeeded : Activities you will attend';
                        $scope.alertStatus = 'success';
                        $log.info($scope.messages);
                    }
                    $scope.submitted = true;
                });
            });
    };
});


//A controller used for the activity detail page.

activityApp.controllers.controller('ActivityDetailCtrl', function ($scope, $log, $routeParams, HTTP_ERRORS) {
    $scope.activity = {};

    $scope.isUserAttending = false;

//Initialization
    $scope.init = function () {
        $scope.loading = true;
        gapi.client.activity.getActivity({
            websafeActivityKey: $routeParams.websafeActivityKey
        }).execute(function (resp) {
            $scope.$apply(function () {
                $scope.loading = false;
                if (resp.error) {
                    // The request has failed.
                    var errorMessage = resp.error.message || '';
                    $scope.messages = 'Failed to get the activity : ' + $routeParams.websafeKey
                        + ' ' + errorMessage;
                    $scope.alertStatus = 'warning';
                    $log.error($scope.messages);
                } else {
                    // The request has succeeded.
                    $scope.alertStatus = 'success';
                    $scope.activity = resp.result;
                }
            });
        });

        $scope.loading = true;
        // If the user is attending the activity, updates the status message and available function.
        gapi.client.activity.getProfile().execute(function (resp) {
            $scope.$apply(function () {
                $scope.loading = false;
                if (resp.error) {
                    // Failed to get a user profile.
                } else {
                    var profile = resp.result;
                    for (var i = 0; i < profile.activityKeysToAttend.length; i++) {
                        if ($routeParams.websafeActivityKey == profile.activityKeysToAttend[i]) {
                            // The user is attending the activity.
                            $scope.alertStatus = 'info';
                            $scope.messages = 'You are attending this activity';
                            $scope.isUserAttending = true;
                        }
                    }
                }
            });
        });
    };
	
//Invokes the activity.registerForActivity method.
    $scope.registerForActivity = function () {
        $scope.loading = true;
        gapi.client.activity.registerForActivity({
            websafeActivityKey: $routeParams.websafeActivityKey
        }).execute(function (resp) {
            $scope.$apply(function () {
                $scope.loading = false;
                if (resp.error) {
                    // The request has failed.
                    var errorMessage = resp.error.message || '';
                    $scope.messages = 'Failed to register for the activity : ' + errorMessage;
                    $scope.alertStatus = 'warning';
                    $log.error($scope.messages);

                    if (resp.code && resp.code == HTTP_ERRORS.UNAUTHORIZED) {
                        oauth2Provider.showLoginModal();
                        return;
                    }
                } else {
                    if (resp.result) {
                        // Register succeeded.
                        $scope.messages = 'Registered for the activity';
                        $scope.alertStatus = 'success';
                        $scope.isUserAttending = true;
						$scope.init();
					} else {
                        $scope.messages = 'Failed to register for the activity';
                        $scope.alertStatus = 'warning';
                    }
                }
			});
		});
    };

//Invokes the activity.unregisterFromActivity method.
    $scope.unregisterFromActivity = function () {
        $scope.loading = true;
        gapi.client.activity.unregisterFromActivity({
            websafeActivityKey: $routeParams.websafeActivityKey
        }).execute(function (resp) {
            $scope.$apply(function () {
                $scope.loading = false;
                if (resp.error) {
                    // The request has failed.
                    var errorMessage = resp.error.message || '';
                    $scope.messages = 'Failed to unregister from the activity : ' + errorMessage;
                    $scope.alertStatus = 'warning';
                    $log.error($scope.messages);
                    if (resp.code && resp.code == HTTP_ERRORS.UNAUTHORIZED) {
                        oauth2Provider.showLoginModal();
                        return;
                    }
                } else {
                    if (resp.result) {
                        // Unregister succeeded.
                        $scope.messages = 'Unregistered from the activity';
                        $scope.alertStatus = 'success';
                        $scope.init();
                        $scope.isUserAttending = false;
                        $log.info($scope.messages);
                    } else {
                        var errorMessage = resp.error.message || '';
                        $scope.messages = 'Failed to unregister from the activity : ' + $routeParams.websafeKey +
                            ' : ' + errorMessage;
                        $scope.messages = 'Failed to unregister from the activity';
                        $scope.alertStatus = 'warning';
                        $log.error($scope.messages);
                    }
                }
            });
        });
    };
});


//The root controller having a scope of the body element and methods used in the application wide

activityApp.controllers.controller('RootCtrl', function ($scope, $location, oauth2Provider) {

//Returns if the viewLocation is the currently viewed page.
    $scope.isActive = function (viewLocation) {
        return viewLocation === $location.path();
    };

//Returns the OAuth2 signedIn state.
    $scope.getSignedInState = function () {
        return oauth2Provider.signedIn;
    };

//Calls the OAuth2 authentication method.
	$scope.signIn = function () {
        oauth2Provider.signIn(function () {
            gapi.client.oauth2.userinfo.get().execute(function (resp) {
                $scope.$apply(function () {
                    if (resp.email) {
                        oauth2Provider.signedIn = true;
                        $scope.alertStatus = 'success';
                        $scope.rootMessages = 'Logged in with ' + resp.email;
                    }
                });
            });
        });
    };

//Render the signInButton and restore the credential if it's stored in the cookie.
    $scope.initSignInButton = function () {
        gapi.signin.render('signInButton', {
            'callback': function () {
                jQuery('#signInButton button').attr('disabled', 'true').css('cursor', 'default');
                if (gapi.auth.getToken() && gapi.auth.getToken().access_token) {
                    $scope.$apply(function () {
                        oauth2Provider.signedIn = true;
                    });
                }
            },
            'clientid': oauth2Provider.CLIENT_ID,
            'cookiepolicy': 'single_host_origin',
            'scope': oauth2Provider.SCOPES
        });
    };

//Logs out the user.
    $scope.signOut = function () {
        oauth2Provider.signOut();
        $scope.alertStatus = 'success';
        $scope.rootMessages = 'Logged out';
    };

//Collapses the navbar on mobile devices.
    $scope.collapseNavbar = function () {
        angular.element(document.querySelector('.navbar-collapse')).removeClass('in');
    };

});


//The controller for the modal dialog that is shown when an user needs to login to achive some functions.

activityApp.controllers.controller('OAuth2LoginModalCtrl',
    function ($scope, $modalInstance, $rootScope, oauth2Provider) {
        $scope.singInViaModal = function () {
            oauth2Provider.signIn(function () {
                gapi.client.oauth2.userinfo.get().execute(function (resp) {
                    $scope.$root.$apply(function () {
                        oauth2Provider.signedIn = true;
                        $scope.$root.alertStatus = 'success';
                        $scope.$root.rootMessages = 'Logged in with ' + resp.email;
                    });

                    $modalInstance.close();
                });
            });
        };
    });

//A controller that holds properties for a datepicker.

activityApp.controllers.controller('DatepickerCtrl', function ($scope) {
    $scope.today = function () {
        $scope.dt = new Date();
    };
    $scope.today();

    $scope.clear = function () {
        $scope.dt = null;
    };

    // Disable weekend selection
    $scope.disabled = function (date, mode) {
        return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
    };

    $scope.toggleMin = function () {
        $scope.minDate = ( $scope.minDate ) ? null : new Date();
    };
    $scope.toggleMin();

    $scope.open = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.opened = true;
    };

    $scope.dateOptions = {
        'year-format': "'yy'",
        'starting-day': 1
    };

    $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'shortDate'];
    $scope.format = $scope.formats[0];
});

activityApp.controllers.controller('TimepickerCtrl', function ($scope) {
  $scope.mytime = new Date();
  $scope.ampm = "PM"
  $scope.activity.ampm = "PM";

  $scope.switcher = function() {
    if ($scope.ampm == "AM"){
		$scope.ampm = "PM";
		$scope.activity.ampm = "PM";
	}
	else if ($scope.ampm == "PM"){
		$scope.ampm = "AM";
		$scope.activity.ampm = "PM";
	}
  };
});
