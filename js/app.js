var map;

// This global polygon variable is to ensure only ONE polygon is rendered.
var polygon = null;

function initMap() {
	console.log("debug inside the initmap")
		//The predefined restaurant categrory
	var restaurantCate = ["Sushi", "Chinese Food", "Coffee"];

	// Constructor creates a new map - only center and zoom are required.
	map = new google.maps.Map(document.getElementById('map'), {
		center: {
			lat: 40.7413549,
			lng: -73.9980244
		},
		zoom: 13,
		//styles: styles,
		mapTypeControl: false
	});

	// The default marker icon style.
	var defaultIcon = makeMarkerIcon('42f44e');
	// The animated marker icon style when selected.
	var highlightedIcon = makeMarkerIcon('f44242');
	// The information window will display when a marked is clicked
	var largeInfowindow = new google.maps.InfoWindow();

	// the LocationMarker function for creating new location marker object
	var LocationMarker = function (loc) {
		var newMarker = new google.maps.Marker({
			map: map,
			position: loc["location"],
			title: loc["title"],
			id: loc["id"],
			animation: google.maps.Animation.DROP,
			icon: defaultIcon,
		});
		newMarker.addListener("mouseover", function () {
			this.setIcon(highlightedIcon);
		});
		newMarker.addListener("mouseout", function () {
			this.setIcon(defaultIcon);
		});
		newMarker.addListener("click", function () {
			//populateInfoWindow(this, largeInfowindow);
			myViewModel.updateListViewDetail(this.id);
		});
		return newMarker;
	};

	// the Location function for creating new location Knockout object 
	var Location = function (loc) {
		return ko.observable(loc);
	};

	//the locatoinViewModel is the view model part for this application
	var locationViewModel = function () {

		var self = this;
		self.categoryList = ko.observableArray(restaurantCate);
		self.locationList = ko.observableArray([]);
		self.locationMarkerList = [];
		self.currentitem;
		self.filterTarget = ko.observable();
		self.currentCate;
		//initialize the location data and marker data
		queryFoursquare().done(function (result) {
			if (result["response"]["venues"].length !== 0) {
				var alldata = makeResult(result);
				self.locationList(alldata[0]);
				self.locationMarkerList = alldata[1];
				self.currentCate = "Sushi";
			} else {
				alert("No data Available.");
			}
		}).fail(function () {
			alert("Query Foursqure API data failed.");
		});

		self.showDetail = function () {
			if (self.currentitem !== undefined && self.currentitem !== this) {
				self.currentitem.isShowDetail(false);
			};
			var markerIndex = self.locationList().indexOf(this);
			populateInfoWindow(self.locationMarkerList[markerIndex], largeInfowindow);
			this.isShowDetail(true);
			self.currentitem = this;
		};
		self.updateListViewDetail = function (id) {
			if (self.currentitem !== undefined && self.currentitem.id !== id) {
				self.currentitem.isShowDetail(false);
			};
			populateInfoWindow(self.locationMarkerList[id], largeInfowindow);
			self.locationList()[id].isShowDetail(true);
			self.currentitem = self.locationList()[id];
		};
		//change the marker icon style when mouse over the list item
		self.enableHighlight = function () {
			var markerIndex = self.locationList().indexOf(this);
			self.locationMarkerList[markerIndex].setIcon(highlightedIcon);
		};
		//change the marker icon style when mouse out the list item
		self.disableHighlight = function () {
			var markerIndex = self.locationList().indexOf(this);
			self.locationMarkerList[markerIndex].setIcon(defaultIcon);
		};
		//query the restaurant candidate by Foursqure
		self.queryRestaurant = function () {
			if (this.toString() !== self.currentCate) {
				removeAllMarker(self.locationMarkerList);
				queryFoursquare(this).done(function (result) {
					if (result["response"]["venues"].length !== 0){
						var alldata = makeResult(result);
						self.locationList(alldata[0]);
						self.locationMarkerList = alldata[1];
					} else {
						alert("No data available.");
					}
				}).fail(function () {
					alert("Query Foursqure API data failed.");
				});
				self.currentCate = this.toString();
			};

		};
		//Filter the location list and marker list by filter input
		self.filterLocation = function (data, event) {
			for (var i = 0; i < self.locationList().length; i++) {
				if (!self.locationList()[i].title.includes(self.filterTarget())) {
					self.locationList()[i].isFilteredIn(false);
					//self.locationMarkerList[i].setMap(null);
					self.locationMarkerList[i].setVisible(false);
				} else {
					self.locationList()[i].isFilteredIn(true);
					self.locationMarkerList[i].setVisible(true);
				}
			}

		};
		self.hideMarker = function () {
			self.locationMarkerList.forEach(function (eachmarker) {
				console.log("hide...new")
				eachmarker.setMap(null);
			});
		};
	};

	//activate the  view-model
	var myViewModel = new locationViewModel();
	ko.applyBindings(myViewModel);

	//This function will clear all the markers on the map
	function removeAllMarker(data) {
		data.forEach(function (each) {
			each.setMap(null);
		});
	}
	//This function convert the query data to location array and google map marker array
	//This function can be re-used in different cases in the app
	function makeResult(data) {
		var result = [];
		var result_marker = [];
		var bounds = new google.maps.LatLngBounds();
		var i = 0;
		data["response"]["venues"].forEach(function (eachvenue) {
			var temp_loc = {
				title: eachvenue["name"],
				location: {
					lat: eachvenue["location"]["lat"],
					lng: eachvenue["location"]["lng"]
				},
				address: "<strong>Address: </strong>" + eachvenue["location"]["formattedAddress"].join(),
				phone: "<strong>Phone: </strong>" + eachvenue["contact"]["formattedPhone"],
				isShowDetail: ko.observable(false),
				isFilteredIn: ko.observable(true),
				id: i
			};
			i++;
			result.push(temp_loc);
			var newMarker = new LocationMarker(temp_loc)
			bounds.extend(newMarker.position);
			result_marker.push(newMarker);
		});
		map.fitBounds(bounds);
		return [result, result_marker];
	};

	// This function make AJAX call to foursquare API
	//This function can be re-used in different cases in the app
	function queryFoursquare(query) {
		var foursquare_url = "https://api.foursquare.com/v2/venues/search";
		var Client_ID = "T3A2F5ZKOVEDWXZXLHFFNPU3DYTYIUZGPJELBWLJZVQFTALA";
		var Client_Secret = "IM2R2QRHZR0CIOGCLYKGTOSBEPERM1JVA0X022CY3B4ZX41P";
		query = query || "Sushi";
		foursquare_url += "?client_id=" + Client_ID + "&client_secret=" + Client_Secret + "&v=20130815" + "&ll=40.7413549,-73.9980244" + "&query=" + query;
		return $.getJSON(foursquare_url);

	};


	//google.maps.event.trigger(map, 'resize');
	google.maps.event.addDomListener(window, "resize", function () {
		console.log("hi");
		var center = map.getCenter();
		google.maps.event.trigger(map, "resize");
		map.setCenter(center);
	});
}

