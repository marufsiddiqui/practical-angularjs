var app = angular.module("app", ['ngSanitize', 'ngResource', 'ngAnimate', 'ui.router']);

app.service("HearthstoneService", function($http) {
  var defaultUrl = '/api/cards';
  return {
    getCards: function(url) {
      return $http.get(url ? url : defaultUrl);
    }
  };
});


app.config(function($httpProvider) {

  $httpProvider.interceptors.push(function($location, $q, SessionService, FlashService) {
    return {
      response: function(response) {
        if(response.data.flash){
          FlashService.show(response.data.flash);
        }
        return response;
      },
      responseError: function(response) {
        if(response.data.error) {
          FlashService.show(response.data.error.message);
        }

        // handle session expiry
        if(response.status === 403) {
          SessionService.unset('authenticated');
          $location.path('/login');
        }

        return $q.reject(response);
      },
    };
  });

});

app.directive('cardEditor', function() {
  return {
    restrict: 'E',
    transclude: true,
    controllerAs: 'cardEditor',
    templateUrl: 'cardEditor.html',
    controller: function($scope) {
      console.log('cardEditor controller');
      var renderingOptions = {};

      this.setColumns = function(columns) {
        renderingOptions.columns = columns;
      };

      this.getColumns = function() {
        return renderingOptions.columns;
      };

      this.setInlineEditor = function(editor) {
        renderingOptions.editor = editor;
      };

      this.setRows = function(rows) {
        renderingOptions.rows = rows;
      };

      this.getRows = function() {
        return renderingOptions.rows;
      };

      this.getRenderingOptions = function() {
        return renderingOptions;
      };
    },
    link: function(scope, element, attrs, cardEditor) {
      console.log('linked card-editor');
    }
  };
});

app.directive('cardEditorColumns', function() {
  return {
    restrict: 'E',
    require: ['^cardEditor', 'cardEditorColumns'],
    controller: function($scope) {
      this.columns = [];
    },
    link: function(scope, element, attrs, controllers) {
      var cardEditor = controllers[0],
          cardEditorColumns = controllers[1];
      console.log('linked card-editor-columns');
      cardEditor.setColumns(cardEditorColumns.columns);
    }
  };
});

app.directive('column', function() {
  return {
    restrict: 'E',
    require: '^cardEditorColumns',
    controller: function($scope) {

    },
    link: function(scope, element, attrs, cardEditorColumns) {
      console.log('linked column', attrs.title);
      cardEditorColumns.columns.push({
        title: attrs.title,
        field: attrs.field
      });
    }
  };
});

app.directive('cardEditorRows', function(HearthstoneService) {
  return {
    restrict: 'E',
    require: '^cardEditor',
    controller: function($scope) {

    },
    link: function(scope, element, attrs, cardEditor) {
      console.log('linked card-editor-rows');
      HearthstoneService.getCards(attrs.source).then(function(response) {
        cardEditor.setRows(response.data.cards);
      });
    }
  };
});

app.directive('withInlineEditor', function() {
  return {
    restrict: 'A',
    require: '^cardEditor',
    controller: function($scope) {},
    link: function(scope, element, attrs, cardEditor) {
      console.log('linked with-inline-editor');
    }
  };

});



app.config(function($stateProvider, $urlRouterProvider, $locationProvider) {

  $locationProvider.html5Mode(true);

  $stateProvider.state('login', {
    templateUrl: 'login.html',
    controller: 'LoginController'
  });

  $stateProvider.state('home', {
    templateUrl: 'home.html',
    controller: 'HomeController'
  });

  $stateProvider.state('admin', {
    url: '/admin',
    templateUrl: 'admin.html',
    controller: 'AdminController'
    // resolve: {
    //   getCardsResponse: function (HearthstoneService) {
    //     return HearthstoneService.getCards();
    //   }
    // }
  });

  $stateProvider.state('decks', {
    url: '/decks',
    templateUrl: 'decks.html',
    controller: function($scope) {
      console.log('decks controller!');
    }
  });

  $stateProvider.state('list-of-books', {
    url: '/list-of-books',
    templateUrl: 'books.html',
    controller: 'BooksController',
    resolve: {
      books : function(BookService) {
        return BookService.get();
      }
    }
  });

  $stateProvider.state('$resource-list-of-books', {
    url: '/$resource/list-of-books',
    templateUrl: 'books_resource.html',
    controller: 'BooksResourceController'
  });

  $stateProvider.state('$http-list-of-books', {
    url: '/$http/list-of-books',
    templateUrl: 'books_http.html',
    controller: 'BooksHttpController',
    resolve: {
      books: function(BookService) {
        return BookService.get();
      }
    }
  });

  $stateProvider.state('cards', {
    url: '/cards',
    templateUrl: 'hearthstone.html',
    controller: 'HearthstoneController',
    resolve: {
      getCardsResponse: function (HearthstoneService) {
        return HearthstoneService.getCards();
      }
    }
  });

  $urlRouterProvider.otherwise('/login');

});

