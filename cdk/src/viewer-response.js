function handler(event) {
  var response = event.response;
  var headers = response.headers;
  var contentType = headers['content-type'];
  var shortExpiry = 180; // three minutes
  var longExpiry = 31536000; // one month

  if (contentType && contentType.value) {
    var cacheControl = 'public, immutable, stale-while-revalidate';
    var cacheControlRules = [
      // {
      //   regex: /^application\/manifest\+json/,
      //   directive: 'public'
      // },
      // {
      //   regex: /^text\/cache-manifest/,
      //   directive: 'no-cache'
      // },
      // {
      //   regex: /^image\/.*/,
      //   directive: 'public, immutable, stale-while-revalidate'
      // },
      {
        regex: /^text\/html/,
        directive: `public, max-age=${ shortExpiry }`
      },
      {
        regex: /^font\/.*/,
        directive: `public, immutable, max-age=${ longExpiry }, stale-while-revalidate`
      },
      {
        regex: /^.*json/,
        directive: 'no-store'
      }
    ];
    for (var i = 0; i < cacheControlRules.length; i++) {
      var rule = cacheControlRules[i]
      if (contentType.value.match(rule.regex)) {
        cacheControl = rule.directive;
        break;
      }
    }
    headers['cache-control'] = { value: cacheControl };
  } else {
    headers['cache-control'] = { value: 'no-store' };
  }

  return response;
}
