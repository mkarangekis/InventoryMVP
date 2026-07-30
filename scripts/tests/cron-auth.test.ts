import assert from "node:assert/strict";
import { isCronRequestAuthorized } from "../../src/lib/cron-auth";

assert.equal(isCronRequestAuthorized(null, undefined), false);
assert.equal(isCronRequestAuthorized("Bearer anything", undefined), false);
assert.equal(isCronRequestAuthorized(null, "configured"), false);
assert.equal(isCronRequestAuthorized("Bearer wrong", "configured"), false);
assert.equal(isCronRequestAuthorized("Basic configured", "configured"), false);
assert.equal(isCronRequestAuthorized("Bearer configured", "configured"), true);

console.log("cron-auth tests: ok");
