# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import datetime

import jsone
from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import Schema, validate_schema
from taskgraph.util.treeherder import join_symbol, split_symbol
from taskgraph.util.yaml import load_yaml
from voluptuous import Any, Optional, Required

import gecko_taskgraph
from gecko_taskgraph.util.copy_task import copy_task
from gecko_taskgraph.util.templates import merge

transforms = TransformSequence()

TEST_VARIANTS = load_yaml(
    gecko_taskgraph.GECKO, "taskcluster", "ci", "test", "variants.yml"
)
"""List of available test variants defined."""


variant_description_schema = Schema(
    {
        str: {
            Required("description"): str,
            Required("suffix"): str,
            Required("component"): str,
            Required("expiration"): str,
            Optional("when"): {Any("$eval", "$if"): str},
            Optional("replace"): {str: object},
            Optional("merge"): {str: object},
        }
    }
)
"""variant description schema"""


@transforms.add
def split_variants(config, tasks):
    """Splits test definitions into multiple tasks based on the `variants` key.

    If `variants` are defined, the original task will be yielded along with a
    copy of the original task for each variant defined in the list. The copies
    will have the 'unittest_variant' attribute set.
    """
    validate_schema(variant_description_schema, TEST_VARIANTS, "In variants.yml:")

    def find_expired_variants(variants):
        expired = []

        # do not expire on esr/beta/release
        if config.params.get("release_type", "") in [
            "release",
            "beta",
        ]:
            return []

        if "esr" in config.params.get("release_type", ""):
            return []

        today = datetime.datetime.today()
        for variant in variants:

            expiration = variants[variant]["expiration"]
            if len(expiration.split("-")) == 1:
                continue
            expires_at = datetime.datetime.strptime(expiration, "%Y-%m-%d")
            if expires_at < today:
                expired.append(variant)
        return expired

    def remove_expired(variants, expired):
        remaining_variants = []
        for name in variants:
            parts = [p for p in name.split("+") if p not in expired]
            if len(parts) == 0:
                continue

            remaining_variants.append(name)
        return remaining_variants

    def apply_variant(variant, task):
        task["description"] = variant["description"].format(**task)

        suffix = f"-{variant['suffix']}"
        group, symbol = split_symbol(task["treeherder-symbol"])
        if group != "?":
            group += suffix
        else:
            symbol += suffix
        task["treeherder-symbol"] = join_symbol(group, symbol)

        # This will be used to set the label and try-name in 'make_job_description'.
        task.setdefault("variant-suffix", "")
        task["variant-suffix"] += suffix

        # Replace and/or merge the configuration.
        task.update(variant.get("replace", {}))
        return merge(task, variant.get("merge", {}))

    expired_variants = find_expired_variants(TEST_VARIANTS)
    for task in tasks:
        variants = task.pop("variants", [])
        variants = remove_expired(variants, expired_variants)

        if task.pop("run-without-variant"):
            yield copy_task(task)

        for name in variants:
            # Apply composite variants (joined by '+') in order.
            parts = name.split("+")
            taskv = copy_task(task)
            for part in parts:
                variant = TEST_VARIANTS[part]

                # If any variant in a composite fails this check we skip it.
                if "when" in variant:
                    context = {"task": task}
                    if not jsone.render(variant["when"], context):
                        break

                taskv = apply_variant(variant, taskv)
            else:
                taskv["attributes"]["unittest_variant"] = name
                yield taskv