console.log("debug...outside the initmap")


//This function populates the infowindow when the marker or the list item is clicked.
//Only one infowindow is allowed and will open at the marker that is clicked.
function populateInfoWindow(marker, infowindow) {
	//animate the clicked marker to make it bounce once
	marker.setAnimation(google.maps.Animation.BOUNCE);
	setTimeout(function () {
		marker.setAnimation(null)
	}, 750);
	// Check to make sure the infowindow is not already opened on this marker.
	if (infowindow.marker != marker) {
		// Clear the infowindow content to give the streetview time to load.
		infowindow.setContent('');
		infowindow.marker = marker;
		// Make sure the marker property is cleared if the infowindow is closed.
		infowindow.addListener('closeclick', function () {
			infowindow.marker = null;
		});
		var streetViewService = new google.maps.StreetViewService();
		var radius = 50;
		// In case the status is OK, which means the pano was found, compute the
		// position of the streetview image, then calculate the heading, then get a
		// panorama from that and set the options
		function getStreetView(data, status) {
			if (status == google.maps.StreetViewStatus.OK) {
				var nearStreetViewLocation = data.location.latLng;
				var heading = google.maps.geometry.spherical.computeHeading(
					nearStreetViewLocation, marker.position);
				infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');
				var panoramaOptions = {
					position: nearStreetViewLocation,
					pov: {
						heading: heading,
						pitch: 30
					}
				};
				var panorama = new google.maps.StreetViewPanorama(
					document.getElementById('pano'), panoramaOptions);
			} else {
				infowindow.setContent('<div>' + marker.title + '</div>' +
					'<div>No Street View Found</div>');
			}
		}
		// Use streetview service to get the closest streetview image within
		// 50 meters of the markers position
		streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
		// Open the infowindow on the correct marker.
		infowindow.open(map, marker);
	}
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
	var markerImage = new google.maps.MarkerImage(
		'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
		'|40|_|%E2%80%A2',
		new google.maps.Size(21, 34),
		new google.maps.Point(0, 0),
		new google.maps.Point(10, 34),
		new google.maps.Size(21, 34));
	return markerImage;
}

function googleError(){
	alert("The Google Map API can't be loaded.");
}