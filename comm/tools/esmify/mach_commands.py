# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import logging
import os
import pathlib
import re
import subprocess
import sys

from mach.decorators import Command, CommandArgument


def path_sep_to_native(path_str):
    """Make separators in the path OS native."""
    return pathlib.os.sep.join(path_str.split("/"))


def path_sep_from_native(path):
    """Make separators in the path OS native."""
    return "/".join(str(path).split(pathlib.os.sep))


excluded_from_convert_prefix = list(
    map(
        path_sep_to_native,
        [
            # Don't modify suite/ code"
            "suite/",
        ],
    )
)


def is_excluded_from_convert(path):
    """Returns true if the JSM file shouldn't be converted to ESM."""
    path_str = str(path)
    for prefix in excluded_from_convert_prefix:
        if path_str.startswith(prefix):
            return True

    return False


excluded_from_imports_prefix = list(
    map(
        path_sep_to_native,
        [
            # Vendored or auto-generated files.
            "chat/protocols/matrix/lib/",
            "chat/protocols/xmpp/lib/",
            # Files has macro.
            "calendar/base/calendar.js",
            "chat/chat-prefs.js",
            "mail/app/profile/all-thunderbird.js",
            "mail/branding/thunderbird/pref/thunderbird-branding.js",
            "mail/components/compose/composer.js",
            "mail/components/enterprisepolicies/schemas/schema.sys.mjs",
            "mail/locales/en-US/all-l10n.js",
            "mail/extensions/am-e2e/prefs/e2e-prefs.js",
            "mailnews/extensions/mdn/mdn.js",
            "mailnews/mailnews.js",
        ],
    )
)

EXCLUSION_FILES = [
    os.path.join("tools", "lint", "ThirdPartyPaths.txt"),
]

MAP_JSON = os.path.abspath(os.path.join("tools", "esmify", "map.json"))


def load_exclusion_files():
    for path in EXCLUSION_FILES:
        with open(path, "r") as f:
            for line in f:
                p = path_sep_to_native(re.sub("\*$", "", line.strip()))
                excluded_from_imports_prefix.append(p)


def is_excluded_from_imports(path):
    """Returns true if the JS file content shouldn't be handled by
    jscodeshift.

    This filter is necessary because jscodeshift cannot handle some
    syntax edge cases and results in unexpected rewrite."""
    path_str = str(path)
    for prefix in excluded_from_imports_prefix:
        if path_str.startswith(prefix):
            return True

    return False


# Wrapper for hg/git operations
class VCSUtils:
    def run(self, cmd):
        # Do not pass check=True because the pattern can match no file.
        lines = subprocess.run(cmd, stdout=subprocess.PIPE).stdout.decode()
        return filter(lambda x: x != "", lines.split("\n"))


class HgUtils(VCSUtils):
    def is_available():
        return pathlib.Path(".hg").exists()

    def rename(self, before, after):
        cmd = ["hg", "rename", before, after]
        subprocess.run(cmd, check=True)

    def find_jsms(self, path):
        jsms = []

        cmd = ["hg", "files", f"set:glob:{path}/**/*.jsm"]
        for line in self.run(cmd):
            jsm = pathlib.Path(line)
            if is_excluded_from_convert(jsm):
                continue
            jsms.append(jsm)

        cmd = [
            "hg",
            "files",
            f"set:grep('EXPORTED_SYMBOLS = \[') and glob:{path}/**/*.js",
        ]
        for line in self.run(cmd):
            jsm = pathlib.Path(line)
            if is_excluded_from_convert(jsm):
                continue
            jsms.append(jsm)

        return jsms

    def find_all_jss(self, path):
        jss = []

        cmd = ["hg", "files", f"set:glob:{path}/**/*.jsm"]
        for line in self.run(cmd):
            js = pathlib.Path(line)
            if is_excluded_from_imports(js) or is_excluded_from_convert(js):
                continue
            jss.append(js)

        cmd = ["hg", "files", f"set:glob:{path}/**/*.js"]
        for line in self.run(cmd):
            js = pathlib.Path(line)
            if is_excluded_from_imports(js) or is_excluded_from_convert(js):
                continue
            jss.append(js)

        cmd = ["hg", "files", f"set:glob:{path}/**/*.mjs"]
        for line in self.run(cmd):
            js = pathlib.Path(line)
            if is_excluded_from_imports(js) or is_excluded_from_convert(js):
                continue
            jss.append(js)

        return jss


class Summary:
    def __init__(self):
        self.convert_errors = []
        self.import_errors = []
        self.rename_errors = []
        self.no_refs = []


