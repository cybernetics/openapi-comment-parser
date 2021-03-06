import cloneDeep from 'lodash/cloneDeep';
import sdk from 'postman-collection';

function setQueryParams(postman, queryParams) {
  postman.url.query.clear();

  const qp = queryParams
    .filter((param) => param.value)
    .map((param) => {
      if (Array.isArray(param.value)) {
        return new sdk.QueryParam({
          key: param.name,
          value: param.value.join(','),
        });
      }
      return new sdk.QueryParam({
        key: param.name,
        value: param.value,
      });
    });

  if (qp.length > 0) {
    postman.addQueryParams(qp);
  }
}

function setPathParams(postman, queryParams) {
  const source = queryParams.map((x) => ({
    key: x.name,
    value: x.value || `:${x.name}`,
  }));
  postman.url.variables.assimilate(source);
}

function buildCookie(cookieParams) {
  const cookies = cookieParams.map((param) => {
    if (param.value) {
      return new sdk.Cookie({
        name: param.name,
        value: param.value,
      });
    }
    return undefined;
  });
  const list = new sdk.CookieList(null, cookies);
  return list.toString();
}

function setHeaders(postman, contentType, accept, cookie, headerParams) {
  postman.headers.clear();
  if (contentType) {
    postman.addHeader({ key: 'Content-Type', value: contentType });
  }
  if (accept) {
    postman.addHeader({ key: 'Accept', value: accept });
  }
  headerParams.forEach((param) => {
    if (param.value) {
      postman.addHeader({ key: param.name, value: param.value });
    }
  });
  if (cookie) {
    postman.addHeader({ key: 'Cookie', value: cookie });
  }
}

function setBody(clonedPostman, body) {
  if (clonedPostman.body === undefined) {
    return;
  }

  if (body && body.type === 'file') {
    // treat it like file.
    clonedPostman.body.mode = 'file';
    clonedPostman.body.file = { src: body.src };
    return;
  }

  switch (clonedPostman.body.mode) {
    case 'raw': {
      clonedPostman.body.raw = body || '';
      return;
    }
    case 'formdata': {
      clonedPostman.body.formdata.clear();
      if (body === undefined) {
        return;
      }
      if (typeof body !== 'object') {
        // treat it like raw.
        clonedPostman.body.mode = 'raw';
        clonedPostman.body.raw = body;
        return;
      }
      const params = Object.entries(body)
        .filter(([_, val]) => val)
        .map(([key, val]) => {
          if (val.type === 'file') {
            return new sdk.FormParam({ key: key, ...val });
          }
          return new sdk.FormParam({ key: key, value: val });
        });
      clonedPostman.body.formdata.assimilate(params);
      return;
    }
    case 'urlencoded': {
      clonedPostman.body.urlencoded.clear();
      if (body === undefined) {
        return;
      }
      if (typeof body !== 'object') {
        // treat it like raw.
        clonedPostman.body.mode = 'raw';
        clonedPostman.body.raw = body;
        return;
      }
      const params = Object.entries(body)
        .filter(([_, val]) => val)
        .map(([key, val]) => new sdk.QueryParam({ key: key, value: val }));
      clonedPostman.body.urlencoded.assimilate(params);
      return;
    }
    default:
      return;
  }
}

export function buildPostmanRequest(
  postman,
  {
    queryParams,
    pathParams,
    cookieParams,
    contentType,
    accept,
    headerParams,
    body,
  }
) {
  const clonedPostman = cloneDeep(postman);

  clonedPostman.url.host = [window.location.origin];

  setQueryParams(clonedPostman, queryParams);
  setPathParams(clonedPostman, pathParams);

  const cookie = buildCookie(cookieParams);
  setHeaders(clonedPostman, contentType, accept, cookie, headerParams);

  setBody(clonedPostman, body);

  return clonedPostman;
}
