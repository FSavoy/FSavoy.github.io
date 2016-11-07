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

// Initialize popover for fun facts
$(document).ready(function(){
    $('[data-toggle="popover"]').popover();
});

var app = angular.module('sfFilming', ['ui.bootstrap']);

app.controller('moviesCtrl', function($scope, $http, $sce) {
	
	// boolean: if loading the files is sucessful
	$scope.sucessful = false;
	
	// Information text when loading files and if fail
	$scope.infoText = "Loading...";
	
	// Movie instances (one per movie even if several locations)
	$scope.movies = [];
	
	// Pointer to the selected movie in the movies array
	$scope.selected = null;
	
	// The string to search into movies
	$scope.searchQuery = "";
	
	// Locations (one location can have several movies)
	$scope.locations = []; // Stores all the locations
	
	// Pointers to the movies (in $scope.movies) for each element of $scope.locations
	$scope.locationsMoviesIdx = [];
	
	// Markers on the map
	$scope.markers = [];
	
	// The options for Fuse.js fuzzy search
	var options = {
		threshold: 0.05,
		location: 0,
		distance: 10000,
		maxPatternLength: 32,
		tokenize: true,
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
	
	// Movies after filtering
	$scope.results = [];
	
	$scope.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 13,
		center: {lat: 37.782665, lng: -122.391285},
	});
	
	// The marker image when not selected
	$scope.markerImg = {
   	url: 'http://maps.google.com/mapfiles/ms/micons/grey.png',
      scaledSize: new google.maps.Size(20, 20)
   };
	
	// Loading the database
	$http.get("https://data.sfgov.org/resource/wwmu-gmzc.json")
	.then(function(respData) {
		
		// Loading the geocoding database, generated offline
		$http.get("geocoding.json")
		.then(function(respGeo){
			
			var retrieved = respData.data;
			var geocoding = respGeo.data;
			
			// Same movies should follow each other
			retrieved.sort(function(a, b) {
				return [a.title, a.release_year].join().localeCompare([b.title, b.release_year].join());
			});
		
			//Merging same movies with several locations and associated fun facts
			var itMovies = 0; // Index of the movie (can have several retrieved rows)
			for (var i = 0; i < retrieved.length; i++) {
				var elem = retrieved[i];
				
				if(elem.locations != null){
					
					var locIdx = $scope.locations.indexOf(elem.locations);
					if (locIdx == -1) { // Location does not exist yet
						$scope.locations.push(elem.locations);
						$scope.locationsMoviesIdx.push([itMovies]);
						locIdx = $scope.locations.length - 1;
					} else { // Location exists, adding pointer
						$scope.locationsMoviesIdx[locIdx].push(itMovies);
					}
				}
			
				// This row corresponds to a new movie
				if(i == 0 || elem.title != $scope.movies[itMovies -1].title || elem.release_year != $scope.movies[itMovies -1].release_year){
					elem.index = itMovies;
					
					// Modifying location information to contain an array
					if(elem.locations != null){
						elem.locations = [elem.locations];
						elem.locationsIdx = [locIdx]; // Stores pointers to $scope.locations for that movie 
						elem.fun_facts = [elem.fun_facts];
					} else {
						elem.locations = [];
						elem.locationsIdx = [];
						elem.fun_facts = [];
					}
					$scope.movies.push(elem);
					itMovies = itMovies + 1;
				} else if(elem.locations != null) { // Same movie as previous row
					$scope.movies[itMovies -1].locations.push(elem.locations);
					$scope.movies[itMovies -1].locationsIdx.push(locIdx);
					$scope.movies[itMovies -1].fun_facts.push(elem.fun_facts);
				}
			}
		
			// Initialize the markers
			for (var i = 0; i < $scope.locations.length; i++){
				// Look for coordinates in the geocoding table, otherwise pre-set
				var thislat = 37.80;
				var thislng = -122.33;
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
		
			// We are done, with success!
			$scope.sucessful = true;
			$scope.infoText = "Sucess";
		
		}, function(respGeo) { // Loading geocoding failed
			$scope.infoText = "Error loading data: " + respGeo.statusText;
		});
		

	}, function(respData) { // Loading movie database failed
		$scope.infoText = "Error loading data: " + respData.statusText;
	});
	
	// Updating the results of the search when the search term is changed
	$scope.$watch('searchQuery', function(newVal,oldVal){

		if($scope.searchQuery){ // Searching for something
			var searchQueryNoParenthesis = $scope.searchQuery.replace(/[()]/g, '')
			$scope.results = $scope.fuse.search(searchQueryNoParenthesis);
			
			// Check in the next loop if the selected movie is still in the list of results, otherwise we de-select it
			var removeSelected = true;
			
			// Updating the markers (hiding those not in the results)
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
			// Show the markers in toShow
			for(var i = 0; i < toShow.length; i++){
				$scope.markers[toShow[i]].setMap($scope.map);		
			}
		
			// toHide: all markers except those to Show
			var toHide = Array.apply(null, {length: $scope.markers.length}).map(Number.call, Number)
			toHide = toHide.filter( function( el ) {
				return toShow.indexOf( el ) < 0;
			});
			// Hide them
			for(var i = 0; i < toHide.length; i++){
				$scope.markers[toHide[i]].setMap(null);
			}
			
		} else { // Searching for nothing
			$scope.results = [];
			
			// Show all markers
			for(var i = 0; i < $scope.markers.length; i++){
				$scope.markers[i].setMap($scope.map);		
			}
		}
		
	});
	
	// Changing colors and numbers of markers when a movie is selected
	$scope.$watch('selected',function(newVal,oldVal){

		if (oldVal != null){ // Set the markers of previous selected to normal
			var selectedMovieLocs = $scope.movies[oldVal].locationsIdx;
			for (var m = 0; m < selectedMovieLocs.length; m++){
				var locIdx = selectedMovieLocs[m];
				$scope.markers[locIdx].setIcon($scope.markerImg);
			}
		}
		
		if (newVal != null){ // Put big markers for selected ones
			var selectedMovieLocs = $scope.movies[newVal].locationsIdx;
			for (var m = 0; m < selectedMovieLocs.length; m++){
				var locIdx = selectedMovieLocs[m];
				$scope.markers[locIdx].setAnimation(null);
				$scope.markers[locIdx].setIcon('markers/icon-big-' + (m+1).toString() + '.png');
			}
		}
	});
    
	// When click on a movie in the list, display information
	$scope.click = function(index){
		if($scope.selected == index){
			$scope.selected = null;
		} else {
			$scope.selected = index;
		}
	};
	
	// Make the markers bounce when mouse is over a movie
	$scope.hoverIn = function(index){
		if (index != $scope.selected){
			var indices = $scope.movies[index].locationsIdx;
			for(var i = 0; i < indices.length ; i++){
				$scope.markers[indices[i]].setAnimation(google.maps.Animation.BOUNCE);
			}
		}
	};
	
	// Make the markers stop bouncing when mouse is gone
	$scope.hoverOut = function(index){
		var indices = $scope.movies[index].locationsIdx;
		for(var i = 0; i < indices.length ; i++){
			$scope.markers[indices[i]].setAnimation(null);
		}
	};
    
});

