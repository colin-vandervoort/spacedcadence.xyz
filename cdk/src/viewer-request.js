function handler(event) {
  var request = event.request;
  var uri = request.uri;

  var redirectMap = {
    '/about': '/',
    '/about/': '/',
    '/blog': '/articles/1/',
    '/blog/': '/articles/1/',
    '/blog/ssg-and-polp-upload-to-s3': '/articles/github-actions-oidc-aws/',
    '/blog/ssg-and-polp-upload-to-s3/': '/articles/github-actions-oidc-aws/',
    '/tags': '/tags/1/',
    '/tags/': '/tags/1/',
  };

  if (redirectMap.hasOwnProperty(uri)) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { 'value': redirectMap[uri] }
      }
    };
  }

  // Check whether the URI is missing a file name.
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  }
  // Check whether the URI is missing a file extension.
  else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
