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
    const RETURN_COMBINATION_END = 100;
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

    $scope.combinations_data = [];
    $scope.coinList = [];


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

        });

    };
    $scope.getCoinList();


    $scope.getInvestment = function() {
      return INVESTMENT;
    };
    $scope.time = {
      addDay: function(t) {
        return moment(t).add(1, 'days').valueOf();
      },
      addMonth: function(t) {
        return moment(t).add(1, 'months').valueOf();
      },
      addYear: function(t) {
        return moment(t).add(1, 'years').valueOf();
      },
      subDay: function(t) {
        return moment(t).subtract(1, 'days').valueOf();
      },
      subMonth: function(t) {
        return moment(t).subtract(1, 'months').valueOf();
      },
      subYear: function(t) {
        return moment(t).subtract(1, 'years').valueOf();
      },
    };

    $scope.createMarginCombinations = function() {
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

    $scope.combinations = $scope.createMarginCombinations();

    $scope.dataSet = [];

    $scope.getDataPolo = function(crypto = $scope.form.crypto, start = $scope.form.start_date, end = 9999999999) {

      var req = {
        method: 'GET',
        url: 'https://poloniex.com/public?command=returnChartData&currencyPair=USDT_' + crypto + '&start=' + moment(start).unix() + '&end=9999999999&period=86400',
        headers: {
          'Content-Type': '*',
          'Access-Control-Allow-Origin': '*',
        }
      }

      $http(req)
        .then(function(response) {

          $scope.dataSet = _.map(response.data, function(day) {
            day.price = day.weightedAverage;
            return _.pick(day, 'date', 'price', 'volume')
          })
        });
    };
    $scope.resetStorage = function() {
      StorageService.resetStorage();
    };
    $scope.getDataCrypto = function(crypto = $scope.form.crypto) {
      var deferred = $q.defer();
      var storage = StorageService.getStorage(crypto);

      if (storage && storage.length) {
        $scope.dataSet = storage;
        deferred.resolve(storage);
        return storage;
      }
      var req = {
        method: 'GET',
        url: 'https://min-api.cryptocompare.com/data/histoday?fsym=' + crypto + '&tsym=USD&allData=true'
      };

      $http(req)
        .then(function(response) {

          var dataSet = _.map(response.data.Data, function(day) {

            day.date = day.time * 1000;
            day.price = (day.open + day.close) / 2;
            day.volume = (day.volumefrom + day.volumeto) / 2;

            return _.pick(day, 'time', 'price', 'volume')
          })

          StorageService.setStorage(crypto, dataSet);
          deferred.resolve();

        }, function(error) {

        });
      return deferred.promise;
    };

    $scope.traverseAllModels = function(crypto = $scope.form.crypto) {
      var combinations_data = [];

      $scope.combinations.forEach(function(model) {
        combinations_data.push(traverseModel(model.ret, model.reb));
      });

      combinations_data.sort(function(a, b) { return (a.funds > b.funds) ? 1 : ((b.funds > a.funds) ? -1 : 0); });
      $scope.analysis[crypto] = combinations_data.reverse().slice(0, 5);

      return combinations_data;

    };
    $scope.traverseAllModelsAndCoins = function() {

      var promiseChain = $q.when();

      $scope.coinList.forEach(function(coin) {
        promiseChain = promiseChain.then(function() {
          return $scope.getDataCrypto(coin);
        }, function() {
          return $scope.getDataCrypto(coin);
        });
      });

      promiseChain = promiseChain.finally(function(response) {
          $scope.coinList.forEach(function (crypto) {
            $scope.traverseAllModels(crypto);
          });
      });

    };

    function traverseModel(ireturn, irebuy, data) {

      bought_at = 0;
      sold_at = 0;
      portfolio = INVESTMENT + 0;
      usd_wallet = 0;
      btc_wallet = 0;

      let mode = "buy";
      // let mode = "sell";

      usd_wallet = INVESTMENT + 0;

      // Init buy
      $scope.buy(data[0].date, data[0].price, usd_wallet);

      mode = "sell";

      data.forEach(function(day) {
        if (mode === "sell") {

          if (day.price >= bought_at * ireturn) {
            $scope.sell(day.date, day.price, btc_wallet);
            mode = "buy"
          };

        } else {
          if (day.price <= sold_at / irebuy) {
            $scope.buy(day.date, day.price, usd_wallet);
            mode = "sell"
          };
        }
      });

      if (btc_wallet > 0) {
        $scope.sell(data[data.length - 1].date, data[data.length - 1].price, btc_wallet)
      };

      $scope.combinations_data.push({ "ret": ireturn, "reb": irebuy, "funds": +usd_wallet.toFixed(2) })

    };

    $scope.buy = function(date, price, funds) {
      var entry = {
        "entry": "buy",
        "date": date,
        "price": price,
        "funds": funds,
        "amount": funds / price,
      };
      bought_at = price;
      portfolio = funds;
      usd_wallet = 0;
      btc_wallet = funds / price;
      return entry;
    };

    $scope.sell = function(date, price, amount) {
      var entry = {
        "entry": "sell",
        "date": date,
        "price": price,
        "funds": price * amount,
        "amount": amount,
      };
      sold_at = price;
      portfolio = price * amount;
      usd_wallet = price * amount;
      usd_wallet = +usd_wallet.toFixed(2);
      btc_wallet = 0;
      return entry;
    };

  });
