import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import { isSafePublicUrl } from "./ssrf-guard";

type Resolver = (hostname: string) => Promise<LookupAddress[]>;

/** Validate the exact DNS answers supplied to the socket, without a second lookup. */
export function createPublicLookup(resolve: Resolver = host => lookup(host, { all: true })): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname).then(addresses => {
      if (!addresses.length || addresses.some(({ address, family }) =>
        !isSafePublicUrl(`http://${family === 6 ? `[${address}]` : address}/`))) {
        callback(new Error("SSRF blocked: unsafe DNS address"), "");
        return;
      }
      const family = Number(options.family);
      const eligible = family ? addresses.filter(item => item.family === family) : addresses;
      if (!eligible.length) {
        callback(new Error("SSRF blocked: no usable DNS address"), "");
      } else if (options.all) {
        callback(null, eligible);
      } else {
        callback(null, eligible[0].address, eligible[0].family);
      }
    }).catch(error => callback(error, ""));
  };
}
