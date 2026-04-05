// Embedded circuit artifact - compiled from circuits/
// This file is auto-generated during build

export const circuitArtifact = {
  bytecode: "H4sIAAAAAAAA/71dCdge0xU+35/9/7Pveyb7vu+bbI1937cIJU1TFURCVZWIlJSUNFJSUlJSlBQlSElJiaWRkpKipKSkpagoaSmqczIzz9yZ5+Tce87cZ+7zXFfOOe9/3/fcef/l+/9vpgLRqB2vZ502Z+60CkDdqujf4f9CrXjFUT8XqxCxKiJWi4jVJmJ1iFhdIlaPiNUnYg2IWDURqyFiDYlYIyLWmIg1IWJNiVgzItaciLUgYi2JWCsi1pqItSFibYlYOyLWnoh1IGIdiVgnItaZiHUhYgER60rEuhGx7kSsBxHrScR6EbHeRKwPEetLxPoRsf5EbAARG0jEBhGxwURsCBEbSsSGEbHhRGwEERtJxEYRsdFEbAwRG0vExhGx8URsAhGbSMT2IWKTiNhkiK5BMzYljpuxqQR2GhH7GhGbTsT2JWL7EbH9idgBROxAInYQETuYiB1CxA4lYocRscOJ2BFE7EgidhQRO5qIHUPEjiVixxGx44nYCUTsRCJ2EhE7mYjNIGKnELGZROxUInZaHEu+fsdftjOjEq8BOI3KZPdacgROVZUM18vidVGUSgViom0uhkX1cx+ulmjzrMghZxw6b8fQW/o+fPj0BxcuPH5Gn+Hv7H/h+nOWTduxe/mHX31VucyxdlfMLXDj4PXQ3GurmlDRANy2MbleHq+Lo1R6QJjIHxoWFT00s9Z2aJeD+6EtBl3zqmT8u7jyR04/cP64k7aafaZw0j5XBLXmfjZNV7h/3My1k+B8GkbChRqBU1XWMFfG65IolQrERN4wWFTUMKZIm2GuBPeDXAK65kkN48ofOf0QdBcXhZP2uUpQa+5n03QV6DQlOJ+GkXChRuBUlTXM1fG6NEqlAjGRNwwWFTWMKdJmmKvB/SCXApRiGFf+yOlHoLu4KJy0z7UEteZ+Nk3XgE5TgvNpGAkXagROVVnDXBuvy6JUKhATecNgUVHDmCJthrkX3A9yGUAphnHlj5x+DLqLi8JJ+1xbUGvuZ9O0HHSaEpxPw0i4UCNwqsoa5rp4XRGlUoGYyBsGi4oaxhRpM8x14H6QKwBKMYwrf+T0M9BdXBRO2uc6glpzP5um60GnKcH5NIyECzUCp6qsYW6I15VRKhWIibxhsKioYUyRNsPcAO4HuRKgFMO48kdOPwXdxUXhpH2uK6g197NpuhF0mhKcT8NIuFAjcKrKGuameF0VpVKBmMgbBouKGsYUaTPMTeB+kKsASjGMK3/k9DPQXVwUTtrneoJacz+bpptBpynB+TSMhAs1AqeqrGFuidfVUSoViIm8YbCoqGFMkTbD3ALuB7kaoBTDuPJHTj8H3cVF4aR9ri+oNfezaboVdJoSnE/DSLhQI3Cqyhrmpni9I0qlAjGRNwwWFTWMKdJmmNfB/SB3AJRiGFf+yOkXoLu4KJy0z60EteZ+Nk1vAQAA//8DAFBk",
  abi: {
    parameters: [
      { name: "secret", type: { kind: "array", length: 32, type: { kind: "integer", sign: "unsigned", width: 8 } }, visibility: "private" },
      { name: "nonce", type: { kind: "array", length: 32, type: { kind: "integer", sign: "unsigned", width: 8 } }, visibility: "private" },
      { name: "difficulty", type: { kind: "integer", sign: "unsigned", width: 32 }, visibility: "public" },
      { name: "timestamp", type: { kind: "integer", sign: "unsigned", width: 64 }, visibility: "public" },
      { name: "hash_output", type: { kind: "array", length: 32, type: { kind: "integer", sign: "unsigned", width: 8 } }, visibility: "public" }
    ]
  }
};

export default circuitArtifact;