@Command(
    "tb-esmify",
    category="thunderbird",
    description="ESMify JSM files (comm-central variant)",
)
@CommandArgument(
    "path",
    nargs=1,
    help="Path to the JSM file to ESMify, or the directory that contains "
    "JSM files and/or JS files that imports ESM-ified JSM. This path is relative"
    "to your current directory, $topsrcdir/comm",
)
@CommandArgument(
    "--convert",
    action="store_true",
    help="Only perform the step 1 = convert part",
)
@CommandArgument(
    "--imports",
    action="store_true",
    help="Only perform the step 2 = import calls part",
)
@CommandArgument(
    "--upstream-imports",
    action="store_true",
    help="Perform step 2, import calls, but for converted JSMs in mozilla-central",
)
@CommandArgument(
    "--prefix",
    default="",
    help="Restrict the target of import in the step 2 to ESM-ified JSM, by the "
    "prefix match for the JSM file's path.  This path is relative to $topsrcdir, "
    "not your current directory. e.g. --prefix=comm/mail/ or --prefix=toolkit/",
)
def tb_esmify(
    command_context,
    path=None,
    convert=False,
    imports=False,
    upstream_imports=False,
    prefix="",
):
    """
    This command does the following 2 steps:
      1. Convert the JSM file specified by `path` to ESM file, or the JSM files
         inside the directory specified by `path` to ESM files, and also
         fix references in build files and test definitions
      2. Convert import calls inside file(s) specified by `path` for ESM-ified
         files to use new APIs

    Note: When performing import rewrites, when using --imports for comm-central
      modules, you will see "Unknown module" WARNING messages referring to modules
      from mozilla-central.
      When using --upstream-imports for migrated modules from mozilla-central,
      you will see "Unknown module" WARNINGs referring to modules from
      comm-central. This is expected, and not a problem.

    Example 1:
      # Convert all JSM files inside `mail/components/customizableui` directory,
      # and replace all references for ESM-ified files in the entire tree to use
      # new APIs

      $ ../mach tb-esmify --convert mail/components/customizableui
      $ ../mach tb-esmify --imports . --prefix=comm/mail/components/customizableui

    Example 2:
      # Convert all JSM files inside `mail` directory, and replace all
      # references for the JSM files inside `mail` directory to use
      # new APIs

      $ ../mach tb-esmify mail

    Example 3:
      # Replace references for ESM-ified files from toolkit/ in calendar/

      $ ../mach tb-esmify --upstream-imports --prefix=toolkit/ calendar/
    """

    def error(text):
        command_context.log(logging.ERROR, "tb-esmify", {}, f"[ERROR] {text}")

    def warn(text):
        command_context.log(logging.WARN, "tb-esmify", {}, f"[WARN] {text}")

    def info(text):
        command_context.log(logging.INFO, "tb-esmify", {}, f"[INFO] {text}")

    if upstream_imports:
        imports = True
        assert not convert, "Cannot use --convert with --upstream-imports"

    # If no options is specified, perform both.
    if not convert and not imports:
        convert = True
        imports = True

    path = pathlib.Path(path[0])

    if not verify_path(command_context, path):
        return 1

    if HgUtils.is_available():
        vcs_utils = HgUtils()
    else:
        error(
            "This script needs to be run inside mozilla-central + comm-central "
            "checkout of mercurial. "
        )
        return 1

    load_exclusion_files()

    info("Setting up jscodeshift...")
    setup_jscodeshift()

    is_single_file = path.is_file()

    modified_files = []
    summary = Summary()

    if convert:
        info("Searching files to convert to ESM...")
        if is_single_file:
            jsms = [path]
        else:
            jsms = vcs_utils.find_jsms(path)

        info(f"Found {len(jsms)} file(s) to convert to ESM.")

        info("Converting to ESM...")
        jsms = convert_module(jsms, summary)
        if jsms is None:
            error("Failed to rewrite exports.")
            return 1

        info("Renaming...")
        esms = rename_jsms(command_context, vcs_utils, jsms, summary)

        modified_files += esms

    if imports:
        info("Searching files to rewrite imports...")

        if is_single_file:
            if convert:
                # Already converted above
                jss = esms
            else:
                jss = [path]
        else:
            jss = vcs_utils.find_all_jss(path)

        info(f"Found {len(jss)} file(s). Rewriting imports...")

        result = rewrite_imports(jss, prefix, summary, upstream_imports)
        if result is None:
            return 1

        info(f"Rewritten {len(result)} file(s).")

        # Only modified files needs eslint fix
        modified_files += result

    modified_files = list(set(modified_files))

    info(f"Applying eslint --fix for {len(modified_files)} file(s)...")
    eslint_fix(command_context, modified_files)

    def print_files(f, errors):
        for [path, message] in errors:
            f(f"  * {path}")
            if message:
                f(f"    {message}")

    if len(summary.convert_errors):
        error("========")
        error("Following files are not converted into ESM due to error:")
        print_files(error, summary.convert_errors)

    if len(summary.import_errors):
        warn("========")
        warn("Following files are not rewritten to import ESMs due to error:")
        warn(
            "(NOTE: Errors related to 'private names' are mostly due to "
            " preprocessor macros in the file):"
        )
        print_files(warn, summary.import_errors)

    if len(summary.rename_errors):
        error("========")
        error("Following files are not renamed due to error:")
        print_files(error, summary.rename_errors)

    if len(summary.no_refs):
        warn("========")
        warn("Following files are not found in any build files.")
        warn("Please update references to those files manually:")
        print_files(warn, summary.rename_errors)

    return 0


