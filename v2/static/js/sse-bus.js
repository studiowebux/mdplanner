// Shared SSE bus — one EventSource for the entire app.
// Domain scripts call window.sseBus.on(prefix, handler) to subscribe.
// Never import EventSource directly in domain scripts.

(function () {
  var listeners = [];
  var es;

  function connect() {
    es = new EventSource("/sse");

    es.onmessage = function (e) {
      var event = JSON.parse(e.data);
      for (var i = 0; i < listeners.length; i++) {
        if (event.type.startsWith(listeners[i].prefix)) {
          listeners[i].handler(event);
        }
      }
    };

    es.onerror = function () {
      es.close();
      setTimeout(connect, 2000);
    };
  }

  window.sseBus = {
    on: function (prefix, handler) {
      listeners.push({ prefix: prefix, handler: handler });
    },
  };

  connect();
})();
