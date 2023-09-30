# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import hashlib

import taskgraph.util.path as util_path

from gecko_taskgraph.util.hash import get_file_finder, hash_path


def split_patterns_list(patterns):
    """
    Give a list of path patterns and return two lists. rv[0] corresponds to files from the
    GECKO repository, rv[1] corresponds to COMM.
    The pattern list for the COMM repository will have *not* the 'comm/' prefix stripped.
    """
    return [
        [p for p in patterns if not p.startswith("comm/")],
        [p for p in patterns if p.startswith("comm/")],
    ]


def prefix_paths(prefix, paths):
    """
    Prepend a prefix to a list of paths.
    """
    return [util_path.join(prefix, p) for p in paths]


def process_found(found_gen, prefix=None):
    """
    Transform the results from finder.find(pattern) into a list of files.
    If prefix is given, prepend it to results.
    """
    for filename, fileobj in found_gen:
        if prefix:
            yield util_path.join(prefix, filename)
        else:
            yield filename


def hash_paths_extended(base_path, patterns):
    """
    Works like gecko_taskgraph.util.hash.hash_paths, except it is able to account for Thunderbird
    source code being part of a separate repository.
    Two file finders are created if necessary.
    """
    gecko_patterns, comm_patterns = split_patterns_list(patterns)
    gecko_finder = get_file_finder(base_path)
    comm_finder = get_file_finder(util_path.join(base_path, "comm"))

    h = hashlib.sha256()
    files = []
    for (patterns, finder, prefix) in [
        (gecko_patterns, gecko_finder, None),
        (comm_patterns, comm_finder, "comm/"),
    ]:
        for pattern in patterns:
            if prefix:
                pattern = pattern.lstrip(prefix)
            found = list(process_found(finder.find(pattern), prefix))
            if found:
                files.extend(found)
            else:
                raise Exception("%s did not match anything" % pattern)
    for path in sorted(files):
        if path.endswith((".pyc", ".pyd", ".pyo")):
            continue
        h.update(
            "{} {}\n".format(
                hash_path(util_path.abspath(util_path.join(base_path, path))),
                util_path.normsep(path),
            ).encode("utf-8")
        )
    return h.hexdigest()