app.controller('AdminController', function($scope) {
  // $scope.cardDB = getCardsResponse.data.cards;
});

app.controller('HearthstoneController', function($scope, getCardsResponse) {

  // to demonstrate $broadcast
  // $scope.$on('search-query-changed', function(e, query) {
  //   $scope.searchQuery = query;
  // });

  $scope.cardDB = getCardsResponse.data.cards;
  $scope.pageSize = 8;
  $scope.currentPage = 0;
  $scope.totalPages  = 0;
  $scope.currentManaFilter = 'all';
  $scope.currentHeroFilter = 'neutral';
  $scope.heroFilterOptions = [
    {value: 'druid', label: 'Druid' },
    {value: 'hunter', label: 'Hunter' },
    {value: 'mage', label: 'Mage' },
    {value: 'paladin', label: 'Paladin' },
    {value: 'priest', label: 'Priest' },
    {value: 'rogue', label: 'Rogue' },
    {value: 'shaman', label: 'Shaman' },
    {value: 'warlock', label: 'Warlock' },
    {value: 'warrior', label: 'Warrior' },
    {value: 'neutral', label: 'Neutral' }
  ];

  $scope.canGoNext = function() {
    return $scope.currentPage < $scope.totalPages - 1;
  };

  $scope.canGoPrev = function() {
    return $scope.currentPage - 1 >= 0;
  };

  // ALL, 0, 1, 2, 3, 4, 5, 6, 7+
  $scope.manaFilterOptions = [
    {value: 'all', label: 'ALL'}
  ].concat(
    _(_.range(0,6)).map(function(i) {
      return {
        value: i,
        label: i
      };
    })
  ).concat(
    {value: 'seven-plus', label: '7 +' }
  );

  // the dataset has cards of types we don't want, like "hero" and "ability"
  // we also want the values sorted ascending which is the default that .sortBy gives us
  var filterCardsByManaCostAndHero = function(cards, cost, hero) {
    return _(filterCardsByHero(filterCardsByManaCost(cards, cost), hero)).chain().filter(function(card) {
      return _(["spell", "minion", "weapon", "secret"]).contains(card.category);
    }).sortBy(function(c) {
      return c.mana;
    }).value();
  };

  // also updates the current value of the mana filter so the styling can update
  var filterCardsByManaCost = function(cards, cost) {
    $scope.currentManaFilter = cost;
    if(cost === 'all') {
      return cards;
    } else if(cost === 'seven-plus') {
      return _(cards).filter(function(c) {
        return c.mana >= 7;
      });
    } else {
      return _(cards).where({mana: cost});
    }
  };

  // also updates the current value of the hero filter so the styling can update
  var filterCardsByHero = function(cards, hero) {
    $scope.currentHeroFilter = hero;
    return _(cards).where({hero:hero});
  };

  var splitIntoPageGroups = function(cards) {
    var result = _(cards).chain().groupBy(function(card, index) {
      return Math.floor(index/$scope.pageSize);
    }).toArray().value();

    return result;
  };

  $scope.nextPage = function() {
    $scope.currentPage += 1;
  };

  $scope.prevPage = function() {
    $scope.currentPage -= 1;
  };

  $scope.filterCards = function(cards, filterType, filterValue) {
    switch(filterType) {
      case 'hero':
        $scope.cards = splitIntoPageGroups(filterCardsByManaCostAndHero(cards, $scope.currentManaFilter, filterValue))[$scope.currentPage];
        break;
      case 'cost':
        $scope.cards = splitIntoPageGroups(filterCardsByManaCostAndHero(cards, filterValue, $scope.currentHeroFilter))[$scope.currentPage];
        break;
      default:
        break;
    }
  };

  $scope.$watch('currentPage', function(newPage, oldPage) {
    // console.log('currentPage changed (new, old)', newPage, oldPage);
    var pages         = splitIntoPageGroups(filterCardsByManaCostAndHero($scope.cardDB, $scope.currentManaFilter, $scope.currentHeroFilter));
    $scope.totalPages = pages.length;
    $scope.cards      = pages[newPage];
  });
});

