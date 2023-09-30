/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

var { MigrationTasks } = ChromeUtils.import(
  "resource:///modules/MailMigrator.jsm"
);

window.addEventListener("load", async function () {
  let list = document.getElementById("tasks");
  let itemTemplate = document.getElementById("taskItem");
  let progress = document.querySelector("progress");
  let l10nElements = [];

  for (let task of MigrationTasks.tasks) {
    if (!task.fluentID) {
      continue;
    }

    let item = itemTemplate.content.firstElementChild.cloneNode(true);
    item.classList.add(task.status);

    let name = item.querySelector(".task-name");
    document.l10n.setAttributes(name, task.fluentID);
    l10nElements.push(name);

    if (task.status == "running") {
      if (task.subTasks.length) {
        progress.value = task.subTasks.filter(
          t => t.status == "finished"
        ).length;
        progress.max = task.subTasks.length;
        progress.style.visibility = null;
      } else {
        progress.style.visibility = "hidden";
      }
    }

    list.appendChild(item);

    task.on("status-change", (event, status) => {
      item.classList.remove("pending", "running", "finished");
      item.classList.add(status);

      if (status == "running") {
        // Always hide the progress bar when starting a task. If there are
        // sub-tasks, it will be shown by a progress event.
        progress.style.visibility = "hidden";
      }
    });
    task.on("progress", (event, value, max) => {
      progress.value = value;
      progress.max = max;
      progress.style.visibility = null;
    });
  }

  await document.l10n.translateElements(l10nElements);
  window.sizeToContent();
  window.moveTo(
    (screen.width - window.outerWidth) / 2,
    (screen.height - window.outerHeight) / 2
  );
});
