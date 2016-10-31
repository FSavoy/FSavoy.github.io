var app = angular.module('sfFilming', []);

app.controller('moviesCtrl', function($scope, $http) {
	$scope.sucessful = false;
	$scope.infoText = "Loading...";	
	$scope.selected = null;
	$scope.searchQuery = "";
	
	$http.get("https://data.sfgov.org/resource/wwmu-gmzc.json")
	.then(function(response) {
		var retrieved = response.data;
		retrieved.sort(function(a, b) {
			return [a.title, a.release_year].join().localeCompare([b.title, b.release_year].join());
		});
		
		$scope.movies = [];
		
		//Merging same movies with several locations and associated fun facts
		var it = 0;
		for (var i = 0; i< retrieved.length; i++) {
			var elem = retrieved[i];
			if(i == 0 || elem.title != $scope.movies[it -1].title || elem.release_year != $scope.movies[it -1].release_year){
				elem.index = it;
				elem.locations = [elem.locations];
				elem.fun_facts = [elem.fun_facts];
				$scope.movies.push(elem);
				it = it + 1;
			} else {
				$scope.movies[it -1].locations.push(elem.locations);
				$scope.movies[it -1].fun_facts.push(elem.fun_facts);
			}
		}
		
		$scope.sucessful = true;
		$scope.infoText = "Sucess";
		$scope.selected = 0;
	}, function(response) {
		$scope.infoText = "Error loading data: " + response.statusText;
	});
    
	$scope.click = function(index){
		if($scope.selected == index){
			$scope.selected = null;
		} else {
			$scope.selected = index;
		}
	};
    
	$scope.filterFct = function(m){
		if ($scope.searchQuery.length < 2){
			return true;
		}
    	 	
		var concatElems = [m.title, m.locations.join(), m.release_year, m.production_company, m.distributor, m.director, m.writer, m.actor_1, m.actor_2, m.actor_3].join().toLowerCase();
		if (concatElems.indexOf($scope.searchQuery.toLowerCase()) == -1){
			return false;
		} else {
			return true;
		}
	};
});