def verify_path(command_context, path):
    """Check if the path passed to the command is valid relative path."""

    def error(text):
        command_context.log(logging.ERROR, "tb-esmify", {}, f"[ERROR] {text}")

    if not path.exists():
        error(f"{path} does not exist.")
        return False

    if path.is_absolute():
        error("Path must be a relative path from comm-central checkout.")
        return False

    return True


def find_file(path, target):
    """Find `target` file in ancestor of path."""
    target_path = path.parent / target
    if not target_path.exists():
        if path.parent == path:
            return None

        return find_file(path.parent, target)

    return target_path


def try_rename_in(command_context, path, target, jsm_name, esm_name, jsm_path):
    """Replace the occurrences of `jsm_name` with `esm_name` in `target`
    file."""

    def info(text):
        command_context.log(logging.INFO, "tb-esmify", {}, f"[INFO] {text}")

    target_path = find_file(path, target)
    if not target_path:
        return False

    # Single moz.build or jar.mn can contain multiple files with same name.
    # Check the relative path.

    jsm_relative_path = jsm_path.relative_to(target_path.parent)
    jsm_relative_str = path_sep_from_native(str(jsm_relative_path))

    jsm_name_re = re.compile(r"\b" + jsm_name.replace(".", r"\.") + r"\b")
    jsm_relative_re = re.compile(r"\b" + jsm_relative_str.replace(".", r"\.") + r"\b")

    modified = False
    content = ""
    with open(target_path, "r") as f:
        for line in f:
            if jsm_relative_re.search(line):
                modified = True
                line = jsm_name_re.sub(esm_name, line)

            content += line

    if modified:
        info(f"  {str(target_path)}")
        info(f"    {jsm_name} => {esm_name}")
        with open(target_path, "w", newline="\n") as f:
            f.write(content)

    return True


def try_rename_components_conf(command_context, path, jsm_name, esm_name):
    """Replace the occurrences of `jsm_name` with `esm_name` in components.conf
    file."""

    def info(text):
        command_context.log(logging.INFO, "tb-esmify", {}, f"[INFO] {text}")

    target_path = find_file(path, "components.conf")
    if not target_path:
        return False

    # Unlike try_rename_in, components.conf contains the URL instead of
    # relative path, and also there are no known files with same name.
    # Simply replace the filename.

    with open(target_path, "r") as f:
        content = f.read()

    prop_re = re.compile("[\"']jsm[\"']:(.*)" + r"\b" + jsm_name.replace(".", r"\.") + r"\b")

    if not prop_re.search(content):
        return False

    info(f"  {str(target_path)}")
    info(f"    {jsm_name} => {esm_name}")

    content = prop_re.sub(r"'esModule':\1" + esm_name, content)
    with open(target_path, "w", newline="\n") as f:
        f.write(content)

    return True


def esmify_name(name):
    return re.sub(r"\.(jsm|js|jsm\.js)$", ".sys.mjs", name)


def esmify_path(jsm_path):
    jsm_name = jsm_path.name
    esm_name = re.sub(r"\.(jsm|js|jsm\.js)$", ".sys.mjs", jsm_name)
    esm_path = jsm_path.parent / esm_name
    return esm_path


def rename_single_file(command_context, vcs_utils, jsm_path, summary):
    """Rename `jsm_path` to .sys.mjs, and fix references to the file in build and
    test definitions."""

    def info(text):
        command_context.log(logging.INFO, "tb-esmify", {}, f"[INFO] {text}")

    esm_path = esmify_path(jsm_path)

    jsm_name = jsm_path.name
    esm_name = esm_path.name

    target_files = [
        "moz.build",
        "jar.mn",
        "browser.ini",
        "browser-drawBelowTitlebar.ini",
        "browser-detachedWindows.ini",
        "browser-drawInTitlebar.ini",
        "browser-clear.ini",
        "browser_rotated.ini",
        "xpcshell.ini",
        "xpcshell_cardDAV.ini",
        "xpcshell-cpp.ini",
        "xpcshell-imap.ini",
        "xpcshell-local.ini",
        "xpcshell_maildir-cpp.ini",
        "xpcshell_maildir.ini",
        "xpcshell-nntp.ini",
        "xpcshell-shared.ini",
    ]

    info(f"{jsm_path} => {esm_path}")

    renamed = False
    for target in target_files:
        if try_rename_in(command_context, jsm_path, target, jsm_name, esm_name, jsm_path):
            renamed = True

    if try_rename_components_conf(command_context, jsm_path, jsm_name, esm_name):
        renamed = True

    if not renamed:
        summary.no_refs.append([jsm_path, None])

    if not esm_path.exists():
        vcs_utils.rename(jsm_path, esm_path)
    else:
        summary.rename_errors.append([jsm_path, f"{esm_path} already exists"])

    return esm_path


