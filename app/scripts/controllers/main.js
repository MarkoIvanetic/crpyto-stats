'use strict';

/**
 * @ngdoc function
 * @name cryptoStatsApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the cryptoStatsApp
 */
angular.module('cryptoStatsApp')
  .controller('MainCtrl', function($scope, $http, $q, StorageService) {

    const DATE_FORMAT = "DD/MM/YYYY";
    const INVESTMENT = 100;

    const RETURN_COMBINATION_START = 2;
    const RETURN_COMBINATION_END = 200;
    const RETURN_COMBINATION_STEP = 0.5;

    const REBUY_COMBINATION_START = 1;
    const REBUY_COMBINATION_END = 5;
    const REBUY_COMBINATION_STEP = 0.05;

    let data = [];
    let transactions = [];

    let bought_at = 0;
    let sold_at = 0;

    let portfolio = INVESTMENT + 0;

    let usd_wallet = 0;
    let btc_wallet = 0;

    $scope.modelRunResults = [];

    $scope.coinList = [];
    $scope.coinData = {};
    $scope.analysis = {};

    $scope.form = {
      'start_date': moment().subtract(2, 'years').valueOf(),
      'crypto': 'BTC'
    };

    console.log("INIT");

    $scope.getCoinList = function() {
      // https://www.cryptocompare.com/api/data/coinlist/

      var req = {
        method: 'GET',
        url: 'https://api.coinmarketcap.com/v1/ticker/?limit=50',
        headers: {
          'Content-Type': '*',
          'Access-Control-Allow-Origin': '*'
        }
      }

      $http(req)
        .then(function(response) {
          response = response.data;
          $scope.coinList = _.pluck(response, 'symbol');
          StorageService.setStorage('list', $scope.coinList);

        });
    };

    // Get coin List
    $scope.coinList = StorageService.getStorage("list");

    if (!$scope.coinList) {
      $scope.getCoinList();
    };

    $scope.getInvestment = function() {
      return INVESTMENT;
    };

    // $scope.time = {
    //   addDay: function(t) {
    //     return moment(t).add(1, 'days').valueOf();
    //   },
    //   addMonth: function(t) {
    //     return moment(t).add(1, 'months').valueOf();
    //   },
    //   addYear: function(t) {
    //     return moment(t).add(1, 'years').valueOf();
    //   },
    //   subDay: function(t) {
    //     return moment(t).subtract(1, 'days').valueOf();
    //   },
    //   subMonth: function(t) {
    //     return moment(t).subtract(1, 'months').valueOf();
    //   },
    //   subYear: function(t) {
    //     return moment(t).subtract(1, 'years').valueOf();
    //   },
    // };

    $scope.createModels = function() {
      let return_options = [];
      let rebuy_options = [];
      let combinations = [];

      for (var i = RETURN_COMBINATION_START; i < RETURN_COMBINATION_END; i += RETURN_COMBINATION_STEP) {
        return_options.push(i);
      };

      for (var i = REBUY_COMBINATION_START; i < REBUY_COMBINATION_END; i += REBUY_COMBINATION_STEP) {
        rebuy_options.push(i);
      };

      for (var i = 0; i < return_options.length; i++) {

        for (var j = 0; j < rebuy_options.length; j++) {
          combinations.push({
            "ret": +return_options[i].toFixed(2),
            "reb": +rebuy_options[j].toFixed(2)
          });
        }
      };

      return combinations;
    };

    $scope.combinations = $scope.createModels();

    $scope.resetStorage = function() {
      StorageService.resetStorage();
    };

    $scope.getDataCrypto = function(crypto = $scope.form.crypto) {
      var deferred = $q.defer();
      var storage = StorageService.getStorage(crypto);

      if (storage) {
        $scope.coinData[crypto] = storage;
        deferred.resolve(storage);
      } else {

        var req = {
          method: 'GET',
          url: 'https://min-api.cryptocompare.com/data/histoday?fsym=' + crypto + '&tsym=USD&allData=true',
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000'
          },
        };

        $http(req)
          .then(function(response) {

            var dataSet = _.map(response.data.Data, function(day) {
              day.date = day.time * 1000;
              delete day.time;
              return day;
            })

            // StorageService.setStorage(crypto, dataSet);

            $scope.coinData[crypto] = dataSet;
            deferred.resolve(dataSet);

          }, function(error) {

          });
      }

      return deferred.promise;
    };

    $scope.getAllCoinData = function() {

      if (!$scope.coinList.length) {
        return false;
      };

      var deferred = $q.defer();

      var promiseChain = $q.when();

      $scope.coinList.forEach(function(coin) {
        promiseChain = promiseChain.then(function() {
          return $scope.getDataCrypto(coin);
        }, function() {
          return $scope.getDataCrypto(coin);
        });
      });

      promiseChain = promiseChain.finally(function(response) {
        console.log("Data loaded for " + $scope.coinList.length + " coins");
        deferred.resolve();
      });
      return deferred.promise;
    };

    $scope.runAllModels = function() {
      var modelRunResults = [];

      $scope.coinList.forEach(function(coin) {
        console.log("Analysing ", coin);
        if ($scope.coinData[coin] && $scope.coinData[coin].length) {
          $scope.combinations.forEach(function(model) {
            modelRunResults.push(runModelForCoin(model.ret, model.reb, $scope.coinData[coin]));
          });
          modelRunResults.sort(function(a, b) { return (a.funds > b.funds) ? 1 : ((b.funds > a.funds) ? -1 : 0); });
          $scope.analysis[coin] = modelRunResults.reverse().slice(0, 5);
          modelRunResults = [];
        }
      });


    };

    function runModelForCoin(ireturn, irebuy, data) {

      bought_at = 0;
      sold_at = 0;
      portfolio = INVESTMENT + 0;
      usd_wallet = 0;
      btc_wallet = 0;
      let trans_count = 0;

      let mode = "buy";
      // let mode = "sell";

      usd_wallet = INVESTMENT + 0;

      // Init buy
      buy(data[0].date, data[0].price, usd_wallet);

      mode = "sell";

      data.forEach(function(day) {

        if (mode === "sell") {

          if (day.price >= bought_at * ireturn) {
            sell(day.date, day.price, btc_wallet);
            mode = "buy"
          };

        } else {
          if (day.price <= sold_at / irebuy) {
            buy(day.date, day.price, usd_wallet);
            mode = "sell"
          };
        }

      });

      if (btc_wallet > 0) {
        sell(data[data.length - 1].date, data[data.length - 1].price, btc_wallet)
      };

      return { "ret": ireturn, "reb": irebuy, "funds": +usd_wallet.toFixed(2), "transactions": trans_count };


      function buy(date, price, funds) {
        var entry = {
          "entry": "buy",
          "date": date,
          "price": price,
          "funds": funds,
          "amount": funds / price,
        };
        bought_at = price;
        trans_count++;
        portfolio = funds;
        usd_wallet = 0;
        btc_wallet = funds / price;
        return entry;
      };

      function sell(date, price, amount) {
        var entry = {
          "entry": "sell",
          "date": date,
          "price": price,
          "funds": price * amount,
          "amount": amount,
        };
        sold_at = price;
        trans_count++;
        portfolio = price * amount;
        usd_wallet = price * amount;
        usd_wallet = +usd_wallet.toFixed(2);
        btc_wallet = 0;
        return entry;
      };

    };
    $scope.strategyList = ["static","rsi"];
    $scope.strategy = "static";
    $scope.applyStrategy =  function (day, data) {
      
    };
  });
