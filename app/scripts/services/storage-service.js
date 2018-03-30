'use strict';

/**
Configurator service containt functions calling the remote actions
*/
angular.module('cryptoStatsApp')
  .config(function(localStorageServiceProvider) {
    localStorageServiceProvider
      .setPrefix('crypto');

  })
  .service('StorageService', function(localStorageService) {

    // Setting local storage for this offer
    // $localStorage[SharedService.activeOffer.id] = $localStorage[SharedService.activeOffer.id] || {};

    var mainKey, data;

    function init(key) {
      key = mainKey = key;
      data = localStorageService.get(key) || {};
      localStorageService.set(key, data);
      return data;
    };
    // Rewritten for tests....
    init("history");

    return {
      storage: localStorageService,
      init: init,
      setStorage: function(key, val, expire) {
        data[key] = val;
        expire = expire || 60;
        if (!this.storage.set(mainKey, data) || val === undefined) {
          console.error("Storage full or invalid value! Reseting and trying again.");
          this.resetStorage();
          return this.storage.set(mainKey, data, expire);
        }
        return true;
      },
      getStorage: function(key) {
        var returnData = this.storage.get(mainKey);
        if (returnData && returnData[key]) {
          return returnData[key];
        } else {
          return false;
        }
      },
      resetStorage: function() {
        this.storage.clearAll();
      },
    };
  });
