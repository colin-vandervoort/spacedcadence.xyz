#!/usr/bin/env bash
set -e

script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
build_dir="$script_dir"/../website/dist
if [ ! -d "$build_dir" ]; then
	echo -n "Error: $build_dir directory does not exist"
	exit 1
fi

# S3_PATH=s3://colin-personal-dev-site-test-primary/www
aws s3 sync "$build_dir" "$S3_PATH" --delete

# When publishing to test site, tell search crawlers not to index content
if [ "$TARGET_ENV" = "test" ]; then
	aws s3 cp - "$S3_PATH"/robots.txt <<EOF
User-agent: *
Disallow: /
EOF
fi
