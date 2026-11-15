/* Small synchronous SHA-256, MD5 and HMAC-SHA256 (the old Apps Script code hashes passwords / OTPs synchronously).
   Input: string (UTF-8) or byte array. Output: array of signed bytes, like Apps Script's Utilities.computeDigest. */
export function utf8(s) { return Array.from(new TextEncoder().encode(String(s))); }
function bytes(x) { return typeof x === 'string' ? utf8(x) : Array.from(x, function (b) { return b & 255; }); }
function signed(a) { return a.map(function (b) { b &= 255; return b > 127 ? b - 256 : b; }); }

var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
function sha256raw(m) {
  m = m.slice(); var l = m.length * 8; m.push(0x80); while (m.length % 64 !== 56) m.push(0);
  for (var i = 7; i >= 0; i--) m.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
  var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
  function r(x, n) { return (x >>> n) | (x << (32 - n)); }
  for (var o = 0; o < m.length; o += 64) {
    for (var t = 0; t < 16; t++) w[t] = (m[o + t * 4] << 24) | (m[o + t * 4 + 1] << 16) | (m[o + t * 4 + 2] << 8) | m[o + t * 4 + 3];
    for (t = 16; t < 64; t++) { var s0 = r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10); w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0; }
    var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (t = 0; t < 64; t++) {
      var S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[t] + w[t]) | 0;
      var S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  var out = []; h.forEach(function (x) { out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); });
  return out;
}
export function sha256(x) { return signed(sha256raw(bytes(x))); }
export function hmacSha256(msg, key) {
  var k = bytes(key); if (k.length > 64) k = sha256raw(k); while (k.length < 64) k.push(0);
  var ip = k.map(function (b) { return b ^ 0x36; }), op = k.map(function (b) { return b ^ 0x5c; });
  return signed(sha256raw(op.concat(sha256raw(ip.concat(bytes(msg))))));
}
export function md5(x) {
  var m = bytes(x), l = m.length * 8; m.push(0x80); while (m.length % 64 !== 56) m.push(0);
  for (var i = 0; i < 8; i++) m.push(i < 4 ? (l >>> (i * 8)) & 255 : 0);
  var S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21], T = [];
  for (i = 0; i < 64; i++) T[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (var o = 0; o < m.length; o += 64) {
    var M = []; for (i = 0; i < 16; i++) M[i] = m[o + i * 4] | (m[o + i * 4 + 1] << 8) | (m[o + i * 4 + 2] << 16) | (m[o + i * 4 + 3] << 24);
    var A = a0, B = b0, C = c0, D = d0;
    for (i = 0; i < 64; i++) {
      var F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + T[i] + M[g]) | 0; A = D; D = C; C = B;
      var s = S[(i >> 4) * 4 + (i % 4)]; B = (B + ((F << s) | (F >>> (32 - s)))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  var out = []; [a0, b0, c0, d0].forEach(function (x) { for (var j = 0; j < 4; j++) out.push((x >>> (j * 8)) & 255); });
  return signed(out);
}
