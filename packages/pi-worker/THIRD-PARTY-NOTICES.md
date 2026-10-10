# pi Worker third-party notices

This opt-in development Worker uses the official `earendil-works/pi` packages,
fixed at 1.1.0. Upstream source commit:
`abe508e1b89912adde45528136c3221eb69acdd7`.

The following MIT notice is retained for pi-agent-core, pi-ai and pi-telemetry.
Source: <https://github.com/earendil-works/pi/blob/abe508e1b89912adde45528136c3221eb69acdd7/LICENSE>.
It does not assign a license to ResearchTrail as a whole.

```text
MIT License

Copyright (c) 2025 Mario Zechner

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`dependency-audit.json` records the complete installed dependency graph: exact
versions, lock integrity, declared SPDX license, installed file sizes, available
LICENSE/NOTICE hashes, and dependencies. `node scripts/pi-audit.mjs` checks it
offline. License metadata and collected notice files are separate evidence.

Nine packages have no standalone LICENSE/NOTICE file in the published artifact:
the three pi packages (covered above),
`@aws-sdk/credential-provider-http@3.972.75`,
`@aws-sdk/credential-provider-login@3.972.80`,
`@aws-sdk/nested-clients@3.997.47`, `data-uri-to-buffer@4.0.1`,
`proxy-agent-negotiate@1.1.0`, and `standardwebhooks@1.1.1`.
During the independent PR review, five of the six remaining license texts were
collected from immutable official source commits whose package manifests match
the locked versions. `upstream-notices.json` records URLs, commits, manifest
hashes and notice hashes; the offline audit verifies the retained notice bytes.

- Three AWS packages: [Apache-2.0 text](notices/aws-sdk-LICENSE.txt), source
  [AWS SDK commit](https://github.com/aws/aws-sdk-js-v3/blob/a960c14e8ce09ab8fd09352e40d75c6b9d52c1ca/LICENSE).
  The nested-clients source directory is `packages-internal/nested-clients`,
  although its published repository metadata still says `packages/nested-clients`.
- data-uri-to-buffer: [MIT copyright and text](notices/data-uri-to-buffer-LICENSE.txt)
  extracted from its fixed published gitHead README License section.
- standardwebhooks: [MIT copyright and text](notices/standardwebhooks-LICENSE.txt)
  from `libraries/LICENSE` at its published gitHead. The repository root license
  is Apache-2.0; the JavaScript package's MIT declaration is covered by the more
  specific libraries license, not the root license.
- **Unresolved:** proxy-agent-negotiate@1.1.0 declares MIT, but its matching
  official package directory and repository root have no complete copyright or
  license text. A sibling package's copyright notice is not substituted.

This collects available license evidence, not a complete redistribution/legal
clearance. Recheck per-package copyright and applicable NOTICE obligations when
building a future installer; the unresolved negotiate notice blocks that
distribution. No installer containing these packages is built or released
in this PR. Apache-2.0, BSD-3-Clause, 0BSD, Unlicense and MIT obligations must be
preserved per package. Node.js distribution has its own bundled third-party
notices, separate from npm package metadata.
