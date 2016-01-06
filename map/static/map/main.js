$(function() {

  swal({   title: "Mapping Smuggling Networks",   text: "Click on a country to start building your itinerary.",   type: "info",   confirmButtonText: "Got it!" });

  function Country (leafletMap, countryName, coordinates, polygonType) {
    // for some reason, we need to reverse the coordinates
    var reverseCoordinates = function(coordinates) {
      return coordinates.map(function reverse(item) {
        return Array.isArray(item) && Array.isArray(item[0])
          ? item.map(reverse)
          : item.reverse();
        });
    };

    var createPolygon = function() {
      if (polygonType === "Polygon") {
        return L.polygon(coordinates);
      }
      else {
        return L.multiPolygon(coordinates);
      }
    }
    
    this.getPolygonCenter = function () {
      return polygon.getBounds().getCenter();
    }

    var polygon = createPolygon();
    this.tripDetails = null;
    this.state = null;
    this.name = countryName;

    // Refactor code to delete this?
    this.setTripDetails = function(details) {
      this.tripDetails = details;
    }

    this.reversePolygon = function() {
      if (polygonType === "Polygon") {
        polygon = L.polygon(reverseCoordinates(coordinates), {clickable: false});
      }
      else {
        polygon = L.multiPolygon(reverseCoordinates(coordinates), {clickable: false});
      }

    }

    var highlight = function(style) {
      polygon.setStyle($.extend({
        dashArray: ''
      }, style));
      leafletMap.addLayer(polygon);
    };

    this.removeHighlight = function() {
      this.state = null;
      leafletMap.removeLayer(polygon);
    };

    this.highlightGreen = function() {
      this.state = 'green';
      highlight({
        color: 'green',
        weight: 2,
        fillOpacity: .1
      });
    };

    this.highlightRed = function() {
      this.state = 'red';
      highlight({
        color: 'red',
        weight: 2,
        fillOpacity: .1
      });
    };

    this.highlightGrey = function() {
      this.state = 'grey';
      highlight({
        color: '#666',
        weight: 2,
        fillOpacity: .2
      });
    }

    this.closePricePopUp = function() {
      leafletMap.closePopup()
    }

    this.addPricePopUp = function() {
      modesOfTransport = Object.keys(this.tripDetails).join().replace(/,/g, ", ")
      polygon.bindPopup("Modes of Transport to " + this.name + ": " + modesOfTransport, {offset: new L.Point(0, -30)}).openPopup();
    }
  };


  function Map() {
    var leafletMap = L.map('map').setView([41.505, 25.00], 3);
    var countries = {};
    var currentlySelectedCountry = null;
    var currentEndCountries = [];
    var trip = []
    var tripPolyline = null;

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'sophiasanchez.c3eddfe3',
        accessToken: 'pk.eyJ1Ijoic29waGlhc2FuY2hleiIsImEiOiJjaWdrMjB5NzgwMDlidWpsenRjbzBqb3p2In0.46Rk8ZSkTEtq0cK3nAJmfQ'
    }).addTo(leafletMap);

    var countryExists = function(countryName) {
      return countries.hasOwnProperty(countryName);
    };

    var forEachCountry = function(countryNames, callback) {
      for (var i = 0; i < countryNames.length; i++) {
        if (countryExists(countryNames[i])) {
          var country = countries[countryNames[i]];
          callback(country);
        }
      }
    };

    var drawTripLine = function() {
      if (this.tripPolyline != null) {
        leafletMap.removeLayer(this.tripPolyline);
      }
      pointList = [];
      for (var i = 0; i < trip.length; i++) {
        pointList.push(countries[trip[i].country].getPolygonCenter());
      }
      this.tripPolyline = L.polyline(pointList)
      this.tripPolyline.addTo(leafletMap);
      updateItinerary();
    }

    var updateItinerary = function() {
      var list = document.getElementById('itineraryList');
      $("ol").empty(); // probably would be better to just add and subtract specific items
      var totalCost = 0;
      if (trip.length > 0) {
        for (var i = 0; i < trip.length - 1; i++) {
          if (trip[i].cost != null) {
            totalCost += trip[i].cost;
          }
          var entry = document.createElement('li');
          mode = trip[i+1].mode
          entry.appendChild(document.createTextNode(trip[i].country + " --> " + trip[i+1].country + " by " + mode + " (" + trip[i+1].year + ")" +": $" + trip[i+1].cost));
          entry.style.fontWeight = 'bold';
          list.appendChild(entry);

          allYears = Object.keys(trip[i+1].previousYears).sort(function(a, b){return b-a});

          var unorderedList = document.createElement('ul');
          list.appendChild(unorderedList);

          for (var j = 0; j < allYears.length; j++) {
            currYear = allYears[j];
            currPrice = trip[i+1].previousYears[currYear];
            if (currYear != trip[i+1].year) {
              var entryTwo = document.createElement('li')
              entryTwo.appendChild(document.createTextNode(currYear + ": $" + currPrice));
              unorderedList.appendChild(entryTwo);
            }
          }
        }

        totalCost += trip[trip.length - 1].cost; // gets the last cost; might wanna change
        var totalCostP = document.createElement('p');
        totalCostP.appendChild(document.createTextNode("Total cost: $" + totalCost));
        list.appendChild(totalCostP);
      }
    }

    var selectStartCountry = function(startCountry) {
      if (!startCountry) { return; }

      if (currentlySelectedCountry != null && startCountry.state === 'grey') {
        return;
      }

      if (trip.length === 0) {
        trip.push({country: startCountry.name, cost: null});
      }
      if (startCountry.state === 'green') {
        transportation = Object.keys(startCountry.tripDetails);
        fullTripInfo = {};
        fullTripInfoButtons = [];

        for (var i = 0; i < transportation.length; i++) {
          years = Object.keys(startCountry.tripDetails[transportation[i]]);
          mostRecentYear = Math.max.apply(Math, years);
          cost = startCountry.tripDetails[transportation[i]][mostRecentYear];
          button = '<input class=\"visibleInput\" type=\"radio\" name=\"mode\" value=\"' + transportation[i] + '\">' + transportation[i] + ": $" + cost + " (" + mostRecentYear + ")" + '<br>'
          fullTripInfo[transportation[i]] = {cost: cost, year: mostRecentYear, previousYears: {}};

          for (var j = 0; j < years.length; j++) {
              if (years[j] != mostRecentYear) {
                costForThatYear = startCountry.tripDetails[transportation[i]][years[j]];
                fullTripInfo[transportation[i]].previousYears[years[j]] = costForThatYear;
              }
          }

          fullTripInfoButtons.push(button);
        }

        fullTripInfoButtons = fullTripInfoButtons.join().replace(/,/g, "");

        swal({
          title: "Mapping Smuggling Networks",
          text: "Please select a mode of transportation to " + startCountry.name + ":<br><br>" + fullTripInfoButtons,
          html: true,
          showCancelButton: true,
          closeOnCancel: true },
          function(isConfirm) {
            if (isConfirm) {
              mode = $('input[name="mode"]:checked').val();
              trip.push({country: startCountry.name, cost: fullTripInfo[mode]["cost"], mode: mode, year: fullTripInfo[mode]["year"], previousYears: fullTripInfo[mode].previousYears});
              drawTripLine();
            }
            else {
              return;
            }
        });


      }

      // If the user clicks on the red country, backtrack in the trip
      if (startCountry.state === 'red') {
        // Remove that country from trip, take that line out of the "Your Itinerary" list
        // Remove that point from the polyline, and make the previous country in trip the new red country
        trip.pop();
        drawTripLine();
        if (trip.length > 0) {
          previousCountry = trip[trip.length - 1].country;
          startCountry = countries[previousCountry];
        }
        else {
          currentlySelectedCountry.removeHighlight();
          forEachCountry(currentEndCountries, function(country) { country.removeHighlight() });
          startCountry = null;
          currentlySelectedCountry = null;
          return;
        }
        
      }

      if (currentlySelectedCountry) {
        currentlySelectedCountry.removeHighlight();
      }

      forEachCountry(currentEndCountries, function(country) { country.removeHighlight() });

      startCountry.highlightRed();
      currentlySelectedCountry = startCountry;

      ajaxCallName = startCountry.name
      if (ajaxCallName.indexOf(" ") > -1) {
        ajaxCallName = ajaxCallName.replace(/ /g, "-");
      }

      $.ajax({
        type: 'GET',
        url: '/map/query/' + ajaxCallName,
        success: function(reply) {
          endCountries = JSON.parse(reply);
          currentEndCountries = Object.keys(endCountries);
          forEachCountry(currentEndCountries, function(country) { country.highlightGreen(); country.setTripDetails(endCountries[country.name])});
        }
      });
    };

    var countryFromName = function(countryName) {
      if (!countryExists(countryName)) {
        return null;
      }
      return countries[countryName];
    };

    var countryFromEvent = function(e) {
      var countryName = e.target.feature.properties.name;
      return countryFromName(countryName);
    };

    var onCountryHighLight = function(e) {
      var country = countryFromEvent(e);

      if (!country) { return; }

      if (country.state === 'green') {
        country.addPricePopUp();
      }

      if (country.state === null) {
        country.highlightGrey();
        if (!L.Browser.ie && !L.Browser.opera) {
          e.target.bringToFront();
        }
      }
    };

    var onCountryMouseOut = function(e) {
      var country = countryFromEvent(e);

      if (!country) { return; }

      if (country.state === 'green') {
        country.closePricePopUp();
      }

      if (country.state === 'grey') {
        country.removeHighlight();
      }
    };

    var onCountryClick = function(e) {
      var country = countryFromEvent(e);
      selectStartCountry(country);
    };

    var cacheCountries = function() {
      d3.json(COUNTRIES_DATA_JSON_URL, function (json) {
        data = json.features;
        for (var i = 0; i < data.length; i++) {
          var countryName = data[i].properties.name;
          var polygonType = data[i].geometry.type;
          // takes care of countries with several islands, like Italy
          var countryCoordinates = []
          if (data[i].geometry.type === "MultiPolygon") {
            for (var j = 0; j < data[i].geometry.coordinates.length; j++) {
              countryCoordinates.push(data[i].geometry.coordinates[j]);
            }
          }
          else {
            countryCoordinates = data[i].geometry.coordinates[0];
          }
          var country = new Country(leafletMap, countryName, countryCoordinates, polygonType);
          countries[countryName] = country;
        }

        L.geoJson(json, {
          style:  {
            fillColor: "#E3E3E3",
            weight: 1,
            opacity: 0.4,
            color: 'white',
            fillOpacity: 0.3
          },
          onEachFeature: function(feature, layer) {
            countries[feature.properties.name].reversePolygon();
            layer.on({
              mouseover : onCountryHighLight,
              mouseout : onCountryMouseOut,
              click: onCountryClick
            });
          },
          onCountryMouseOut: onCountryMouseOut,
          onCountryClick: onCountryClick,
        }).addTo(leafletMap);
      });
    };
    cacheCountries();

    var resetMapVars = function() {
      currentlySelectedCountry = null;
      currentEndCountries = [];
      trip = []
      tripPolyline = null;
    }

    var clearMap = function() {
      if (currentlySelectedCountry === null) {
        return;
      }
      else {
        currentlySelectedCountry.removeHighlight();
        forEachCountry(currentEndCountries, function(country) { country.removeHighlight() });
        if (this.tripPolyline != null) {
          leafletMap.removeLayer(this.tripPolyline);
        }
        $("ol").empty();
      }
    }

    this.clear = function() {
      clearMap();
      resetMapVars();
    }

  };

  myMap = new Map();

$('#startOver').click(startOver)
$('#endTrip').click(endTrip)

function startOver() {
  myMap.clear();
}

function endTrip() {
    swal({   title: "Mapping Smuggling Networks",   text: "You have ended your trip.",   type: "info",   confirmButtonText: "Got it!" });
    myMap.clear();
}

});



