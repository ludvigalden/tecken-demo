# CI elision checks

Two CI checks are environment-gated and elide loudly instead of running
silently:

| Check                              | Condition                              | Elision                                                                                                           |
| ---------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `dependency-review` (security.yml) | pull requests on the **public** repo   | `dependency-review-elided` job prints `ELIDED: dependency-review needs a public repo or GHAS` to the step summary |
| CodeQL `analyze` (codeql.yml)      | any event while the repo is **public** | `analyze-elided` job prints the reason to the step summary                                                        |

