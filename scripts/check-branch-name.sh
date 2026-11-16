#!/usr/bin/env sh
# Checks a branch name against the convention: `type/description`, e.g.
# feature/add-cart-summary or bugfix/fix-login-redirect (lowercase, digits, . _ -).
# Same types as .husky/pre-commit. Used by .husky/pre-push and by CI; `main`
# is also accepted here, so merged work can still be pushed to it.
#
#   scripts/check-branch-name.sh [branch]   # defaults to the current branch
set -eu

branch="${1:-$(git rev-parse --abbrev-ref HEAD)}"
types="feature|bugfix|hotfix|refactor|chore|docs|test|experiment|release"
pattern="^(main|($types)/[a-z0-9._-]+)$"

# Detached HEAD (rebases, CI checkouts): nothing to check.
[ "$branch" = "HEAD" ] && exit 0

# The release PR's branch, created by release-please (.github/workflows/release-please.yml).
case "$branch" in release-please--*) exit 0 ;; esac

if printf '%s' "$branch" | grep -Eq "$pattern"; then
  exit 0
fi

cat >&2 <<MSG
Branch name "$branch" doesn't follow the convention.

  Expected: <type>/<description>, lowercase, e.g. feature/add-cart-summary
  Types:    $(printf '%s' "$types" | sed 's/|/, /g')

Rename it with:  git branch -m <new-name>
MSG
exit 1
