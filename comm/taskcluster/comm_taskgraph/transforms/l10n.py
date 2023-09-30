# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Do transforms specific to l10n kind
"""

from taskgraph.transforms.base import TransformSequence, ValidateSchema
from taskgraph.util.schema import resolve_keyed_by

from gecko_taskgraph.transforms.l10n import (
    all_locales_attribute,
    chunk_locales,
    copy_in_useful_magic,
    handle_artifact_prefix,
    handle_keyed_by,
    l10n_description_schema,
    make_job_description,
    set_extra_config,
    setup_name,
)


def setup_signing_dependency(config, jobs):
    """Sets up a task dependency to the signing job this relates to"""
    for job in jobs:
        job["dependencies"].update(
            {
                "build": job["dependent-tasks"]["build"].label,
            }
        )

        if job["attributes"]["build_platform"].startswith("win"):
            job["dependencies"].update(
                {
                    "build-signing": job["dependent-tasks"]["build-signing"].label,
                }
            )

        if "shippable" in job["attributes"]["build_platform"]:
            if job["attributes"]["build_platform"].startswith("macosx"):
                job["dependencies"].update(
                    {"repackage": job["dependent-tasks"]["repackage"].label}
                )
            if job["attributes"]["build_platform"].startswith("linux"):
                job["dependencies"].update(
                    {
                        "build-signing": job["dependent-tasks"]["build-signing"].label,
                    }
                )
        yield job


def handle_keyed_by_local(config, jobs):
    """Resolve fields that can be keyed by platform, etc."""
    for job in jobs:
        resolve_keyed_by(
            job,
            "locales-file",
            item_name=job["name"],
            **{"release-type": config.params["release_type"]},
        )
        yield job


transforms = TransformSequence()


for transform_func in (
    setup_name,
    copy_in_useful_magic,
    handle_keyed_by_local,
    ValidateSchema(l10n_description_schema),
    setup_signing_dependency,
    handle_keyed_by,
    handle_artifact_prefix,
    all_locales_attribute,
    chunk_locales,
    ValidateSchema(l10n_description_schema),
    set_extra_config,
    make_job_description,
):
    transforms.add(transform_func)
