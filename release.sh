#!/usr/bin/env bash
set -euo pipefail

# ─── Usage ────────────────────────────────────────────────────
# ./release.sh [patch|minor|major]
#
# Defaults to "patch" if no argument is given.
# Reads current version from package.json, bumps it,
# updates all package.json files, commits, and creates a git tag.
# ──────────────────────────────────────────────────────────────

BUMP_TYPE="${1:-patch}"

if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Read current version from root package.json
CURRENT=$(grep '"version"' package.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')

if [[ -z "$CURRENT" ]]; then
  echo "Error: no version found in package.json"
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${NEW_VERSION}"

echo "Bumping version: $CURRENT -> $NEW_VERSION"

# Update version in all package.json files
for f in package.json server/package.json frontend/package.json; do
  if [[ -f "$f" ]]; then
    sed -i.bak "s/\"version\": *\"${CURRENT}\"/\"version\": \"${NEW_VERSION}\"/" "$f"
    rm -f "${f}.bak"
  fi
done

# Commit and tag
git add package.json server/package.json frontend/package.json
git commit -m "release: ${TAG}"
git tag -a "$TAG" -m "Release ${TAG}"

echo ""
echo "Created tag: $TAG"
echo "Pushing to origin..."
git push origin main "$TAG"
echo "Done! GitHub Actions will build the image."
