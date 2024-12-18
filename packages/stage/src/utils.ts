export const getHost = (targetUrl: string) => targetUrl.match(/\/\/([^/]+)/)?.[1];
export function isSameDomain(targetUrl = '', source = globalThis.location.host) {
  const isHttpUrl = /^https?:\/\//.test(targetUrl);

  if (!isHttpUrl)
    return true;

  return getHost(targetUrl) === source;
}
