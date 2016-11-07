var app = angular.module('geocoding', []);

// Interface for creating the offline geocoding database
// Going through every location in the database, using google geocoding and allowing manual corrections
// File needs to be saved by copy-pasting json string at the bottom of the page
app.controller('moviesCtrl', function($scope, $http, $sce) {
	
	// Locations (one location can have several movies)
	$scope.locations = [];
	$scope.currentLocation = '';
	
	// Coordinates (location, lat and long)
	$scope.coordinates = [];
	
	// In json format for saving
	$scope.coordsJson = '';
	
	// Index of the location being currently treated
	$scope.index = 0;
	
	$scope.currentLat = '';
	$scope.currentLong = '';
	
	// String expressing the result of the geocoding
	$scope.result = "";
	
	$scope.geocoder = new google.maps.Geocoder();
	
	$scope.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 11,
		center: new google.maps.LatLng(37.80, -122.33),
	});
	
	// Default location for the marker if geocoding fails
	$scope.defaultPos = new google.maps.LatLng(37.794584, -122.385491);
	
	// Bounding box to search in SF
	$scope.searchBounds = new google.maps.LatLngBounds(new google.maps.LatLng(37.810542, -122.533974), new google.maps.LatLng(37.712400, -122.342987))
	
	// A draggable marker to show geocoding result and drag to correct location
	$scope.marker = new google.maps.Marker({
      map: $scope.map,
   	position: $scope.defaultPos,
   	draggable:true,
   });
	
	$http.get("https://data.sfgov.org/resource/wwmu-gmzc.json")
	.then(function(response) {
		var retrieved = response.data;
		
		// Same movies should follow each other
		retrieved.sort(function(a, b) {
			return [a.title, a.release_year].join().localeCompare([b.title, b.release_year].join());
		});
		
		//Merging same movies with several locations and associated fun facts
		var itMovies = 0;
		
		for (var i = 0; i< retrieved.length; i++) {
			var elem = retrieved[i];
			
			if(elem.locations != null){
				var locIdx = $scope.locations.indexOf(elem.locations);
				if (locIdx == -1) {
					$scope.locations.push(elem.locations);
				}
			}
		}
		
		// Geocoding the first element of the list
		$scope.geocode(0);
		
	}, function(response) {
		console.log("Error loading data: " + response.statusText);
	});
	
	// When we go to the next element, add previous to coordinates and geocode next
	$scope.$watch('index', function(){
		if($scope.index >= $scope.locations.length && $scope.locations.length > 0){// Shouldn't execute before data is loaded or if we reached the end
			$scope.currentLocation = "Done!";
		} else {
			if($scope.index != 0){ // Saving previous data
				$scope.coordinates.push({'location': $scope.currentLocation, 'lat': $scope.marker.getPosition().lat(), 'lng': $scope.marker.getPosition().lng()});
				$scope.coordsJson = JSON.stringify($scope.coordinates);
			}
		
			$scope.geocode($scope.index);
		}
		
	});
	
	// Doing the geocoding request for location at specific index
	$scope.geocode = function(index){
		$scope.currentLocation = $scope.locations[$scope.index];
		$scope.geocoder.geocode({'address': $scope.currentLocation, 'componentRestrictions': { country: 'US', locality: 'San Francisco'}}, function(results, status) {
			if (status === 'OK') { // Geocoding successful
			
            $scope.map.setCenter(results[0].geometry.location);
            $scope.marker.setPosition(results[0].geometry.location);
            $scope.currentLat = results[0].geometry.location.lat();
            $scope.currentLong = results[0].geometry.location.lng();
          } else { // Use the default marker
            $scope.map.setCenter($scope.defaultPos);
            $scope.marker.setPosition($scope.defaultPos);
            $scope.currentLat = $scope.defaultPos.lat();
            $scope.currentLong = $scope.defaultPos.lng();
          }
				$scope.result = status;
		});
	};
    
});