def rename_jsms(command_context, vcs_utils, jsms, summary):
    esms = []
    for jsm in jsms:
        esm = rename_single_file(command_context, vcs_utils, jsm, summary)
        esms.append(esm)

    return esms


npm_prefix = pathlib.Path("..") / "tools" / "esmify"
path_from_npm_prefix = pathlib.Path("..") / ".." / "comm"


def setup_jscodeshift():
    """Install jscodeshift."""
    cmd = [
        sys.executable,
        "../mach",
        "npm",
        "install",
        "jscodeshift",
        "--save-dev",
        "--prefix",
        str(npm_prefix),
    ]
    subprocess.run(cmd, check=True)


def run_npm_command(args, env, stdin):
    cmd = [
        sys.executable,
        "../mach",
        "npm",
        "run",
    ] + args
    p = subprocess.Popen(cmd, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    p.stdin.write(stdin)
    p.stdin.close()

    ok_files = []
    errors = []
    while True:
        line = p.stdout.readline()
        if not line:
            break
        line = line.rstrip().decode()

        if line.startswith(" NOC "):
            continue

        print(line)

        m = re.search(r"^ (OKK|ERR) ([^ ]+)(?: (.+))?", line)
        if not m:
            continue

        result = m.group(1)
        # NOTE: path is written from `tools/esmify`.
        path = pathlib.Path(m.group(2)).relative_to(path_from_npm_prefix)
        error = m.group(3)

        if result == "OKK":
            ok_files.append(path)

        if result == "ERR":
            errors.append([path, error])

    if p.wait() != 0:
        return [None, None]

    return ok_files, errors


def convert_module(jsms, summary):
    """Replace EXPORTED_SYMBOLS with export declarations, and replace
    ChromeUtils.importESModule with static import as much as possible,
    and return the list of successfully rewritten files."""

    if len(jsms) == 0:
        return []

    env = os.environ.copy()
    env["ESMIFY_MAP_JSON"] = MAP_JSON

    stdin = "\n".join(map(str, paths_from_npm_prefix(jsms))).encode()

    ok_files, errors = run_npm_command(
        [
            "convert_module",
            "--prefix",
            str(npm_prefix),
        ],
        env=env,
        stdin=stdin,
    )

    if ok_files is None and errors is None:
        return None

    summary.convert_errors.extend(errors)

    return ok_files


def rewrite_imports(jss, prefix, summary, upstream_imports=False):
    """Replace import calls for JSM with import calls for ESM or static import
    for ESM."""

    if len(jss) == 0:
        return []

    env = os.environ.copy()
    if not upstream_imports:
        env["ESMIFY_MAP_JSON"] = MAP_JSON
    env["ESMIFY_TARGET_PREFIX"] = prefix

    stdin = "\n".join(map(str, paths_from_npm_prefix(jss))).encode()

    ok_files, errors = run_npm_command(
        [
            "rewrite_imports",
            "--prefix",
            str(npm_prefix),
        ],
        env=env,
        stdin=stdin,
    )

    if ok_files is None and errors is None:
        return None

    summary.import_errors.extend(errors)

    return ok_files


def paths_from_npm_prefix(paths):
    """Convert relative path from mozilla-central to relative path from
    tools/esmify."""
    return list(map(lambda path: path_from_npm_prefix / path, paths))


def eslint_fix(command_context, files):
    """Auto format files."""

    def info(text):
        command_context.log(logging.INFO, "tb-esmify", {}, f"[INFO] {text}")

    if len(files) == 0:
        return

    remaining = files[0:]

    # There can be too many files for single command line, perform by chunk.
    max_files = 16
    while len(remaining) > max_files:
        info(f"{len(remaining)} files remaining")

        chunk = remaining[0:max_files]
        remaining = remaining[max_files:]

        cmd = [sys.executable, "../mach", "eslint", "--fix"] + chunk
        subprocess.run(cmd, check=True)

    info(f"{len(remaining)} files remaining")
    chunk = remaining
    cmd = [sys.executable, "../mach", "eslint", "--fix"] + chunk
    subprocess.run(cmd, check=True)
