// Extending the string class to insert at specific location
String.prototype.insertAt=function(index, string) { 
  return this.substr(0, index) + string + this.substr(index);
}

// Sorting and removing duplicates from an array
function uniq(a) {
    return a.sort().filter(function(item, pos, ary) {
        return !pos || item != ary[pos - 1];
    })
}

var app = angular.module('sfFilming', []);

app.controller('moviesCtrl', function($scope, $http, $sce) {
	$scope.sucessful = false;
	$scope.infoText = "Loading...";	
	$scope.selected = null;
	$scope.searchQuery = "";
	
	$scope.movies = []; // Stores all the movies instances
	$scope.locations = []; // Stores all the locations
	$scope.locationsMoviesIdx = []; // Stores the movies indexes corresponding to the locations
	$scope.markers = [];
	
	// The options for Fuse
	var options = {
		threshold: 0.1,
		location: 0,
		distance: 100,
		maxPatternLength: 32,
		matchAllTokens: true,
		include: ["matches"],
		keys: [
			"title",
			"release_year",
			"production_company",
			"distributor",
			"director",
			"locations",
			"writer",
			"actor_1",
			"actor_2",
			"actor_3"
		]
	};
	
	$scope.fuse = new Fuse($scope.movies, options);
	$scope.results = [];
	
	$scope.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 11,
		center: {lat: 37.80, lng: -122.33},
	});
	
	// The marker image when not selected
	$scope.markerImg = {
   	url: 'http://maps.google.com/mapfiles/ms/micons/grey.png',
      scaledSize: new google.maps.Size(20, 20)
   };
	
	$http.get("https://data.sfgov.org/resource/wwmu-gmzc.json")
	.then(function(response) {
		
		$http.get("geocoding.json")
		.then(function(response1){
			
			var retrieved = response.data;
			var geocoding = response1.data;
			console.log(geocoding);
			
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
						$scope.locationsMoviesIdx.push([itMovies]);
						locIdx = $scope.locations.length - 1;
					} else {
						$scope.locationsMoviesIdx[locIdx].push(itMovies);
					}
				}
			
				if(i == 0 || elem.title != $scope.movies[itMovies -1].title || elem.release_year != $scope.movies[itMovies -1].release_year){
					elem.index = itMovies;
					if(elem.locations != null){
						elem.locations = [elem.locations];
						elem.locationsIdx = [locIdx];
						elem.fun_facts = [elem.fun_facts];
					} else {
						elem.locations = [];
						elem.locationsIdx = [];
						elem.fun_facts = [];
					}
					$scope.movies.push(elem);
					itMovies = itMovies + 1;
				} else if(elem.locations != null) {
					$scope.movies[itMovies -1].locations.push(elem.locations);
					$scope.movies[itMovies -1].locationsIdx.push(locIdx);
					$scope.movies[itMovies -1].fun_facts.push(elem.fun_facts);
				}
			}
		
			for (var i = 0; i < $scope.locations.length; i++){
				// Look for coordinates in the geocoding table, otherwise random
				var thislat = 37.80;// + 0.3*Math.random()-0.15;
				var thislng = -122.33;// + 0.7*Math.random()-0.35;
				for(var j = 0; j < geocoding.length; j++){
					if(geocoding[j].location == $scope.locations[i]){
    					thislat = geocoding[j].lat;
    					thislng = geocoding[j].lng;
    					break;
    				}
				}

				var marker = new google.maps.Marker({
    				position: {lat: thislat, lng: thislng},
    				id: i,
    				map: $scope.map,
    				icon: $scope.markerImg,
    				title: $scope.locations[i]
  				});
  			
  				// Clicking on the marker searches for the movies at that location
  				google.maps.event.addListener(marker, 'click', (function(marker, i) {
        			return function() {
        				$scope.$apply(function() {
        					//	Clicking a second time reinitializes the search
        					if($scope.searchQuery == $scope.markers[i].getTitle()){
        						$scope.searchQuery = "";
        					} else {
        						$scope.searchQuery = $scope.markers[i].getTitle();
        					}
						});
        			}
      		})(marker, i));

				$scope.markers.push(marker);
			}
		
			$scope.sucessful = true;
			$scope.infoText = "Sucess";
			$scope.selected = 0;
		
		}, function(response1) {
			$scope.infoText = "Error loading data: " + response1.statusText;
		});
		

	}, function(response) {
		$scope.infoText = "Error loading data: " + response.statusText;
	});
	
	// Updating the results of the search when the search term is changed
	$scope.$watch('searchQuery', function(newVal,oldVal){

		if($scope.searchQuery){
			$scope.results = $scope.fuse.search($scope.searchQuery);
			
			// Check in the next loop if the selected movie is still in the list of results
			var removeSelected = true;
			
			// Updating the markers (hiding)
			var toShow = [];
			for(var i = 0; i < $scope.results.length; i++){
				toShow = toShow.concat($scope.results[i].item.locationsIdx);
				
				if ($scope.selected == $scope.results[i].item.index){
					removeSelected = false;				
				}
			}
			
			if(removeSelected){
				$scope.selected = null;			
			}			
			
			toShow = uniq(toShow);
			for(var i = 0; i < toShow.length; i++){
				$scope.markers[toShow[i]].setMap($scope.map);		
			}
		
			// toHide: all markers except those to Show
			var toHide = Array.apply(null, {length: $scope.markers.length}).map(Number.call, Number)
			toHide = toHide.filter( function( el ) {
				return toShow.indexOf( el ) < 0;
			});
			for(var i = 0; i < toHide.length; i++){
				$scope.markers[toHide[i]].setMap(null);
			}
		} else {
			$scope.results = [];
			
			// Show all markers
			for(var i = 0; i < $scope.markers.length; i++){
				$scope.markers[i].setMap($scope.map);		
			}
		}
		
		
	});
	
	// Changing colors and numbers of markers when a movie is selected
	$scope.$watch('selected',function(newVal,oldVal){

		if (oldVal != null){
			var selectedMovieLocs = $scope.movies[oldVal].locationsIdx;
			for (var m = 0; m < selectedMovieLocs.length; m++){
				var locIdx = selectedMovieLocs[m];
				$scope.markers[locIdx].setIcon($scope.markerImg);
			}
		}
		
		if (newVal != null){
			var selectedMovieLocs = $scope.movies[newVal].locationsIdx;
			for (var m = 0; m < selectedMovieLocs.length; m++){
				var locIdx = selectedMovieLocs[m];
				if(m+1 < 10){
					var markerLabel = {
   					fontSize: '14',
   					text: (m+1).toString()
   				}
				} else {
					var markerLabel = {
   					fontSize: '12',
   					text: (m+1).toString()
   				}
				}
				$scope.markers[locIdx].setAnimation(null);
				$scope.markers[locIdx].setIcon('markers/icon-big-' + (m+1).toString() + '.png');
			}
		}
	});
    
	$scope.click = function(index){
		if($scope.selected == index){
			$scope.selected = null;
		} else {
			$scope.selected = index;
		}
	};
	
	$scope.hoverIn = function(index){
		if (index != $scope.selected){
			var indices = $scope.movies[index].locationsIdx;
			for(var i = 0; i < indices.length ; i++){
				$scope.markers[indices[i]].setAnimation(google.maps.Animation.BOUNCE);
			}
		}
	};
	
	$scope.hoverOut = function(index){
		var indices = $scope.movies[index].locationsIdx;
		for(var i = 0; i < indices.length ; i++){
			$scope.markers[indices[i]].setAnimation(null);
		}
	};
    
});

app.filter('highlight', function($sce) {
  return function(text, phrase) {
    if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'),
      '<u>$1</u>')

    return $sce.trustAsHtml(' ' + text)
  }
})

app.filter('highlightPos', function($sce) {
	return function(text, match) {
  		var mark1 = match.indices[0][0];
  		var mark2 = match.indices[0][1];
    	if (mark2){
    		text = text.insertAt(mark2+1, '</u>');
    		text = text.insertAt(mark1, '<u>');
   	}

    	return $sce.trustAsHtml(' ' + text)
  }
})
