      function initMap() {

			$.getJSON("movies.json", function(json) {
		
        var map = new google.maps.Map(document.getElementById('map'), {
          zoom: 11,
          center: {lat: 37.80, lng: -122.33},
        });
        var geocoder = new google.maps.Geocoder();


        // Add some markers to the map.
        // Note: The code uses the JavaScript Array.prototype.map() method to
        // create an array of markers based on a given "locations" array.
        // The map() method here has nothing to do with the Google Maps API.
        function createMarkers() {
         var markers = [];
        	json['data'].forEach(function(movie, i) {
          geocoder.geocode( { 'address': movie[10]}, function(results, status) {
      			if (status == 'OK') {
        				markers.push(new google.maps.Marker({
            position: results[0].geometry.location,
            map: map,
            title: movie[8]
        }));
      } else {
        console.log('Geocode was not successful for the following reason: ' + status);
      }
    });

        });
        
        return markers;
        };
        
        //createMarkers();

        // Add a marker clusterer to manage the markers.
        //var markerCluster = new MarkerClusterer(map, createMarkers(),
        //    {imagePath: 'markerclusterer/m'});
        //    
        });
      }