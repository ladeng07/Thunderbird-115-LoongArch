#!/bin/sh
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
# This script builds the official interpreter for the python language,
# while also packing in a few default extra packages.

set -e
set -x

# Required fetch artifact
clang_bindir=${MOZ_FETCHES_DIR}/clang/bin
clang_libdir=${MOZ_FETCHES_DIR}/clang/lib
python_src=${MOZ_FETCHES_DIR}/cpython-source

# Make the compiler-rt available to clang.
env UPLOAD_DIR= $GECKO_PATH/taskcluster/scripts/misc/repack-clang.sh

# Setup environment
export PATH=${clang_bindir}:${PATH}
export CC=clang
export CXX=clang++
export LDFLAGS=-fuse-ld=lld

# Extra setup for OSX
case `uname -s` in
    Darwin)
        case `uname -m` in
            aarch64)
                macosx_version_min=11.0
                ;;
            *)
                macosx_version_min=10.12
                ;;
        esac
        macosx_sdk=13.3
        # NOTE: both CFLAGS and CPPFLAGS need to be set here, otherwise
        # configure step fails.
        sysroot_flags="-isysroot ${MOZ_FETCHES_DIR}/MacOSX${macosx_sdk}.sdk -mmacosx-version-min=${macosx_version_min}"
        export CPPFLAGS=${sysroot_flags}
        export CFLAGS=${sysroot_flags}
        export LDFLAGS="${LDFLAGS} ${sysroot_flags}"
        configure_flags_extra=--with-openssl=/usr/local/opt/openssl

        # see https://bugs.python.org/issue44065
        sed -i -e 's,$CC --print-multiarch,:,' ${python_src}/configure
        ;;
esac

# Patch Python to honor MOZPYTHONHOME instead of PYTHONHOME. That way we have a
# relocatable python for free, while not interfering with the system Python that
# already honors PYTHONHOME.
find ${python_src} -type f -print0 | xargs -0 perl -i -pe "s,PYTHONHOME,MOZPYTHONHOME,g"

# Actual build
work_dir=`pwd`
tardir=python

cd `mktemp -d`
${python_src}/configure --prefix=/${tardir} --enable-optimizations ${configure_flags_extra} || { exit_status=$? && cat config.log && exit $exit_status ; }
export MAKEFLAGS=-j`nproc`
make
make DESTDIR=${work_dir} install
cd ${work_dir}

${work_dir}/python/bin/python3 -m pip install --upgrade pip==23.0
${work_dir}/python/bin/python3 -m pip install -r ${GECKO_PATH}/build/psutil_requirements.txt -r ${GECKO_PATH}/build/zstandard_requirements.txt

$(dirname $0)/pack.sh ${tardir}