app.filter('capitalize', function() {
  return function(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  };
});

app.run(function ($rootScope, $http, AuthenticationService) {
  $rootScope.expireMySession = function() {
    $http.get('/expire-my-session');
  };

  $rootScope.searchQueryChanged = function(query) {
    $rootScope.searchQuery = query;
    // to demonstrate event broadcasting
    // $rootScope.$broadcast('search-query-changed', query);
  };

  $rootScope.isLoggedOut = function() {
    return !AuthenticationService.isLoggedIn();
  };
});

app.run(function($rootScope, $location, AuthenticationService, FlashService) {
  var routesThatRequireAuth = ['/hearthstone', '/home'];

  $rootScope.$on('$routeChangeStart', function(event, next, current) {
    if(_(routesThatRequireAuth).contains($location.path()) && !AuthenticationService.isLoggedIn()) {
      $location.path('/login');
      FlashService.show("Please log in to continue.");
    }
  });
});

app.factory("BookService", function($http) {
  return {
    get: function() {
      return $http.get('/books');
    }
  };
});

app.factory("BookResource", function($q, $resource) {
  return $resource('/books');
});

app.factory("FlashService", function($rootScope) {
  return {
    show: function(message) {
      $rootScope.flash = message;
    },
    clear: function() {
      $rootScope.flash = "";
    }
  };
});

app.factory("SessionService", function() {
  return {
    get: function(key) {
      return sessionStorage.getItem(key);
    },
    set: function(key, val) {
      return sessionStorage.setItem(key, val);
    },
    unset: function(key) {
      return sessionStorage.removeItem(key);
    }
  };
});

app.factory("AuthenticationService", function($http, $sanitize, SessionService, FlashService) {

  var cacheSession   = function() {
    SessionService.set('authenticated', true);
  };

  var uncacheSession = function() {
    SessionService.unset('authenticated');
  };

  var sanitizeCredentials = function(credentials) {
    return {
      username: $sanitize(credentials.username),
      password: $sanitize(credentials.password)
    };
  };

  return {
    login: function(credentials) {
      var login = $http.post("/auth/login", sanitizeCredentials(credentials));
      login.success(cacheSession);
      login.success(FlashService.clear);
      return login;
    },
    logout: function() {
      var logout = $http.get("/auth/logout");
      logout.success(uncacheSession);
      return logout;
    },
    isLoggedIn: function() {
      return SessionService.get('authenticated');
    }
  };
});

app.controller("LoginController", function($scope, $location, AuthenticationService) {
  if(AuthenticationService.isLoggedIn()) {
    $location.path('/hearthstone');
  }

  $scope.credentials = { username: "", password: "" };

  $scope.login = function() {
    AuthenticationService.login($scope.credentials).success(function() {
      $location.path('/hearthstone');
    });
  };
});

app.controller("BooksController", function($scope, books) {
  $scope.books = books.data;
});

app.controller("BooksResourceController", function ($scope, BookResource) {
  // because the stubbed endpoint returns an array of results, .query() is used
  // if the endpoint returned an object, you would use .get()
  $scope.books = BookResource.query();
});

app.controller("BooksHttpController", function ($scope, books) {
  $scope.books = books;
});

app.controller("HomeController", function($scope, $location, AuthenticationService) {
  $scope.title = "Awesome Home";
  $scope.message = "Mouse Over these images to see a directive at work!";

  $scope.logout = function() {
    AuthenticationService.logout().success(function() {
      $location.path('/login');
    });
  };
});

app.directive("showsMessageWhenHovered", function() {
  return {
    restrict: "A", // A = Attribute, C = CSS Class, E = HTML Element, M = HTML Comment
    link: function(scope, element, attributes) {
      var originalMessage = scope.message;
      element.bind("mouseenter", function() {
        scope.message = attributes.message;
        scope.$apply();
      });
      element.bind("mouseleave", function() {
        scope.message = originalMessage;
        scope.$apply();
      });
    }
  };
});