// Underlines the search term in the string
app.filter('highlight', function($sce) {
  return function(text, phrase) {
    if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'),
      '<u>$1</u>')

    return $sce.trustAsHtml(' ' + text)
  }
})

// Finds the elements in an array of strings matching the search term and underlines it
app.filter('highlightArray', function($sce) {
	return function(array, phrase) {
		var text = '';
		if(phrase){
			words = phrase.split(" ");
			for (var i = 0; i< array.length; i++){
				var loc = array[i];
				
				// First check if full sentense is inside
				if(loc.toLowerCase().indexOf(phrase.toLowerCase()) != -1){
					loc = loc.replace(new RegExp('('+phrase+')', 'gi'),'<u>$1</u>')
					
					if(text == ''){
						text = text + loc;
					} else {
						text = text + ', ' + loc;
					}
				} else { // Check if all the words are inside separately
					var inside = true;
					for(var j = 0; j < words.length; j++){
						if(loc.toLowerCase().indexOf(words[j].toLowerCase()) == -1){
							inside = false;
						}
					}
					if(inside){
						for(var j = 0; j < words.length; j++){
							var word = words[j];
							loc = loc.replace(new RegExp('('+word+')', 'gi'), '<u>$1</u>')
						}
						if(text == ''){
							text = text + loc;
						} else {
							text = text + ', ' + loc;
						}
					}
				}
			}
			
			
		}

    	return $sce.trustAsHtml(' ' + text)
  }
})

