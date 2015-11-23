$(function() {
  var map = L.map('map').setView([41.505, 25.00], 3);

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'sophiasanchez.c3eddfe3',
      accessToken: 'pk.eyJ1Ijoic29waGlhc2FuY2hleiIsImEiOiJjaWdrMjB5NzgwMDlidWpsenRjbzBqb3p2In0.46Rk8ZSkTEtq0cK3nAJmfQ'
  }).addTo(map);

  function Country (name, coordinates) {
    this.name = name;
    this.coordinates = coordinates;
    this.selected = false;

    this.highlight = function(color, weight, fillOpacity, layerGroup) {
      layerGroup.addLayer(self.coordinates);
      self.coordinates.setStyle({
        weight: weight,
        color: color,
        dashArray: '',
        fillOpacity: fillOpacity,
      });
    }
  }

  function Map() {

    this.selectStartCountry = function(countryName) {
      var layerGroup = L.layerGroup();
      highlightCountries([countryName], ['red', 2, .7], layerGroup);
      $.ajax({
        type: 'GET',
        url: '/map/query/' + countryName,
        success: function(reply) {makeEndCountriesGreen(reply, layerGroup)}
      });
    };

    this.makeEndCountriesGreen = function(reply, layerGroup) {
        endCountries = JSON.parse(reply);
        highlightCountries(endCountries, ['green', 2, .1], layerGroup);
        layerGroup.addTo(map);
        if (!L.Browser.ie && !L.Browser.opera) {
          layerGroup.bringToFront();
        }
    };

    highlightCountries = function(countryNames, highlightStyle) {
      for (var i = 0; i < countryNames.length; i++) {
        if (this.countries.hasOwnProperty(countryNames[i])) {
          country = this.countries[countryNames[i]];
          var layerGroup = L.layerGroup();
          country.highlight(highlightStyle, highlightStyle[0], highlightStyle[1], highlightStyle[2], layerGroup);
        }
      }
    };

    this.cacheCountries = function() {
      var countries = {};
      d3.json(COUNTRIES_DATA_JSON_URL, function (json){
        data = json.features;
        for (var i = 0; i < data.length; i++) {
          name = data[i].properties.name;
          coordinates = data[i].geometry.coordinates[0];
          country = new Country(name, coordinates);
          countries[name] = country;
        }
        this.countries = countries;
        geojson = L.geoJson(json, {
            onEachFeature: onEachFeature,
            style : style
            }).addTo(map);

      function onEachFeature(feature, layer){
          layer.on({
          mouseover : onCountryHighLight,
        });
        }
    });
    }

    style = function(feature) {
      return {
        fillColor: "#E3E3E3",
        weight: 1,
        opacity: 0.4,
        color: 'white',
        fillOpacity: 0.3
      }
    };

    this.cacheCountries();
}

function onCountryHighLight(e){
  var name = e.target.feature.properties.name;
  if (e.target.feature.properties.name == "change this to currentlySelectedCountry") {
    highlightCountries([name], ['red', 2, .7])
  }
  else {e.target.feature.properties.name in 
    highlightCountries([name], ['#666', 2, .7])
  }
  if (!L.Browser.ie && !L.Browser.opera) {
    e.target.bringToFront();
  }
}

  function Trip() {
    this.drawTripLine = function(){};
  }




myMap = new Map();


function reverseCoordinates(coordinates) {
    return coordinates.map(function reverse(item) {
      return Array.isArray(item) && Array.isArray(item[0]) 
        ? item.map(reverse) 
        : item.reverse();
      });
  } 



function changeCountryColor(layer, weight, color, fillOpacity) {
    return layer.setStyle({
      weight: weight,
      color: color,
      dashArray: '',
      fillOpacity: fillOpacity,
    });
  }

/*

  var currentlySelectedCountry = null;
  var currentTarget = null;
  var endCountries = {};
  var latlngs = Array();
  var polylines = [];
  var polylineLayergroup = L.layerGroup();

  // FIXME: cache the JSON, don't reload it every time
  d3.json(COUNTRIES_DATA_JSON_URL, function (json){

    function style(feature) {
      return {
        fillColor: "#E3E3E3",
        weight: 1,
        opacity: 0.4,
        color: 'white',
        fillOpacity: 0.3
      };
    }
    geojson = L.geoJson(json, {
      onEachFeature: onEachFeature,
      style : style
    }).addTo(map);

    function onEachFeature(feature, layer){
      layer.on({
        click : onCountryClick,
        mouseover : onCountryHighLight,
        mouseout : onCountryMouseOut
      });
    }
  });


  function onCountryHighLight(e){

    if (e.target.feature.properties.name == currentlySelectedCountry) {
      changeCountryColor(e.target, 2, 'red', .7)
    }
    else {e.target.feature.properties.name in 
      changeCountryColor(e.target, 2, '#666', .7)
    }

    if (!L.Browser.ie && !L.Browser.opera) {
      e.target.bringToFront();
    }

  }


  function onCountryMouseOut(e){
    geojson.resetStyle(e.target);

    if (currentTarget != null) {
      changeCountryColor(currentTarget, 2, 'red', .7)

      if (!L.Browser.ie && !L.Browser.opera) {
        currentTarget.bringToFront();
      }
    }
  }


  function onCountryClick(e){
    polylineLayergroup.clearLayers();
    polylneLayergroup = L.layerGroup();

    if (e.target.feature.properties.name == currentlySelectedCountry) {
      currentlySelectedCountry = null;
      currentTarget = null;
      geojson.resetStyle(e.target);
    }
    else {
      // deselect old country - could also potentially just use resetStyle
      if (currentTarget != null){
        changeCountryColor(currentTarget, 1, "#E3E3E3", .3)
      }

      // draw red border around selected country
      currentlySelectedCountry = e.target.feature.properties.name;
      currentTarget = e.target;
      changeCountryColor(currentTarget, 2, 'red', .7)

      // grab the data for that start country
      $.ajax({
        type: 'GET',
        url: '/map/query/' + currentlySelectedCountry,
        success: makeEndCountriesGreen()
      });
    }
  }

  function makeEndCountriesGreen() {
    return function(data) {
      endCountries = JSON.parse(data);

      // draw green border for possible end countries
      // this should really just be a lookup, not a for loop
        d3.json(COUNTRIES_DATA_JSON_URL, function (json){
          data = json.features;
          for (var i = 0; i < data.length; i++) {
            if (data[i].properties.name in endCountries) {
              coordinates = data[i].geometry.coordinates[0];

               // for some reason, we need to reverse the coordinates
              var reversed = reverseCoordinates(coordinates);
              myPolygon = L.polygon(reversed);
              latlngs.push(myPolygon);
              }
            }

            for (var i = 0; i < latlngs.length; i++) {
              changeCountryColor(latlngs[i], 2, 'green', .1)
              polylineLayergroup.addLayer(latlngs[i]);
            }

            polylineLayergroup.addTo(map);
            if (!L.Browser.ie && !L.Browser.opera) {
              currentTarget.bringToFront();
            }
            
            latlngs = Array();
          });
        }
  }

  function changeCountryColor(layer, weight, color, fillOpacity) {
    return layer.setStyle({
      weight: weight,
      color: color,
      dashArray: '',
      fillOpacity: fillOpacity,
    });
  }

  function reverseCoordinates(coordinates) {
    return coordinates.map(function reverse(item) {
      return Array.isArray(item) && Array.isArray(item[0]) 
        ? item.map(reverse) 
        : item.reverse();
      });
  } 
*/

});



